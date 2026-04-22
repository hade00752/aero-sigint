import json
import os
import socket
import sys
import threading
import time
from datetime import datetime, timezone

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

# Force android mode - we are always in an APK
os.environ['SIGINT_ENV'] = 'android'
import config
config.ENV = 'android'
config.IS_ANDROID = True
config.IS_REAL = True

from backend.sensors._android_sensor import AndroidSensor
from backend.utils.blackbox import BlackBox


def _broadcast(sock, reading):
    payload = reading.to_dict()
    payload["ts"] = datetime.now(timezone.utc).isoformat()
    sock.sendto(json.dumps(payload).encode(), (config.UDP_HOST, config.UDP_PORT))


def run():
    sensor = AndroidSensor()
    blackbox = BlackBox()
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)

    print(f"[DAEMON] ANDROID mode  udp={config.UDP_HOST}:{config.UDP_PORT}")

    while True:
        t0 = time.monotonic()
        try:
            reading = sensor.read()
            _broadcast(sock, reading)
            payload = reading.to_dict()
            payload["ts"] = datetime.now(timezone.utc).isoformat()
            blackbox.log(payload)
        except Exception as e:
            print(f"[DAEMON] sensor error: {e}")
            import traceback
            traceback.print_exc()

        elapsed = time.monotonic() - t0
        time.sleep(max(0.1, 2.0 - elapsed))


if __name__ == "__main__":
    run()
