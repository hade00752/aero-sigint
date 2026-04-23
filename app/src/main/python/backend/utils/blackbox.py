"""
backend/utils/blackbox.py
Black Box logging + Pattern Recognition.
Writes timestamped CSV for every DISTURBED or CRITICAL event.
"""

import csv
import os
import threading
import time
from datetime import datetime, timezone, timedelta
from typing import Optional


def _get_log_dir():
    # In Chaquopy APK, use Android filesDir
    android_files = '/data/data/com.aero.batteryhealth/files'
    if os.path.exists(android_files):
        log_dir = os.path.join(android_files, 'logs')
    else:
        # WSL / Termux fallback
        log_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'logs')
    os.makedirs(log_dir, exist_ok=True)
    return log_dir


LOG_DIR = _get_log_dir()

CSV_FIELDS = [
    "timestamp_utc", "status",
    "jam_score", "spoof_score", "probe_score",
    "emf_confidence", "emf_source", "magnitude_ut",
    "cn0", "time_delta", "coord_jump_m", "probe_count",
    "alerts"
]


class BlackBox:
    def __init__(self, log_dir: str = None):
        self._log_dir = log_dir or _get_log_dir()
        os.makedirs(self._log_dir, exist_ok=True)
        self._lock = threading.Lock()
        self._last_status: Optional[str] = None
        self._last_log_time: float = 0.0

    def _csv_path(self, dt: datetime) -> str:
        return os.path.join(self._log_dir, f"events_{dt.strftime('%Y-%m-%d')}.csv")

    def _ensure_header(self, path: str):
        if not os.path.exists(path):
            with open(path, "w", newline="") as f:
                csv.DictWriter(f, fieldnames=CSV_FIELDS).writeheader()

    def log(self, reading_dict: dict):
        status = reading_dict.get("status", "CLEAR")
        if status == "CLEAR":
            self._last_status = status
            return

        now = time.time()
        with self._lock:
            same_state = (status == self._last_status)
            too_soon = (now - self._last_log_time) < 30.0
            if same_state and too_soon:
                return
            self._last_status = status
            self._last_log_time = now

        dt = datetime.now(timezone.utc)
        path = self._csv_path(dt)
        self._ensure_header(path)

        row = {
            "timestamp_utc": dt.isoformat(),
            "status": status,
            "jam_score": reading_dict.get("jam_score", 0),
            "spoof_score": reading_dict.get("spoof_score", 0),
            "probe_score": reading_dict.get("probe_score", 0),
            "emf_confidence": reading_dict.get("emf_confidence", 0),
            "emf_source": reading_dict.get("emf_source", "NONE"),
            "magnitude_ut": reading_dict.get("magnitude_ut", ""),
            "cn0": reading_dict.get("cn0", ""),
            "time_delta": reading_dict.get("time_delta", 0),
            "coord_jump_m": reading_dict.get("coord_jump_m", 0),
            "probe_count": reading_dict.get("probe_count", 0),
            "alerts": " | ".join(reading_dict.get("alerts", [])),
        }

        with self._lock:
            try:
                with open(path, "a", newline="") as f:
                    csv.DictWriter(f, fieldnames=CSV_FIELDS).writerow(row)
                print(f"[BlackBox] Logged {status} event to {path}")
            except Exception as e:
                print(f"[BlackBox] Write error: {e}")

    def get_last_24h(self) -> list:
        cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
        events = []
        for dt in [cutoff, datetime.now(timezone.utc)]:
            path = self._csv_path(dt)
            if not os.path.exists(path):
                continue
            try:
                with open(path, "r", newline="") as f:
                    for row in csv.DictReader(f):
                        try:
                            ts = datetime.fromisoformat(row["timestamp_utc"])
                            if ts >= cutoff:
                                events.append(row)
                        except Exception:
                            pass
            except Exception:
                pass
        seen = set()
        unique = []
        for e in sorted(events, key=lambda r: r["timestamp_utc"]):
            key = e["timestamp_utc"]
            if key not in seen:
                seen.add(key)
                unique.append(e)
        return unique

    def get_hourly_heatmap(self) -> list:
        events = self.get_last_24h()
        buckets = [{"hour": h, "count": 0, "max_status": "CLEAR"} for h in range(24)]
        STATUS_RANK = {"CLEAR": 0, "DISTURBED": 1, "CRITICAL": 2}
        for e in events:
            try:
                ts = datetime.fromisoformat(e["timestamp_utc"])
                h = ts.hour
                buckets[h]["count"] += 1
                if STATUS_RANK.get(e["status"], 0) > STATUS_RANK.get(buckets[h]["max_status"], 0):
                    buckets[h]["max_status"] = e["status"]
            except Exception:
                pass
        return buckets

    def get_stats(self) -> dict:
        events = self.get_last_24h()
        return {
            "total_24h": len(events),
            "critical_24h": sum(1 for e in events if e.get("status") == "CRITICAL"),
            "disturbed_24h": sum(1 for e in events if e.get("status") == "DISTURBED"),
        }
