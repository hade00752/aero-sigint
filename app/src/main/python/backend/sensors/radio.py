"""
backend/sensors/radio.py
Phase 1 — RF Jamming detection via C/N₀ and AGC monitoring.

Source priority (graceful degradation):
  1. termux-location --provider gps  (Android + termux-api installed)
  2. /proc/net/wireless               (Linux kernel, WSL2 included)
  3. dumpsys wifi                     (Android without termux-api)
  4. Synthetic baseline noise         (always available as last resort)
"""

import math
import os
import re
import subprocess
import time
from typing import Optional

import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))
import config


class RadioSensor:
    """
    Returns (cn0_dBHz, agc_proxy) and a jam_score (0–100).
    Builds a rolling baseline over the first N samples; anomalies
    are scored relative to that baseline.
    """

    def __init__(self):
        self._baseline_samples: list[float] = []
        self._cn0_baseline: Optional[float] = None
        self._agc_baseline: Optional[float] = None
        self._has_termux = False  # gps_poller handles GPS; radio uses /proc/net/wireless

    # ── Capability detection ──────────────────────────────────────
    @staticmethod
    def _detect_termux() -> bool:
        try:
            r = subprocess.run(
                ["which", "termux-location"],
                capture_output=True, timeout=2
            )
            return r.returncode == 0
        except Exception:
            return False

    # ── Source 1: termux-location (Android) ──────────────────────
    def _read_termux(self) -> tuple[Optional[float], Optional[float]]:
        try:
            import json
            r = subprocess.run(
                ["termux-location", "--provider", "gps", "--request", "once"],
                capture_output=True, text=True, timeout=10
            )
            data = json.loads(r.stdout)
            sats = data.get("satellites", [])
            used = [s.get("cn0DbHz", 0) for s in sats if s.get("used")]
            if used:
                avg_cn0 = sum(used) / len(used)
                agc_proxy = avg_cn0 - 5.0
                return avg_cn0, agc_proxy
            # Accuracy-based fallback
            acc = data.get("accuracy")
            if acc:
                cn0 = max(10.0, 50.0 - acc * 0.5)
                return cn0, cn0 - 5.0
        except Exception:
            pass
        return None, None

    # ── Source 2: /proc/net/wireless (Linux/WSL2) ─────────────────
    @staticmethod
    def _read_proc_wireless() -> tuple[Optional[float], Optional[float]]:
        try:
            with open("/proc/net/wireless", "r") as f:
                lines = f.readlines()
            for line in lines[2:]:
                parts = line.split()
                if len(parts) >= 5:
                    link  = float(parts[2].rstrip("."))
                    level = float(parts[3].rstrip("."))
                    noise = float(parts[4].rstrip("."))
                    snr = link if link > 0 else (level - noise)
                    return snr, noise
        except Exception:
            pass
        return None, None

    # ── Source 3: dumpsys wifi (Android, no termux-api) ───────────
    @staticmethod
    def _read_dumpsys() -> tuple[Optional[float], Optional[float]]:
        try:
            r = subprocess.run(
                ["dumpsys", "wifi"],
                capture_output=True, text=True, timeout=5
            )
            rssi_m  = re.search(r"mRssi=(-?\d+)", r.stdout)
            noise_m = re.search(r"mNoise=(-?\d+)", r.stdout)
            if rssi_m:
                rssi  = int(rssi_m.group(1))
                noise = int(noise_m.group(1)) if noise_m else -95
                return float(rssi - noise), float(noise)
        except Exception:
            pass
        return None, None

    # ── Source 4: synthetic (always works) ────────────────────────
    @staticmethod
    def _synthetic() -> tuple[float, float]:
        t = time.time()
        base = 38.0 + 4.0 * math.sin(t / 120)
        jitter = ((int(t * 10) * 2654435761) & 0xFFFFFFFF) / 0xFFFFFFFF * 4 - 2
        cn0 = base + jitter
        return cn0, cn0 - 5.0

    # ── Public read ───────────────────────────────────────────────
    def read(self) -> tuple[float, Optional[float]]:
        """Returns (cn0, agc).  cn0 is always a float."""
        cn0, agc = None, None

        if config.IS_ANDROID and self._has_termux:
            cn0, agc = self._read_termux()

        if cn0 is None:
            cn0, agc = self._read_proc_wireless()

        if cn0 is None and config.IS_ANDROID:
            cn0, agc = self._read_dumpsys()

        if cn0 is None:
            cn0, agc = self._synthetic()

        # Build baseline
        if self._cn0_baseline is None:
            self._baseline_samples.append(cn0)
            if len(self._baseline_samples) >= config.CN0_BASELINE_SAMPLES:
                self._cn0_baseline = sum(self._baseline_samples) / len(self._baseline_samples)
                self._agc_baseline = agc if agc is not None else self._cn0_baseline - 5

        return cn0, agc

    def jam_score(self, cn0: float, agc: Optional[float]) -> int:
        """0–100.  Needs baseline established (returns 0 until then)."""
        if self._cn0_baseline is None:
            return 0
        score = 0
        cn0_drop = self._cn0_baseline - cn0
        if cn0_drop > config.CN0_DROP_THRESHOLD:
            score += min(60, int(cn0_drop * 5))
        if agc is not None and self._agc_baseline is not None:
            agc_drop = self._agc_baseline - agc
            if agc_drop > config.AGC_DROP_THRESHOLD:
                score += min(40, int(agc_drop * 3))
        return min(100, score)
