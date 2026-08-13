"""
backend/sensors/radio.py
Phase 1 — RF Jamming detection via C/N₀ monitoring.

Source priority (Android / Chaquopy):
  1. termux-location --provider gps   (background thread, cached — Termux only)
  2. dumpsys wifi                      (fallback WiFi SNR — weaker signal)
  3. Synthetic baseline noise          (last resort)

AGC note: Android exposes no real AGC without root. The constant-offset
proxy (agc = cn0 - 5) added zero independent signal and has been removed.
agc is returned as None; jam_score() ignores it on Android.

Baseline:
  - Android: 8 samples (≈16 s at default 2 s poll rate) — fast warm-up
  - Persisted to baseline.json so restarts don't require re-establishment.
"""

import json
import math
import os
import re
import subprocess
import threading
import time
from typing import Optional

import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))
import config

_BASELINE_FILE = os.path.join(os.path.dirname(__file__), '..', '..', 'baseline.json')
_ANDROID_BASELINE_SAMPLES = 8


class RadioSensor:
    """
    Returns (cn0, agc) and a jam_score (0–100).
    Builds a rolling baseline; anomalies are scored relative to that baseline.
    """

    def __init__(self):
        self._baseline_samples: list[float] = []
        self._cn0_baseline: Optional[float] = None

        self._cached_cn0: Optional[float] = None
        self._cache_lock = threading.Lock()
        self._cache_time: float = 0.0

        # termux-location is only available in Termux, not a Chaquopy APK.
        # Detection runs anyway — it just returns False in the APK context.
        self._has_termux = self._detect_termux() if config.IS_ANDROID else False
        if self._has_termux:
            t = threading.Thread(target=self._termux_loop, daemon=True)
            t.start()
            print("[Radio] termux-location found — GNSS C/N₀ background poller started")

        self._load_baseline()

    @staticmethod
    def _detect_termux() -> bool:
        try:
            r = subprocess.run(["which", "termux-location"],
                               capture_output=True, timeout=2)
            return r.returncode == 0
        except Exception:
            return False

    def _termux_loop(self):
        while True:
            cn0 = self._read_termux_blocking()
            if cn0 is not None:
                with self._cache_lock:
                    self._cached_cn0 = cn0
                    self._cache_time = time.time()
            time.sleep(10)

    def _read_termux_blocking(self) -> Optional[float]:
        try:
            r = subprocess.run(
                ["termux-location", "--provider", "gps", "--request", "once"],
                capture_output=True, text=True, timeout=15
            )
            data = json.loads(r.stdout)
            sats = data.get("satellites", [])
            used = [s.get("cn0DbHz", 0) for s in sats if s.get("used") and s.get("cn0DbHz")]
            if used:
                return sum(used) / len(used)
            acc = data.get("accuracy")
            if acc and acc > 0:
                return max(10.0, 50.0 - acc * 0.5)
        except Exception:
            pass
        return None

    @staticmethod
    def _read_dumpsys() -> Optional[float]:
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
                return float(rssi - noise)
        except Exception:
            pass
        return None

    @staticmethod
    def _synthetic() -> float:
        t = time.time()
        base   = 38.0 + 4.0 * math.sin(t / 120)
        jitter = ((int(t * 10) * 2654435761) & 0xFFFFFFFF) / 0xFFFFFFFF * 4 - 2
        return base + jitter

    def _load_baseline(self):
        try:
            with open(_BASELINE_FILE) as f:
                data = json.load(f)
            self._cn0_baseline = float(data["cn0_baseline"])
            print(f"[Radio] Loaded persisted baseline: {self._cn0_baseline:.1f} dBHz")
        except Exception:
            pass

    def _save_baseline(self):
        try:
            tmp = _BASELINE_FILE + ".tmp"
            with open(tmp, "w") as f:
                json.dump({"cn0_baseline": self._cn0_baseline}, f)
            os.replace(tmp, _BASELINE_FILE)
        except Exception:
            pass

    def read(self) -> tuple[float, None]:
        """Returns (cn0, None). agc is always None — no real AGC on Android."""
        cn0 = None

        if config.IS_ANDROID:
            with self._cache_lock:
                if self._cached_cn0 is not None and (time.time() - self._cache_time) < 30:
                    cn0 = self._cached_cn0
            if cn0 is None:
                cn0 = self._read_dumpsys()

        if cn0 is None:
            cn0 = self._synthetic()

        if self._cn0_baseline is None:
            self._baseline_samples.append(cn0)
            n = _ANDROID_BASELINE_SAMPLES if config.IS_ANDROID else config.CN0_BASELINE_SAMPLES
            if len(self._baseline_samples) >= n:
                self._cn0_baseline = sum(self._baseline_samples) / len(self._baseline_samples)
                print(f"[Radio] Baseline established: {self._cn0_baseline:.1f} dBHz")
                self._save_baseline()

        return cn0, None

    def jam_score(self, cn0: float, agc: Optional[float]) -> int:
        """0–100. agc branch only fires when real AGC is provided (Pi UBX path)."""
        if self._cn0_baseline is None:
            return 0
        score = 0
        cn0_drop = self._cn0_baseline - cn0
        if cn0_drop > config.CN0_DROP_THRESHOLD:
            score += min(60, int(cn0_drop * 5))
        # agc is None on Android — this branch never fires here
        if agc is not None:
            agc_drop = (self._cn0_baseline - 5) - agc
            if agc_drop > config.AGC_DROP_THRESHOLD:
                score += min(40, int(agc_drop * 3))
        return min(100, score)
