"""
backend/sensors/gps_poller.py
GPS coordinate source that does NOT require Termux:API.

Strategy (tries each in order, uses first that works):

  1. termux-sensor accelerometer proxy  — Termux has termux-sensor built-in
     (not GPS, but confirms sensor pipeline works — skipped for coords)

  2. Android GPS via /dev/socket/location or cached network fix
     — reads Android's cached last-known location from the location
     cache file that Android writes to a world-readable path on many ROMs

  3. GPSLogger / ShareGPS file drop — if the user runs any standard
     GPS logger app that writes NMEA to /sdcard/, we parse it

  4. WebSocket from browser — the dashboard JS sends window.geolocation
     back to a local WebSocket endpoint on port 9001. This is the most
     reliable no-root no-API method: the browser already has GPS permission
     and the Geolocation API works in Chrome without any extra apps.

Method 4 is the primary path here. The dashboard JS already opens a
WebSocket to ws://127.0.0.1:9001 and streams coords. This file runs
the WebSocket server and writes coords to GPS_FIX_FILE so
time_integrity.py can read them.

GPS_FIX_FILE format (JSON, written every fix):
  {
    "lat": 51.123,
    "lon": -0.456,
    "accuracy": 12.5,
    "ts": 1713100000.123,   <- Unix timestamp of the fix
    "source": "browser"
  }
"""

import json
import math
import os
import sys
import threading
import time

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))
import config

GPS_FIX_FILE = '/data/data/com.aero.batteryhealth/files/gps_fix.json'
WS_PORT      = 9001


# ── WebSocket GPS server ───────────────────────────────────────────
# Minimal RFC 6455 WebSocket server — no dependencies beyond stdlib.
# The dashboard JS connects here and streams Geolocation API fixes.

import socket as _socket
import base64
import hashlib
import struct as _struct


def _ws_handshake(conn):
    """Complete the HTTP→WS upgrade handshake. Returns True on success."""
    try:
        data = b""
        while b"\r\n\r\n" not in data:
            chunk = conn.recv(1024)
            if not chunk:
                return False
            data += chunk
        headers = {}
        for line in data.decode(errors="ignore").split("\r\n")[1:]:
            if ":" in line:
                k, v = line.split(":", 1)
                headers[k.strip().lower()] = v.strip()
        key = headers.get("sec-websocket-key", "")
        accept = base64.b64encode(
            hashlib.sha1((key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11").encode()).digest()
        ).decode()
        response = (
            "HTTP/1.1 101 Switching Protocols\r\n"
            "Upgrade: websocket\r\n"
            "Connection: Upgrade\r\n"
            f"Sec-WebSocket-Accept: {accept}\r\n\r\n"
        )
        conn.sendall(response.encode())
        return True
    except Exception:
        return False


def _ws_read_frame(conn):
    """Read one WebSocket text frame. Returns decoded string or None."""
    try:
        header = b""
        while len(header) < 2:
            b = conn.recv(2 - len(header))
            if not b:
                return None
            header += b
        opcode  = header[0] & 0x0F
        masked  = (header[1] & 0x80) != 0
        length  = header[1] & 0x7F
        if length == 126:
            length = _struct.unpack("!H", conn.recv(2))[0]
        elif length == 127:
            length = _struct.unpack("!Q", conn.recv(8))[0]
        mask = conn.recv(4) if masked else b"\x00\x00\x00\x00"
        payload = b""
        while len(payload) < length:
            chunk = conn.recv(length - len(payload))
            if not chunk:
                return None
            payload += chunk
        decoded = bytes(b ^ mask[i % 4] for i, b in enumerate(payload))
        if opcode == 8:   # close frame
            return None
        return decoded.decode("utf-8", errors="ignore")
    except Exception:
        return None


def _handle_client(conn, addr):
    """Handle one WebSocket client connection."""
    try:
        if not _ws_handshake(conn):
            return
        print(f"[GPS] Browser connected from {addr}")
        while True:
            msg = _ws_read_frame(conn)
            if msg is None:
                break
            try:
                fix = json.loads(msg)
                fix["source"] = "browser"
                fix["ts"] = time.time()   # receipt time — used for staleness only
                # gnss_ts (pos.timestamp/1000) is the GPS chip epoch sent by
                # dashboard.js. Do NOT overwrite it — time_integrity uses it
                # for time-warp detection against NTP.
                tmp = GPS_FIX_FILE + ".tmp"
                with open(tmp, "w") as f:
                    json.dump(fix, f)
                os.replace(tmp, GPS_FIX_FILE)
            except Exception:
                pass
    except Exception:
        pass
    finally:
        try:
            conn.close()
        except Exception:
            pass


def run_ws_server():
    """Run the GPS WebSocket server forever."""
    srv = _socket.socket(_socket.AF_INET, _socket.SOCK_STREAM)
    srv.setsockopt(_socket.SOL_SOCKET, _socket.SO_REUSEADDR, 1)
    srv.bind(("127.0.0.1", WS_PORT))
    srv.listen(4)
    print(f"[GPS] WebSocket server on ws://127.0.0.1:{WS_PORT}")
    while True:
        try:
            conn, addr = srv.accept()
            t = threading.Thread(target=_handle_client, args=(conn, addr), daemon=True)
            t.start()
        except Exception:
            pass


# ── Convenience read function used by time_integrity.py ───────────
# Must be > POLL_STANDBY (10 s) so a fix from the start of a standby cycle
# is still valid when the daemon wakes at the end of it.
_GPS_STALE_SECONDS = 20


def read_fix() -> dict | None:
    """
    Read the latest GPS fix from the shared file.
    Returns dict with lat, lon, ts, gnss_ts, accuracy, source — or None if stale.
    """
    try:
        with open(GPS_FIX_FILE) as f:
            fix = json.load(f)
        age = time.time() - fix.get("ts", 0)
        if age > _GPS_STALE_SECONDS:
            return None
        return fix
    except Exception:
        return None


if __name__ == "__main__":
    run_ws_server()
