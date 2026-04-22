"""
aero-sigint / config.py
Platform-agnostic configuration.

SIGINT_ENV values:
  wsl       → mock harness, localhost only (development)
  android   → Termux on Android phone
  pi        → Raspberry Pi (full Linux, monitor mode, u-blox GPS, I2C mag)

Every value overridable via environment variable.
"""

import os
import socket

# ── Runtime platform ───────────────────────────────────────────────
ENV        = os.getenv("SIGINT_ENV", "wsl")
IS_ANDROID = ENV == "android"
IS_PI      = ENV == "pi"
IS_REAL    = IS_ANDROID or IS_PI   # any real hardware

# ── Network ────────────────────────────────────────────────────────
# Pi serves to entire local network (0.0.0.0); phone/WSL stays localhost
_default_http_host = "0.0.0.0" if IS_PI else "127.0.0.1"

UDP_HOST   = os.getenv("SIGINT_UDP_HOST",  "127.0.0.1")
UDP_PORT   = int(os.getenv("SIGINT_UDP_PORT",  "9000"))
HTTP_HOST  = os.getenv("SIGINT_HTTP_HOST",  _default_http_host)
HTTP_PORT  = int(os.getenv("SIGINT_HTTP_PORT", "8080"))
WS_PORT    = int(os.getenv("SIGINT_WS_PORT",   "9001"))

# ── Pi hardware config ─────────────────────────────────────────────
PI_WIFI_IFACE    = os.getenv("SIGINT_PI_WIFI",    "wlan0")   # monitor mode iface
PI_GPS_PORT      = os.getenv("SIGINT_GPS_PORT",   "/dev/ttyUSB0")
PI_GPS_BAUD      = int(os.getenv("SIGINT_GPS_BAUD", "9600"))
PI_MAG_I2C_BUS   = int(os.getenv("SIGINT_MAG_BUS",  "1"))    # /dev/i2c-1
PI_MAG_I2C_ADDR  = int(os.getenv("SIGINT_MAG_ADDR", "0x1E"), 16)  # HMC5883L

# ── Sensor tuning ─────────────────────────────────────────────────
POLL_INTERVAL         = float(os.getenv("SIGINT_POLL",         "2.0"))
POLL_STANDBY          = float(os.getenv("SIGINT_POLL_STANDBY", "10.0"))  # quiet periods
CN0_BASELINE_SAMPLES  = int(os.getenv("SIGINT_BASELINE",       "30"))    # more samples on Pi
CN0_DROP_THRESHOLD    = float(os.getenv("SIGINT_CN0_DROP",     "6.0"))
AGC_DROP_THRESHOLD    = float(os.getenv("SIGINT_AGC_DROP",     "10.0"))
TIME_DELTA_THRESHOLD  = float(os.getenv("SIGINT_TIME_DELTA",   "1.0"))
TELEPORT_THRESHOLD_M  = float(os.getenv("SIGINT_TELEPORT",     "500.0"))
PROBE_BURST_THRESHOLD = int(os.getenv("SIGINT_PROBE_BURST",    "50"))

# ── Adaptive polling ───────────────────────────────────────────────
# Tighten poll interval when threat scores rise
ADAPTIVE_POLL_TRIGGER = int(os.getenv("SIGINT_ADAPTIVE_TRIGGER", "15"))  # score % to tighten

# ── Alert thresholds ───────────────────────────────────────────────
DISTURBED_JAM_THRESHOLD   = int(os.getenv("SIGINT_JAM_THRESH",   "40"))
DISTURBED_SPOOF_THRESHOLD = int(os.getenv("SIGINT_SPOOF_THRESH", "20"))
DISTURBED_PROBE_THRESHOLD = int(os.getenv("SIGINT_PROBE_THRESH", "40"))
CRITICAL_SPOOF_THRESHOLD  = int(os.getenv("SIGINT_CRIT_SPOOF",  "50"))
CRITICAL_PROBE_THRESHOLD  = int(os.getenv("SIGINT_CRIT_PROBE",  "70"))
CRITICAL_JAM_EMF_THRESHOLD= int(os.getenv("SIGINT_CRIT_JAM",    "70"))

# ── Pi network broadcast ───────────────────────────────────────────
# When True, dashboard is accessible to all phones on the local network
NETWORK_BROADCAST = IS_PI or os.getenv("SIGINT_BROADCAST", "false").lower() == "true"

# ── Mock harness (WSL only) ────────────────────────────────────────
MOCK_SCENARIO = os.getenv("SIGINT_SCENARIO", "random")
MOCK_LOOP     = os.getenv("SIGINT_LOOP", "true").lower() == "true"

# ── Logging ────────────────────────────────────────────────────────
LOG_RETENTION_DAYS = int(os.getenv("SIGINT_LOG_DAYS", "30"))
