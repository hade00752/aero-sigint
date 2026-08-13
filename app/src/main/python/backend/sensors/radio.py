"""
backend/sensors/radio.py
Phase 1 — RF Jamming detection via C/N₀ monitoring.

Source priority (Android / Chaquopy):
  1. gnss_cn0.txt   — written by SigintService via GnssMeasurementsEvent.Callback
                       Real chipset C/N₀, no root, no Termux, any Android 7+ device.
  2. termux-location — background thread, cached (Termux only, harmless no-op in APK)
  3. dumpsys wifi    — WiFi SNR proxy (responds to 2.4 GHz jamming, not GPS-band)
  4. Synthetic       — last resort during cold start

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

# Written by SigintService.startGnssMeasurements() via GnssMeasurementsEvent.Callback.
# Updated on every satellite measurement event (typically every second).
_GNSS_CN0_FILE    = "/data/data/com.aero.batteryhealth/files/gnss_cn0.txt"
_GNSS_CN0_MAX_AGE = 10.0  # seconds — stale if Kotlin side has stopped writing

_SAT_COUNT_FILE    = "/data/data/com.aero.batteryhealth/files/satellite_count.txt"
_SAT_COUNT_MAX_AGE = 10.0  # seconds

# Clear-sky default baseline — used when no persisted baseline exists.
# Prevents the fatal first-run calibration-to-jammed-environment bug:
# if the app is opened for the first time in a jammed zone, runtime sample
# accumulation would learn the jammed level as "normal" and miss the event.
_CLEAR_SKY_DEFAULT_CN0 = 38.0  # dBHz — typical locked-sky Android chipset value


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
        self._prev_cn0: Optional[float] = None  # for sudden-onset detection

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
    def _read_gnss_cn0_file() -> Optional[float]:
        """Read chipset C/N₀ written by Kotlin GnssMeasurementsEvent callback.
        Returns None if the file is missing or stale (Kotlin side not running)."""
        try:
            age = time.time() - os.stat(_GNSS_CN0_FILE).st_mtime
            if age > _GNSS_CN0_MAX_AGE:
                return None
            return float(open(_GNSS_CN0_FILE).read().strip())
        except Exception:
            return None

    @staticmethod
    def _read_satellite_count() -> Optional[int]:
        """Read locked-satellite count written by Kotlin alongside gnss_cn0.txt.
        Zero means complete lock loss — the most definitive jamming signature."""
        try:
            age = time.time() - os.stat(_SAT_COUNT_FILE).st_mtime
            if age > _SAT_COUNT_MAX_AGE:
                return None
            return int(open(_SAT_COUNT_FILE).read().strip())
        except Exception:
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
            # No persisted file — use clear-sky default immediately rather than
            # accumulating runtime samples. Accumulating from runtime is dangerous:
            # if the app first runs inside a jammed environment, it calibrates to
            # the jammed level as "normal" and becomes blind to the event.
            self._cn0_baseline = _CLEAR_SKY_DEFAULT_CN0
            print(f"[Radio] No persisted baseline — using clear-sky default {_CLEAR_SKY_DEFAULT_CN0} dBHz")

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
            # Priority 1: real chipset C/N₀ via Kotlin GnssMeasurementsEvent
            cn0 = self._read_gnss_cn0_file()
            # Priority 2: termux-location (Termux only, harmless no-op in Chaquopy)
            if cn0 is None:
                with self._cache_lock:
                    if self._cached_cn0 is not None and (time.time() - self._cache_time) < 30:
                        cn0 = self._cached_cn0
            # Priority 3: WiFi SNR proxy (2.4 GHz correlation, not GPS-band)
            if cn0 is None:
                cn0 = self._read_dumpsys()

        if cn0 is None:
            cn0 = self._synthetic()

        # Refine baseline from healthy readings. Samples below 25 dBHz are likely
        # jammed and must never corrupt the baseline — only clear-sky values count.
        if cn0 > 25.0:
            self._baseline_samples.append(cn0)
            n = _ANDROID_BASELINE_SAMPLES if config.IS_ANDROID else config.CN0_BASELINE_SAMPLES
            if len(self._baseline_samples) >= n:
                self._cn0_baseline = sum(self._baseline_samples) / len(self._baseline_samples)
                self._baseline_samples = []  # reset for next refinement cycle
                print(f"[Radio] Baseline refined: {self._cn0_baseline:.1f} dBHz")
                self._save_baseline()

        return cn0, None

    def jam_score(self, cn0: float, agc: Optional[float]) -> int:
        """0–100. agc branch only fires when real AGC is provided (Pi UBX path)."""
        # Zero locked satellites = complete GNSS lock loss. This is the most
        # definitive jamming signature — no threshold comparison needed.
        sat = self._read_satellite_count()
        if sat is not None and sat == 0:
            self._prev_cn0 = cn0
            return 100

        if self._cn0_baseline is None:
            return 0
        score = 0
        cn0_drop = self._cn0_baseline - cn0
        if cn0_drop > config.CN0_DROP_THRESHOLD:
            score += min(60, int(cn0_drop * 5))

        # Sudden-onset bonus: a jammer fires and C/N₀ collapses within one 2s
        # poll. Gradual degradation (building, valley) drops slowly over many
        # readings. A single-reading drop >15 dBHz is a strong jammer signature.
        if self._prev_cn0 is not None:
            onset = self._prev_cn0 - cn0
            if onset > 15.0:
                score = min(100, score + int(onset * 2))
        self._prev_cn0 = cn0

        # agc is None on Android — this branch never fires here
        if agc is not None:
            agc_drop = (self._cn0_baseline - 5) - agc
            if agc_drop > config.AGC_DROP_THRESHOLD:
                score += min(40, int(agc_drop * 3))
        return min(100, score)
