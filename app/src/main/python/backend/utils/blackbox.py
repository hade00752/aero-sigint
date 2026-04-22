"""
backend/utils/blackbox.py
Milestone 02 — Black Box logging + Pattern Recognition.

Writes a timestamped CSV for every DISTURBED or CRITICAL event.
One file per day: logs/events_YYYY-MM-DD.csv

Also exposes:
  - get_last_24h()  → list of event dicts for playback UI
  - get_hourly_heatmap()  → 24-bucket array of event counts for "Rhythm of War"
"""

import csv
import os
import threading
import time
from datetime import datetime, timezone, timedelta
from typing import Optional

def _get_log_dir():
    # Allow override via module attribute for testing
    import backend.utils.blackbox as _self
    override = getattr(_self, 'LOG_DIR', None)
    if override and override != os.path.join(os.path.dirname(__file__), '..', '..', 'logs'):
        return override
    return os.path.join(os.path.dirname(__file__), '..', '..', 'logs')

LOG_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'logs')
CSV_FIELDS = [
    "timestamp_utc", "status",
    "jam_score", "spoof_score", "probe_score",
    "emf_confidence", "emf_source", "magnitude_ut",
    "cn0", "time_delta", "coord_jump_m", "probe_count",
    "alerts"
]


class BlackBox:
    """
    Thread-safe event logger.
    Only logs when status is DISTURBED or CRITICAL (not CLEAR).
    Deduplicates: won't log a new row unless status changed OR
    30 seconds have passed in the same threat state.
    """

    def __init__(self, log_dir: str = None):
        self._log_dir = log_dir or LOG_DIR
        os.makedirs(self._log_dir, exist_ok=True)  # LOG_DIR can be overridden for tests
        self._lock = threading.Lock()
        self._last_status: Optional[str] = None
        self._last_log_time: float = 0.0

    # ── Internal helpers ──────────────────────────────────────────
    def _csv_path(self, dt: datetime) -> str:
        return os.path.join(self._log_dir, f"events_{dt.strftime('%Y-%m-%d')}.csv")

    def _ensure_header(self, path: str):
        if not os.path.exists(path):
            with open(path, "w", newline="") as f:
                csv.DictWriter(f, fieldnames=CSV_FIELDS).writeheader()

    # ── Public: log one reading ───────────────────────────────────
    def log(self, reading_dict: dict):
        """
        Call this every poll cycle with the full reading dict.
        Silently skips CLEAR states and duplicate rows.
        """
        status = reading_dict.get("status", "CLEAR")
        if status == "CLEAR":
            self._last_status = status
            return

        now = time.time()
        # Deduplicate: same state, less than 30s since last log
        with self._lock:
            same_state = (status == self._last_status)
            too_soon   = (now - self._last_log_time) < 30.0
            if same_state and too_soon:
                return
            self._last_status    = status
            self._last_log_time  = now

        dt = datetime.now(timezone.utc)
        path = self._csv_path(dt)
        self._ensure_header(path)

        row = {
            "timestamp_utc":  dt.isoformat(),
            "status":         status,
            "jam_score":      reading_dict.get("jam_score",    0),
            "spoof_score":    reading_dict.get("spoof_score",  0),
            "probe_score":    reading_dict.get("probe_score",  0),
            "emf_confidence": reading_dict.get("emf_confidence", 0),
            "emf_source":     reading_dict.get("emf_source",  "NONE"),
            "magnitude_ut":   reading_dict.get("magnitude_ut", ""),
            "cn0":            reading_dict.get("cn0",          ""),
            "time_delta":     reading_dict.get("time_delta",   0),
            "coord_jump_m":   reading_dict.get("coord_jump_m", 0),
            "probe_count":    reading_dict.get("probe_count",  0),
            "alerts":         " | ".join(reading_dict.get("alerts", [])),
        }

        with self._lock:
            try:
                with open(path, "a", newline="") as f:
                    csv.DictWriter(f, fieldnames=CSV_FIELDS).writerow(row)
            except Exception as e:
                print(f"[BlackBox] Write error: {e}")

    # ── Public: read last 24h for playback UI ─────────────────────
    def get_last_24h(self) -> list[dict]:
        """
        Returns all logged events from the last 24 hours,
        sorted chronologically. Used by the playback UI.
        """
        cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
        events = []

        # May span two calendar days
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

        # Deduplicate and sort
        seen = set()
        unique = []
        for e in sorted(events, key=lambda r: r["timestamp_utc"]):
            key = e["timestamp_utc"]
            if key not in seen:
                seen.add(key)
                unique.append(e)

        return unique

    # ── Public: hourly heatmap for "Rhythm of War" ────────────────
    def get_hourly_heatmap(self) -> list[dict]:
        """
        Returns a 24-element list (one per UTC hour) with event counts.
        Shape: [{"hour": 0, "count": 3, "max_status": "CRITICAL"}, ...]
        Used to reveal patterns like "jamming always at 04:00".
        """
        events = self.get_last_24h()
        buckets = [{"hour": h, "count": 0, "max_status": "CLEAR"} for h in range(24)]

        STATUS_RANK = {"CLEAR": 0, "DISTURBED": 1, "CRITICAL": 2}

        for e in events:
            try:
                ts = datetime.fromisoformat(e["timestamp_utc"])
                h  = ts.hour
                buckets[h]["count"] += 1
                if STATUS_RANK.get(e["status"], 0) > STATUS_RANK.get(buckets[h]["max_status"], 0):
                    buckets[h]["max_status"] = e["status"]
            except Exception:
                pass

        return buckets

    # ── Public: summary stats ─────────────────────────────────────
    def get_stats(self) -> dict:
        events = self.get_last_24h()
        total     = len(events)
        critical  = sum(1 for e in events if e.get("status") == "CRITICAL")
        disturbed = sum(1 for e in events if e.get("status") == "DISTURBED")
        return {
            "total_24h":    total,
            "critical_24h": critical,
            "disturbed_24h": disturbed,
        }
