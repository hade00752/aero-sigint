import os
import sys
os.environ['SIGINT_ENV'] = 'android'
import threading
import time
import traceback

BASE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE)

LOG = '/data/data/com.aero.batteryhealth/files/sigint_startup.log'

def log(msg):
    try:
        with open(LOG, 'a') as f:
            f.write(f"{time.time()}: {msg}\n")
    except:
        pass

log("main.py started")

def start_bridge():
    try:
        log("importing bridge...")
        from backend.bridge.server import run
        log("bridge imported ok")
        run()
    except Exception as e:
        log(f"BRIDGE ERROR: {traceback.format_exc()}")

def start_daemon():
    try:
        time.sleep(2)
        log("importing daemon...")
        from backend.sensors.daemon import run
        log("daemon imported ok")
        run()
    except Exception as e:
        log(f"DAEMON ERROR: {traceback.format_exc()}")

def start_gps_ws():
    try:
        time.sleep(3)
        log("importing gps_poller...")
        from backend.sensors.gps_poller import run_ws_server
        log("gps_poller imported ok — starting WS server on port 9001")
        run_ws_server()
    except Exception as e:
        log(f"GPS WS ERROR: {traceback.format_exc()}")

threading.Thread(target=start_daemon, daemon=True).start()
threading.Thread(target=start_gps_ws, daemon=True).start()
log("threads started")

# Bridge runs on the main thread (non-daemon) so the process stays alive for
# the lifetime of the Flask server. Chaquopy keeps main.py alive as long as
# any non-daemon thread is running.
start_bridge()
