"""
backend/sensors/pi/magnetometer_i2c.py
Pi magnetometer — HMC5883L or QMC5883L via I2C.

Hardware: HMC5883L breakout board (~£3)
  SDA → GPIO 2 (Pin 3)
  SCL → GPIO 3 (Pin 5)
  VCC → 3.3V (Pin 1)
  GND → GND  (Pin 6)

Enable I2C on Pi:
  sudo raspi-config → Interface Options → I2C → Enable
  OR: add 'dtparam=i2c_arm=on' to /boot/config.txt

Falls back to synthetic baseline if I2C unavailable.

Advantages over phone magnetometer:
  - Fixed position — no user movement noise
  - Continuous sampling — 75Hz vs phone's ~10Hz
  - No battery magnetic interference
  - Calibration persists across sessions
"""

import json
import math
import os
import sys
import threading
import time
from collections import deque
from typing import Optional

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..'))
import config

# HMC5883L register map
HMC_CONFIG_A  = 0x00
HMC_CONFIG_B  = 0x01
HMC_MODE      = 0x02
HMC_DATA_XH   = 0x03
HMC_STATUS    = 0x09

# QMC5883L register map (clone chip, different registers)
QMC_DATA_X    = 0x00
QMC_CONTROL   = 0x09
QMC_PERIOD    = 0x0B

CALIB_FILE = os.path.join(os.path.dirname(__file__), '..', '..', '..', 'logs', 'mag_calibration.json')


class PiMagnetometerI2C:
    """
    Reads HMC5883L or QMC5883L magnetometer via I2C.
    Maintains hard-iron calibration offsets across sessions.
    """

    def __init__(self):
        self._lock    = threading.Lock()
        self._window  = deque(maxlen=40)   # 40 samples at 75Hz = ~0.5s
        self._offsets = [0.0, 0.0, 0.0]   # hard-iron calibration
        self._bus     = None
        self._chip    = None
        self._load_calibration()
        self._init_i2c()

        if self._bus:
            t = threading.Thread(target=self._read_loop, daemon=True)
            t.start()
            print(f"[Pi Mag] I2C {self._chip} on bus {config.PI_MAG_I2C_BUS}")
        else:
            print("[Pi Mag] I2C unavailable — synthetic baseline active")

    def _load_calibration(self):
        try:
            with open(CALIB_FILE) as f:
                data = json.load(f)
                self._offsets = data.get('offsets', [0.0, 0.0, 0.0])
                print(f"[Pi Mag] Loaded calibration offsets: {self._offsets}")
        except Exception:
            pass

    def _save_calibration(self):
        try:
            os.makedirs(os.path.dirname(CALIB_FILE), exist_ok=True)
            with open(CALIB_FILE, 'w') as f:
                json.dump({'offsets': self._offsets}, f)
        except Exception:
            pass

    def _init_i2c(self):
        try:
            import smbus2
            bus = smbus2.SMBus(config.PI_MAG_I2C_BUS)

            # Try HMC5883L first (0x1E)
            try:
                bus.write_byte_data(0x1E, HMC_CONFIG_A, 0x70)  # 8 samples, 75Hz
                bus.write_byte_data(0x1E, HMC_CONFIG_B, 0x20)  # gain 1.3Ga
                bus.write_byte_data(0x1E, HMC_MODE,     0x00)  # continuous
                self._bus   = bus
                self._addr  = 0x1E
                self._chip  = "HMC5883L"
                return
            except Exception:
                pass

            # Try QMC5883L (0x0D) — common Chinese clone
            try:
                bus.write_byte_data(0x0D, QMC_CONTROL, 0x1D)  # continuous, 200Hz
                bus.write_byte_data(0x0D, QMC_PERIOD,  0x01)
                self._bus   = bus
                self._addr  = 0x0D
                self._chip  = "QMC5883L"
                return
            except Exception:
                pass

        except ImportError:
            print("[Pi Mag] smbus2 not installed — run: pip install smbus2")
        except Exception as e:
            print(f"[Pi Mag] I2C init error: {e}")

    def _read_hmc(self) -> Optional[tuple]:
        data = self._bus.read_i2c_block_data(self._addr, HMC_DATA_XH, 6)
        x = self._to_signed(data[0] << 8 | data[1])
        z = self._to_signed(data[2] << 8 | data[3])
        y = self._to_signed(data[4] << 8 | data[5])
        # Scale to µT (HMC5883L: 0.92mG/LSB at gain 1.3 → × 0.092 for µT)
        scale = 0.092
        return x * scale, y * scale, z * scale

    def _read_qmc(self) -> Optional[tuple]:
        data = self._bus.read_i2c_block_data(self._addr, QMC_DATA_X, 6)
        x = self._to_signed(data[1] << 8 | data[0])
        y = self._to_signed(data[3] << 8 | data[2])
        z = self._to_signed(data[5] << 8 | data[4])
        scale = 0.01  # QMC: 1 LSB = 10nT at ±2G range → 0.01µT
        return x * scale, y * scale, z * scale

    @staticmethod
    def _to_signed(val: int) -> int:
        return val - 65536 if val > 32767 else val

    def _read_loop(self):
        while True:
            try:
                if self._chip == "HMC5883L":
                    x, y, z = self._read_hmc()
                else:
                    x, y, z = self._read_qmc()

                # Apply hard-iron calibration offsets
                x -= self._offsets[0]
                y -= self._offsets[1]
                z -= self._offsets[2]

                magnitude = math.sqrt(x*x + y*y + z*z)
                with self._lock:
                    self._window.append(magnitude)
                time.sleep(1/75)  # 75Hz
            except Exception as e:
                print(f"[Pi Mag] Read error: {e}")
                time.sleep(1)

    @staticmethod
    def _synthetic() -> float:
        t = time.time()
        return 45.0 + 8.0 * math.sin(t / 200) + \
               ((int(t*13) * 1664525) & 0xFFFF) / 0xFFFF * 3 - 1.5

    def read(self) -> dict:
        """Same interface as MagnetometerSensor.read() for drop-in compatibility."""
        with self._lock:
            samples = list(self._window)

        if not samples:
            samples = [self._synthetic()]

        mean     = sum(samples) / len(samples)
        variance = sum((s - mean)**2 for s in samples) / len(samples)
        peak     = max(samples)

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
            "magnitude_ut":    round(mean, 2),
            "peak_ut":         round(peak, 2),
            "variance_ut2":    round(variance, 2),
            "emf_confidence":  confidence,
            "emf_source":      source,
            "in_normal_range": in_normal,
        }

    def calibrate(self, duration_seconds: int = 30):
        """
        Run a quick hard-iron calibration.
        Rotate the Pi slowly in all directions for duration_seconds.
        Saves offsets to logs/mag_calibration.json.
        """
        print(f"[Pi Mag] Calibrating for {duration_seconds}s — rotate device slowly...")
        samples = []
        end = time.time() + duration_seconds
        while time.time() < end:
            with self._lock:
                if self._window:
                    samples.append(self._window[-1])
            time.sleep(0.1)
        if samples:
            self._offsets = [
                (max(samples) + min(samples)) / 2,
                0.0, 0.0
            ]
            self._save_calibration()
            print(f"[Pi Mag] Calibration complete. Offsets: {self._offsets}")
