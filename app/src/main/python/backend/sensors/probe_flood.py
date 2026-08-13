"""
backend/sensors/probe_flood.py
Phase 3 — Surveillance / Drone probe-flood detection.

Source priority:
  1. iw dev wlan0 scan dump  (passive, no root on many kernels — Android + Linux)
  2. /proc/net/arp            (unique neighbours — passive, no root, everywhere)
  3. Returns zero             (safe no-op when neither is available)

Note: Android 10+ blocks raw probe-request capture without root.
The arp fallback is a weaker signal (seen neighbours vs. probe requests)
but still catches high-density RF environments.  A rooted device or a
dedicated Raspberry Pi running the full stack has access to source 1.
"""

import os
import re
import time
from typing import Optional

import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))
import config


# OUI prefix → vendor name for annotation (top entries only)
_OUI_VENDORS: dict[str, str] = {
    "00:50:f2": "Microsoft",
    "00:0c:e7": "Atheros",
    "dc:a6:32": "Raspberry Pi",
    "b8:27:eb": "Raspberry Pi",
    "e4:5f:01": "Raspberry Pi",
    "00:e0:4c": "Realtek",
}


def _mac_vendor(mac: str) -> str:
    prefix = mac[:8].lower()
    return _OUI_VENDORS.get(prefix, "Unknown")


class ProbeFloodSensor:
    """
    Maintains a 60-second sliding window of unique observed MACs.
    probe_score spikes when unique-MACs-per-minute exceeds threshold.
    """

    def __init__(self):
        self._window: list[tuple[float, str]] = []
        self._iface = os.getenv("SIGINT_WIFI_IFACE", "wlan0")
        # Infrastructure baseline — MACs seen in the first 60 s are considered
        # local APs / known devices and excluded from scoring. Without this,
        # dense urban environments (shopping centres, airports) exceed the burst
        # threshold from ambient APs alone and produce constant false alarms.
        self._baseline_macs: set[str] = set()
        self._baseline_done = False
        self._baseline_end  = time.time() + 60.0
        print("[Probe] Collecting infrastructure baseline for 60 s…")

    # ── Source 1: iw scan dump ────────────────────────────────────
    def _iw_macs(self) -> set[str]:
        macs: set[str] = set()
        try:
            import subprocess
            r = subprocess.run(
                ["iw", "dev", self._iface, "scan", "dump"],
                capture_output=True, text=True, timeout=5
            )
            for line in r.stdout.splitlines():
                m = re.search(r"([0-9a-f]{2}(?::[0-9a-f]{2}){5})", line, re.I)
                if m:
                    macs.add(m.group(1).lower())
        except Exception:
            pass
        return macs

    # ── Source 2: /proc/net/arp ───────────────────────────────────
    @staticmethod
    def _arp_macs() -> set[str]:
        macs: set[str] = set()
        try:
            with open("/proc/net/arp", "r") as f:
                for line in f.readlines()[1:]:
                    parts = line.split()
                    if len(parts) >= 4:
                        mac = parts[3].lower()
                        if mac not in ("00:00:00:00:00:00", ""):
                            macs.add(mac)
        except Exception:
            pass
        return macs

    # ── Public sample ─────────────────────────────────────────────
    def sample(self) -> dict:
        """
        Returns:
          unique_per_min  – unique MACs seen in last 60 s
          probe_score     – 0–100
          unknown_ratio   – fraction from unrecognised OUIs
        """
        now = time.time()

        macs = self._iw_macs()
        if not macs:
            macs = self._arp_macs()

        if not self._baseline_done:
            self._baseline_macs.update(macs)
            if now >= self._baseline_end:
                self._baseline_done = True
                print(f"[Probe] Baseline complete — {len(self._baseline_macs)} infrastructure MACs registered")

        new_macs = macs - self._baseline_macs
        for mac in new_macs:
            self._window.append((now, mac))

        # Prune window
        self._window = [(t, m) for t, m in self._window if now - t <= 60]

        unique_macs  = {m for _, m in self._window}
        unique_count = len(unique_macs)
        unknown_count = sum(1 for m in unique_macs if _mac_vendor(m) == "Unknown")
        unknown_ratio = unknown_count / unique_count if unique_count else 0.0

        score = 0
        if unique_count > config.PROBE_BURST_THRESHOLD:
            excess = unique_count - config.PROBE_BURST_THRESHOLD
            # Unknown vendors weigh double — known devices less suspicious
            weighted = excess * (1.0 + unknown_ratio)
            score = min(100, int(weighted * 2))

        return {
            "unique_per_min": unique_count,
            "probe_score":    score,
            "unknown_ratio":  round(unknown_ratio, 2),
        }
