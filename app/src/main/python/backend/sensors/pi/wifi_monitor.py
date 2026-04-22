"""
backend/sensors/pi/wifi_monitor.py
Pi WiFi sensor — full monitor mode probe request capture.

Hardware: Any WiFi adapter that supports monitor mode.
  Built-in Pi Zero 2W WiFi (Cypress CYW43438) — monitor mode supported
  Recommended: TP-Link TL-WN722N (Atheros AR9271) — better sensitivity

Setup (handled by pi/setup.sh):
  sudo apt install aircrack-ng
  sudo airmon-ng start wlan0   → creates wlan0mon

This gives us what /proc/net/arp cannot:
  - Actual probe request frames (device searching for APs)
  - Drone-class MAC OUI identification
  - Signal strength (RSSI) per probe
  - Probe rate (frames/second) — drones probe at high rate
  - Hidden SSID probes — IMSI catchers send these

Falls back to /proc/net/arp if monitor mode unavailable.
"""

import os
import re
import subprocess
import sys
import threading
import time
from collections import deque
from typing import Optional

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..'))
import config

# Known drone / surveillance device OUI prefixes
DRONE_OUIS = {
    "60:60:1f": "DJI",
    "48:1c:b9": "DJI",
    "34:d2:62": "DJI",
    "0c:ae:7d": "DJI",
    "18:48:be": "Parrot",
    "90:03:b7": "Parrot",
    "00:12:1c": "Yuneec",
    "d8:b0:4c": "Autel",
}

# IMSI catcher / stingray indicators
IMSI_PATTERNS = [
    r"Probe Request.*SSID:\s*$",   # empty SSID probe
    r"Probe Request.*\(0\)",        # zero-length SSID
]


class PiWiFiMonitor:
    """
    Captures probe requests using tcpdump in monitor mode.
    No Scapy required — pure subprocess parsing.
    Thread-safe sliding window of unique MACs.
    """

    def __init__(self):
        self._lock      = threading.Lock()
        self._window    = deque()      # (timestamp, mac, rssi, vendor, ssid)
        self._iface     = None
        self._proc      = None
        self._has_monitor = False
        self._setup()

    def _setup(self):
        """Enable monitor mode and start capture."""
        iface = config.PI_WIFI_IFACE

        # Check if monitor mode interface already exists
        result = subprocess.run(
            ["iwconfig"], capture_output=True, text=True
        )
        mon_iface = None
        for line in result.stdout.split('\n'):
            if 'Monitor' in line:
                mon_iface = line.split()[0]
                break

        if not mon_iface:
            # Try to enable monitor mode
            try:
                subprocess.run(["sudo", "airmon-ng", "start", iface],
                               capture_output=True, timeout=10)
                mon_iface = iface + "mon"
            except Exception:
                pass

        if mon_iface:
            self._iface = mon_iface
            self._has_monitor = True
            t = threading.Thread(target=self._capture_loop, daemon=True)
            t.start()
            print(f"[Pi WiFi] Monitor mode on {mon_iface}")
        else:
            print("[Pi WiFi] Monitor mode unavailable — using /proc/net/arp fallback")

    def _capture_loop(self):
        """
        Run tcpdump to capture probe requests.
        tcpdump output format (with -e flag):
          timestamp srcMAC > ff:ff:ff:ff:ff:ff Probe Request (SSID)
        """
        cmd = [
            "sudo", "tcpdump",
            "-i", self._iface,
            "-e",           # print link-level headers (has MAC)
            "-s", "256",    # snap length
            "-l",           # line buffered
            "type mgt subtype probe-req"  # only probe requests
        ]
        while True:
            try:
                self._proc = subprocess.Popen(
                    cmd, stdout=subprocess.PIPE,
                    stderr=subprocess.DEVNULL,
                    text=True, bufsize=1
                )
                for line in self._proc.stdout:
                    self._parse_probe_line(line)
            except Exception as e:
                print(f"[Pi WiFi] Capture error: {e}")
            time.sleep(3)

    def _parse_probe_line(self, line: str):
        """Parse tcpdump probe request line."""
        mac_match = re.search(
            r'([0-9a-f]{2}(?::[0-9a-f]{2}){5})', line, re.I
        )
        if not mac_match:
            return
        mac = mac_match.group(1).lower()

        # RSSI from radiotap header if present
        rssi_match = re.search(r'-(\d+)dBm', line)
        rssi = -int(rssi_match.group(1)) if rssi_match else None

        # SSID
        ssid_match = re.search(r'\(([^)]*)\)', line)
        ssid = ssid_match.group(1) if ssid_match else ""

        # Vendor lookup
        oui = mac[:8].lower()
        vendor = DRONE_OUIS.get(oui, "Unknown")

        with self._lock:
            self._window.append((time.time(), mac, rssi, vendor, ssid))

    def _arp_fallback(self) -> list:
        """Read MACs from /proc/net/arp when monitor mode unavailable."""
        macs = []
        try:
            with open("/proc/net/arp") as f:
                for line in f.readlines()[1:]:
                    parts = line.split()
                    if len(parts) >= 4:
                        mac = parts[3].lower()
                        if mac != "00:00:00:00:00:00":
                            macs.append((time.time(), mac, None, "Unknown", ""))
        except Exception:
            pass
        return macs

    def sample(self) -> dict:
        """
        Returns probe flood analysis for last 60 seconds.
        Identical interface to ProbeFloodSensor.sample()
        """
        now = time.time()

        if self._has_monitor:
            with self._lock:
                # Prune old entries
                self._window = deque(
                    (t, m, r, v, s) for t, m, r, v, s in self._window
                    if now - t <= 60
                )
                recent = list(self._window)
        else:
            recent = self._arp_fallback()

        unique_macs   = {m for _, m, _, _, _ in recent}
        drone_macs    = {m for _, m, _, v, _ in recent if v != "Unknown"}
        empty_ssid    = sum(1 for _, _, _, _, s in recent if s == "")
        unique_count  = len(unique_macs)
        drone_count   = len(drone_macs)
        unknown_ratio = (unique_count - drone_count) / unique_count if unique_count else 0

        score = 0
        if unique_count > config.PROBE_BURST_THRESHOLD:
            excess   = unique_count - config.PROBE_BURST_THRESHOLD
            weighted = excess * (1.0 + unknown_ratio)
            score   += min(60, int(weighted * 2))
        # Drone OUI match is a strong signal
        if drone_count > 0:
            score += min(40, drone_count * 20)
        # Empty SSID probes (IMSI catcher indicator)
        if empty_ssid > 5:
            score += min(20, empty_ssid * 2)

        score = min(100, score)

        return {
            "unique_per_min": unique_count,
            "probe_score":    score,
            "drone_macs":     drone_count,
            "unknown_ratio":  round(unknown_ratio, 2),
            "imsi_indicator": empty_ssid > 5,
        }
