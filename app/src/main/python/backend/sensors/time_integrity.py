"""
backend/sensors/time_integrity.py
Phase 2 — GPS Spoofing detection.

Indicators:
  A) |GNSS_timestamp - NTP_time| > threshold  →  time-warp attack
  B) Haversine distance jump between consecutive fixes > threshold → teleport

NTP is queried directly via SNTP (RFC 4330) with no extra libraries.
Falls back gracefully to system clock on WSL where NTP port may be blocked.
"""

import json
import math
import os
import socket
import struct
import time
from typing import Optional

import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))
import config

_COORD_BASELINE_FILE = '/data/data/com.aero.batteryhealth/files/last_coord.json'


# ── SNTP constants ─────────────────────────────────────────────────
_NTP_SERVERS = ["pool.ntp.org", "time.cloudflare.com", "time.google.com"]
# Store the clock offset (NTP_time - local_time) rather than a static timestamp.
# A static cached timestamp grows stale every second; the offset stays valid for minutes.
_ntp_cache = {"offset": None, "updated": 0.0}
_ntp_lock = __import__('threading').Lock()

def _refresh_ntp_async():
    import threading, time as _time
    def _worker():
        before = _time.time()
        result = _query_ntp_raw()
        after = _time.time()
        if result is not None:
            local_mid = (before + after) / 2
            offset = result - local_mid
            with _ntp_lock:
                _ntp_cache["offset"] = offset
                _ntp_cache["updated"] = _time.time()
    threading.Thread(target=_worker, daemon=True).start()

def _get_ntp_cached():
    import time as _time
    now = _time.time()
    with _ntp_lock:
        age = now - _ntp_cache["updated"]
        offset = _ntp_cache["offset"]
    if age > 300:  # refresh every 5 minutes
        _refresh_ntp_async()
    if offset is None:
        return None
    return now + offset  # estimated current NTP time
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
        self._last_coord: Optional[tuple[float, float]] = self._load_baseline()
        self._last_fix_time: Optional[float] = None
        self._pos_history: list[tuple[float, float]] = []
        self._last_accuracy: float = 999.0

    def _load_baseline(self) -> Optional[tuple[float, float]]:
        try:
            d = json.loads(open(_COORD_BASELINE_FILE).read())
            return (float(d['lat']), float(d['lon']))
        except Exception:
            return None

    def _save_baseline(self, lat: float, lon: float):
        try:
            with open(_COORD_BASELINE_FILE, 'w') as f:
                json.dump({'lat': lat, 'lon': lon, 'ts': time.time()}, f)
        except Exception:
            pass

    # ── GNSS fix (browser Geolocation via gps_poller) ─────────────
    @staticmethod
    def _gnss_fix() -> tuple[Optional[float], Optional[float], Optional[float], float]:
        """Returns (gnss_ts, lat, lon, accuracy_m). accuracy_m=999 when unknown."""
        try:
            from backend.sensors.gps_poller import read_fix
            fix = read_fix()
            if fix is None:
                return None, None, None, 999.0
            lat = fix.get("lat") or fix.get("latitude")
            lon = fix.get("lon") or fix.get("longitude")
            if lat is None or lon is None:
                return None, None, None, 999.0
            gnss_ts = fix.get("gnss_ts")
            accuracy = float(fix.get("accuracy") or 999.0)
            return (float(gnss_ts) if gnss_ts is not None else None), float(lat), float(lon), accuracy
        except Exception:
            return None, None, None, 999.0

    def _position_variance_m2(self) -> float:
        """Variance of position history in m². Real GPS: >1m². Mock GPS: ~0."""
        n = len(self._pos_history)
        if n < 6:
            return 999.0
        mean_lat = sum(h[0] for h in self._pos_history) / n
        mean_lon = sum(h[1] for h in self._pos_history) / n
        v = sum((h[0] - mean_lat) ** 2 + (h[1] - mean_lon) ** 2 for h in self._pos_history) / n
        return v * (111_000.0 ** 2)

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

        # NTP from cache — never blocks
        ntp_ref = _get_ntp_cached()

        # GNSS fix (Android only; skipped on WSL)
        gnss_ts, lat, lon, accuracy = None, None, None, 999.0
        if config.IS_ANDROID:
            gnss_ts, lat, lon, accuracy = self._gnss_fix()
            self._last_accuracy = accuracy

        # Only compute time_delta when both a real GNSS timestamp and a
        # populated NTP cache are available. Skipping either prevents:
        #   - Cold-start false alarms (NTP not yet resolved)
        #   - Spurious deltas from missing gnss_ts in older dashboard builds
        if gnss_ts is not None and ntp_ref is not None:
            time_delta = abs(gnss_ts - ntp_ref)
        else:
            time_delta = 0.0

        # Teleportation check.
        # Compares against persisted baseline so jumps are detected even
        # when mock GPS is already active on startup (bug: first fix would
        # set last_coord to the fake position and subsequent fixes show no jump).
        coord_jump = 0.0
        if lat is not None and lon is not None and self._last_coord is not None:
            coord_jump = self._haversine(
                self._last_coord[0], self._last_coord[1], lat, lon
            )

        if lat is not None and lon is not None:
            # Track position history for variance analysis
            self._pos_history.append((lat, lon))
            if len(self._pos_history) > 12:
                self._pos_history.pop(0)

            # Only update baseline for small, plausible movements (<5km).
            # A large jump means spoofing — don't let it overwrite the real baseline.
            if self._last_coord is None or coord_jump < 5_000:
                self._last_coord = (lat, lon)
                self._last_fix_time = now
                self._save_baseline(lat, lon)

        # Score
        score = 0

        # Coordinate teleportation — most reliable spoof indicator
        if coord_jump > config.TELEPORT_THRESHOLD_M:
            # Scale: 1km=2, 5km=10, 25km=50 (CRITICAL), 50km+=70 (max).
            score += min(70, int(coord_jump / 500))

        # Zero-variance detection: real GPS always drifts ±2-15m even stationary.
        # Mock location apps report exactly the same coordinates every time → variance ≈ 0.
        # Gated on accuracy < 50m so WiFi/cell network fallback (stable but coarse)
        # doesn't false-positive — network fixes report accuracy 50-200m.
        variance_m2 = self._position_variance_m2()
        if variance_m2 < 1.0 and len(self._pos_history) >= 6 and self._last_accuracy < 50.0:
            score += 55

        # time_delta is computed for display only — not scored.
        # GPS chip epoch vs NTP can legitimately differ by 1-5s due to signal
        # processing delays, and mock GPS apps use current system time anyway.

        return {
            "time_delta_s":  round(time_delta, 3),
            "coord_jump_m":  round(coord_jump, 1),
            "spoof_score":   min(100, score),
        }
