"""
backend/sensors/_android_sensor.py
v2: Aggregates Radio + TimeIntegrity + ProbeFlood + Magnetometer.
"""

import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from backend.sensors.base import BaseSensor, SensorReading
from backend.sensors.radio import RadioSensor
from backend.sensors.time_integrity import TimeIntegrity
from backend.sensors.probe_flood import ProbeFloodSensor
from backend.sensors.magnetometer import MagnetometerSensor


class AndroidSensor(BaseSensor):
    def __init__(self):
        self._radio  = RadioSensor()
        self._time   = TimeIntegrity()
        self._probe  = ProbeFloodSensor()
        self._mag    = MagnetometerSensor()

    def read(self) -> SensorReading:
        cn0, agc  = self._radio.read()
        jam_score = self._radio.jam_score(cn0, agc)
        ti        = self._time.check()
        ps        = self._probe.sample()
        mag       = self._mag.read()

        return SensorReading(
            jam_score      = jam_score,
            cn0            = cn0,
            agc            = agc,
            spoof_score    = ti["spoof_score"],
            time_delta     = ti["time_delta_s"],
            coord_jump_m   = ti["coord_jump_m"],
            probe_score    = ps["probe_score"],
            probe_count    = ps["unique_per_min"],
            emf_confidence = mag["emf_confidence"],
            emf_source     = mag["emf_source"],
            magnitude_ut   = mag["magnitude_ut"],
            peak_ut        = mag["peak_ut"],
            variance_ut2   = mag["variance_ut2"],
        )
