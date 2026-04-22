"""
backend/sensors/pi/pi_sensor.py
Pi sensor aggregator — same BaseSensor interface as AndroidSensor.

Sensor stack:
  GPS      → PiGPSSensor (u-blox NEO-M8N via serial)
  Mag      → PiMagnetometerI2C (HMC5883L/QMC5883L via I2C)
  WiFi     → PiWiFiMonitor (monitor mode probe capture)
  Radio    → RadioSensor (reused from Android — reads /proc/net/wireless)

Adaptive polling:
  Standby:  10s when all scores < ADAPTIVE_POLL_TRIGGER
  Active:    2s when any score >= ADAPTIVE_POLL_TRIGGER
  Critical:  1s when status == CRITICAL
"""

import os
import sys
import time

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..'))
import config
from backend.sensors.base import BaseSensor, SensorReading
from backend.sensors.radio import RadioSensor
from backend.sensors.pi.gps_serial import PiGPSSensor
from backend.sensors.pi.magnetometer_i2c import PiMagnetometerI2C
from backend.sensors.pi.wifi_monitor import PiWiFiMonitor


class PiSensor(BaseSensor):
    """
    Full Pi sensor stack. Identical .read() interface to AndroidSensor
    so daemon.py works with zero changes.
    """

    def __init__(self):
        print("[Pi Sensor] Initialising sensor stack...")
        self._radio = RadioSensor()
        self._gps   = PiGPSSensor()
        self._mag   = PiMagnetometerI2C()
        self._wifi  = PiWiFiMonitor()
        self._last_coord   = None
        self._last_fix_time = None
        print("[Pi Sensor] All sensors initialised.")

    def _coord_jump(self, lat, lon) -> float:
        """Haversine distance from last fix in metres."""
        if self._last_coord is None or lat is None or lon is None:
            return 0.0
        now = time.time()
        if self._last_fix_time and (now - self._last_fix_time) > 30:
            return 0.0  # stale — don't flag
        return self._gps.haversine(
            self._last_coord[0], self._last_coord[1], lat, lon
        )

    def read(self) -> SensorReading:
        # Radio (C/N₀ via /proc/net/wireless or dumpsys)
        cn0, agc  = self._radio.read()
        jam_score = self._radio.jam_score(cn0, agc)

        # GPS
        fix = self._gps.read()
        lat = fix.get('lat')
        lon = fix.get('lon')
        coord_jump = self._coord_jump(lat, lon)
        if lat is not None:
            self._last_coord    = (lat, lon)
            self._last_fix_time = time.time()

        # GPS time integrity — use real GNSS satellite time vs NTP
        gnss_ts    = fix.get('gnss_ts')
        time_delta = 0.0
        if gnss_ts:
            from backend.sensors.time_integrity import _query_ntp
            ntp_ts = _query_ntp()
            if ntp_ts:
                time_delta = abs(gnss_ts - ntp_ts)

        spoof_score = 0
        if time_delta > config.TIME_DELTA_THRESHOLD:
            spoof_score += min(70, int(time_delta * 30))
        if coord_jump > config.TELEPORT_THRESHOLD_M:
            spoof_score += min(30, int(coord_jump / 100))
        spoof_score = min(100, spoof_score)

        # Magnetometer
        mag = self._mag.read()

        # WiFi probe flood
        ps = self._wifi.sample()

        return SensorReading(
            jam_score      = jam_score,
            cn0            = cn0,
            agc            = agc,
            spoof_score    = spoof_score,
            time_delta     = round(time_delta, 3),
            coord_jump_m   = round(coord_jump, 1),
            probe_score    = ps["probe_score"],
            probe_count    = ps["unique_per_min"],
            emf_confidence = mag["emf_confidence"],
            emf_source     = mag["emf_source"],
            magnitude_ut   = mag["magnitude_ut"],
            peak_ut        = mag["peak_ut"],
            variance_ut2   = mag["variance_ut2"],
        )
