import math
import os
import time
import threading
from collections import deque

_WINDOW_SIZE = 30
_window = deque(maxlen=_WINDOW_SIZE)
_lock = threading.Lock()


def _get_mag_file():
    paths = [
        "/data/data/com.aero.batteryhealth/files/mag_reading.txt",
        os.path.expanduser("~/mag_reading.txt"),
    ]
    for p in paths:
        if os.path.exists(p):
            return p
    return None


def _read_hardware():
    path = _get_mag_file()
    if not path:
        return None
    try:
        content = open(path).read().strip()
        parts = content.split(',')
        if len(parts) >= 4:
            return float(parts[3])
    except Exception:
        pass
    return None


def _synthetic():
    t = time.time()
    return 45.0 + 8.0 * math.sin(t / 200) + \
           ((int(t * 13) * 1664525) & 0xFFFF) / 0xFFFF * 3 - 1.5


def _stream_loop():
    while True:
        val = _read_hardware()
        if val is None:
            val = _synthetic()
        with _lock:
            _window.append(val)
        time.sleep(0.5)


# Start streaming thread
_t = threading.Thread(target=_stream_loop, daemon=True)
_t.start()


class MagnetometerSensor:
    """Drop-in class wrapper so _android_sensor.py can import it."""

    def read(self):
        with _lock:
            samples = list(_window)

        if not samples:
            samples = [_synthetic()]

        mean = sum(samples) / len(samples)
        variance = sum((s - mean) ** 2 for s in samples) / len(samples)
        peak = max(samples)

        confidence = 0
        if peak > 110.0:
            confidence += min(60, int((peak - 110.0) * 1.2))
        if variance > 80.0:
            confidence += min(40, int((variance - 80.0) * 0.3))
        confidence = min(100, confidence)

        in_normal = 20.0 <= mean <= 70.0
        if confidence >= 40:
            source = "ACTIVE_SUPPRESSION"
        elif not in_normal:
            source = "PASSIVE_LOSS"
        else:
            source = "NONE"

        return {
            "magnitude_ut": round(mean, 2),
            "peak_ut": round(peak, 2),
            "variance_ut2": round(variance, 2),
            "emf_confidence": confidence,
            "emf_source": source,
            "in_normal_range": in_normal,
        }
