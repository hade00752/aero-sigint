"""
backend/sensors/time_integrity.py
Phase 2 — GPS Spoofing detection.

Indicators:
  A) |GNSS_timestamp - NTP_time| > threshold  →  time-warp attack
  B) Haversine distance jump between consecutive fixes > threshold → teleport

NTP is queried directly via SNTP (RFC 4330) with no extra libraries.
Falls back gracefully to system clock on WSL where NTP port may be blocked.
"""

import math
import os
import socket
import struct
import time
from typing import Optional

import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))
import config


# ── SNTP constants ─────────────────────────────────────────────────
_NTP_SERVERS = ["pool.ntp.org", "time.cloudflare.com", "time.google.com"]
_ntp_cache = {"ts": None, "updated": 0.0}
_ntp_lock = __import__('threading').Lock()

def _refresh_ntp_async():
    import threading
    def _worker():
        result = _query_ntp_raw()
        with _ntp_lock:
            _ntp_cache["ts"] = result
            _ntp_cache["updated"] = __import__('time').time()
    threading.Thread(target=_worker, daemon=True).start()

def _get_ntp_cached():
    import time
    with _ntp_lock:
        age = time.time() - _ntp_cache["updated"]
        ts = _ntp_cache["ts"]
    # Refresh in background every 30s but never block
    if age > 30:
        _refresh_ntp_async()
    return ts
_NTP_PORT    = 123
_NTP_EPOCH   = 2208988800   # seconds between 1900-01-01 and 1970-01-01
_NTP_PACKET  = b'\x1b' + 47 * b'\0'


def _query_ntp_raw(timeout: float = 0.5) -> Optional[float]:
    """
    Returns Unix timestamp from NTP or None on failure.
    Tries multiple servers before giving up.
    """
    for server in _NTP_SERVERS:
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            sock.settimeout(timeout)
            sock.sendto(_NTP_PACKET, (server, _NTP_PORT))
            data, _ = sock.recvfrom(1024)
            sock.close()
            if len(data) >= 48:
                ts = struct.unpack("!12I", data)[10]
                return float(ts - _NTP_EPOCH)
        except Exception:
            pass
    return None


class TimeIntegrity:
    """
    Compares GNSS-derived time with NTP time, and detects coordinate teleportation.
    """

    def __init__(self):
        self._last_coord: Optional[tuple[float, float]] = None
        self._last_fix_time: Optional[float] = None

    # ── GNSS fix (browser Geolocation via gps_poller) ─────────────
    @staticmethod
    def _gnss_fix() -> tuple[Optional[float], Optional[float], Optional[float]]:
        """
        Reads from the shared GPS fix file written by gps_poller.py.
        The browser sends window.navigator.geolocation fixes to a local
        WebSocket on port 9001. No Termux:API required.
        """
        try:
            from backend.sensors.gps_poller import read_fix
            fix = read_fix()
            if fix is None:
                return None, None, None
            lat = fix.get("lat") or fix.get("latitude")
            lon = fix.get("lon") or fix.get("longitude")
            ts  = fix.get("ts", time.time())
            if lat is None or lon is None:
                return None, None, None
            return float(ts), float(lat), float(lon)
        except Exception:
            return None, None, None

    # ── Haversine ─────────────────────────────────────────────────
    @staticmethod
    def _haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Distance in metres."""
        R = 6_371_000.0
        ph1, ph2 = math.radians(lat1), math.radians(lat2)
        dph = math.radians(lat2 - lat1)
        dlm = math.radians(lon2 - lon1)
        a = math.sin(dph / 2) ** 2 + math.cos(ph1) * math.cos(ph2) * math.sin(dlm / 2) ** 2
        return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    # ── Public check ──────────────────────────────────────────────
    def check(self) -> dict:
        """
        Returns:
          time_delta_s   – |GNSS_ts - NTP_ts|
          coord_jump_m   – metres jumped since last fix
          spoof_score    – 0–100
        """
        now = time.time()

        # NTP reference
        ntp_ts = _get_ntp_cached()
        ref_ts = ntp_ts if ntp_ts is not None else now

        # GNSS fix (Android only; skipped on WSL)
        gnss_ts, lat, lon = None, None, None
        if config.IS_ANDROID:
            gnss_ts, lat, lon = self._gnss_fix()

        time_delta = abs(gnss_ts - ref_ts) if gnss_ts is not None else 0.0

        # Teleportation check
        coord_jump = 0.0
        if lat is not None and lon is not None and self._last_coord is not None:
            elapsed = now - (self._last_fix_time or now)
            if elapsed < config.POLL_INTERVAL * 3:
                coord_jump = self._haversine(
                    self._last_coord[0], self._last_coord[1], lat, lon
                )

        if lat is not None and lon is not None:
            self._last_coord = (lat, lon)
            self._last_fix_time = now

        # Score
        score = 0
        if time_delta > config.TIME_DELTA_THRESHOLD:
            score += min(70, int(time_delta * 30))
        if coord_jump > config.TELEPORT_THRESHOLD_M:
            score += min(30, int(coord_jump / 100))

        return {
            "time_delta_s":  round(time_delta, 3),
            "coord_jump_m":  round(coord_jump, 1),
            "spoof_score":   min(100, score),
        }
