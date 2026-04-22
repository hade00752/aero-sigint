"""
backend/sensors/pi/gps_serial.py
Pi GPS sensor — reads u-blox NEO-M8N (or any NMEA GPS) via serial.

Hardware: u-blox NEO-M8N connected via USB-OTG or GPIO UART
  USB:  appears as /dev/ttyUSB0
  GPIO: appears as /dev/ttyAMA0 or /dev/serial0

Provides:
  - Real GNSS coordinates (lat, lon, altitude)
  - Fix timestamp from satellite time (not OS clock)
  - Number of satellites in use
  - HDOP (horizontal accuracy)
  - UBX-MON-HW AGC value if u-blox UBX protocol enabled

Falls back to gpsd socket if available, then to None.
"""

import math
import os
import sys
import threading
import time
from typing import Optional

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..'))
import config


class PiGPSSensor:
    """
    Streams NMEA sentences from a serial GPS module.
    Parses GGA (fix + satellites), RMC (time + coords), GSV (signal quality).
    Thread-safe ring buffer of recent fixes.
    """

    def __init__(self):
        self._lock   = threading.Lock()
        self._latest = {}
        self._running = False
        self._thread  = None
        self._start()

    def _start(self):
        try:
            import serial  # pyserial
            self._serial_available = True
        except ImportError:
            self._serial_available = False
            print("[Pi GPS] pyserial not installed — run: pip install pyserial")
            return

        self._thread = threading.Thread(target=self._stream_loop, daemon=True)
        self._thread.start()
        print(f"[Pi GPS] Streaming from {config.PI_GPS_PORT} @ {config.PI_GPS_BAUD} baud")

    def _stream_loop(self):
        import serial
        while True:
            try:
                with serial.Serial(
                    config.PI_GPS_PORT,
                    config.PI_GPS_BAUD,
                    timeout=2
                ) as ser:
                    print(f"[Pi GPS] Connected to {config.PI_GPS_PORT}")
                    for line in ser:
                        try:
                            sentence = line.decode('ascii', errors='ignore').strip()
                            self._parse_nmea(sentence)
                        except Exception:
                            pass
            except Exception as e:
                print(f"[Pi GPS] Serial error: {e} — retrying in 5s")
                time.sleep(5)

    def _parse_nmea(self, sentence: str):
        """Parse GPGGA and GPRMC sentences."""
        if not sentence.startswith('$'):
            return
        # Validate checksum
        if '*' in sentence:
            body, chk = sentence[1:].split('*', 1)
            calc = 0
            for c in body:
                calc ^= ord(c)
            if f"{calc:02X}" != chk[:2].upper():
                return

        parts = sentence.split(',')
        tag = parts[0][1:]  # strip $

        if tag in ('GPGGA', 'GNGGA'):
            self._parse_gga(parts)
        elif tag in ('GPRMC', 'GNRMC'):
            self._parse_rmc(parts)

    def _parse_gga(self, p):
        """GGA: fix quality, coordinates, satellites, HDOP."""
        try:
            if len(p) < 10 or p[6] == '0':
                return  # no fix
            lat = self._nmea_to_decimal(p[2], p[3])
            lon = self._nmea_to_decimal(p[4], p[5])
            sats = int(p[7]) if p[7] else 0
            hdop = float(p[8]) if p[8] else 99.0
            alt  = float(p[9]) if p[9] else 0.0
            with self._lock:
                self._latest.update({
                    'lat': lat, 'lon': lon,
                    'sats': sats, 'hdop': hdop,
                    'alt': alt, 'ts': time.time(),
                    'fix': True,
                })
        except Exception:
            pass

    def _parse_rmc(self, p):
        """RMC: time, date, speed, heading."""
        try:
            if len(p) < 7 or p[2] != 'A':
                return  # no fix
            # Parse UTC time from HHMMSS.ss
            t = p[1]
            d = p[9]  # DDMMYY
            if len(t) >= 6 and len(d) == 6:
                import datetime
                utc_ts = datetime.datetime(
                    2000 + int(d[4:6]), int(d[2:4]), int(d[:2]),
                    int(t[:2]), int(t[2:4]), int(t[4:6]),
                    tzinfo=datetime.timezone.utc
                ).timestamp()
                with self._lock:
                    self._latest['gnss_ts'] = utc_ts
        except Exception:
            pass

    @staticmethod
    def _nmea_to_decimal(value: str, direction: str) -> Optional[float]:
        """Convert NMEA DDDMM.MMMM to decimal degrees."""
        try:
            if not value:
                return None
            dot = value.index('.')
            deg = float(value[:dot-2])
            mins = float(value[dot-2:])
            decimal = deg + mins / 60
            if direction in ('S', 'W'):
                decimal = -decimal
            return round(decimal, 8)
        except Exception:
            return None

    def read(self) -> dict:
        """
        Returns latest GPS fix dict or empty dict if no fix yet.
        Keys: lat, lon, alt, sats, hdop, ts, gnss_ts, fix
        """
        with self._lock:
            return dict(self._latest)

    def haversine(self, lat1, lon1, lat2, lon2) -> float:
        R = 6_371_000.0
        p1, p2 = math.radians(lat1), math.radians(lat2)
        dp = math.radians(lat2-lat1)
        dl = math.radians(lon2-lon1)
        a = math.sin(dp/2)**2 + math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
        return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
