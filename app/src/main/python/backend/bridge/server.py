import json
import os
import queue
import socket
import sys
import threading
import time
import traceback
from datetime import datetime, timezone

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

os.environ['SIGINT_ENV'] = 'android'

from flask import Flask, Response, jsonify, request, send_from_directory
import config


# Try multiple paths for Chaquopy APK environment
_base = os.path.dirname(__file__)
for _candidate in [
    os.path.join(_base, '..', '..', 'frontend'),
    '/data/data/com.aero.batteryhealth/files/chaquopy/AssetFinder/app/frontend',
    os.path.join(os.path.dirname(_base), 'frontend'),
]:
    if os.path.exists(os.path.join(_candidate, 'templates', 'index.html')):
        FRONTEND_DIR = _candidate
        break
else:
    FRONTEND_DIR = os.path.join(_base, '..', '..', 'frontend')

app = Flask(__name__, static_folder=os.path.join(FRONTEND_DIR, 'static'))

# Rolling waterfall history — persists across WebView reconnects
_history = []  # list of {j, s, p, ts}
_history_lock = threading.Lock()
_HISTORY_MAX = 300  # 10 minutes at 2s poll

_latest = {
    "status": "CLEAR", "jam_score": 0, "fused_jam_score": 0,
    "spoof_score": 0, "probe_score": 0,
    "emf_confidence": 0, "emf_source": "NONE",
    "magnitude_ut": None, "cn0": None, "agc": None,
    "time_delta": 0.0, "coord_jump_m": 0.0,
    "probe_count": 0, "alerts": [], "ts": None,
}
_lock = threading.Lock()
_subscribers = []
_sub_lock = threading.Lock()

def _udp_listener():
    """Receives sensor payloads and fans out to SSE subscribers.
    Restarts automatically on bind failure so the bridge never goes deaf."""
    while True:
        sock = None
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            sock.bind((config.UDP_HOST, config.UDP_PORT))
            while True:
                try:
                    data, _ = sock.recvfrom(8192)
                    payload = json.loads(data.decode())
                    with _lock:
                        _latest.update(payload)
                    with _history_lock:
                        _history.append({
                            'j': payload.get('fused_jam_score', payload.get('jam_score', 0)),
                            's': payload.get('spoof_score', 0),
                            'p': payload.get('probe_score', 0),
                            'ts': payload.get('ts', '')
                        })
                        if len(_history) > _HISTORY_MAX:
                            _history.pop(0)
                    msg = f"data: {json.dumps(payload)}\n\n"
                    with _sub_lock:
                        dead = []
                        for q in _subscribers:
                            try:
                                q.put_nowait(msg)
                            except queue.Full:
                                dead.append(q)
                        for q in dead:
                            _subscribers.remove(q)
                except json.JSONDecodeError as e:
                    print(f"[Bridge] UDP parse error: {e}", flush=True)
                except Exception:
                    pass
        except Exception as e:
            print(f"[Bridge] UDP bind failed: {e} — retrying in 5 s", flush=True)
        finally:
            if sock:
                try:
                    sock.close()
                except Exception:
                    pass
        time.sleep(5)

@app.route("/")
def index():
    try:
        return send_from_directory(
            os.path.join(FRONTEND_DIR, 'templates'), "index.html"
        )
    except Exception as e:
        return f"<pre style='background:black;color:lime;padding:20px'>index error: {e}</pre>"

@app.route("/health")
def health():
    return jsonify({"ok": True, "ts": datetime.now(timezone.utc).isoformat()})

_BATTERY_FILE   = '/data/data/com.aero.batteryhealth/files/battery_unrestricted.txt'
_LOW_POWER_FILE = '/data/data/com.aero.batteryhealth/files/low_power.txt'
_TEST_ALARM_FILE = '/data/data/com.aero.batteryhealth/files/test_alarm.txt'

@app.route("/state")
def state():
    with _lock:
        data = dict(_latest)
    data["server_ts"] = datetime.now(timezone.utc).isoformat()
    try:
        data["battery_unrestricted"] = open(_BATTERY_FILE).read().strip() == 'true'
    except Exception:
        data["battery_unrestricted"] = None
    try:
        from backend.sensors.gps_poller import read_fix
        fix = read_fix()
        data["gps_locked"] = fix is not None
        data["gps_lat"] = round(fix["lat"], 4) if fix else None
        data["gps_lon"] = round(fix["lon"], 4) if fix else None
    except Exception:
        data["gps_locked"] = False
        data["gps_lat"] = None
        data["gps_lon"] = None
    return jsonify(data)

@app.route("/lowpower", methods=["GET"])
def get_low_power():
    try:
        active = open(_LOW_POWER_FILE).read().strip() == 'true'
    except Exception:
        active = False
    return jsonify({"low_power": active})

@app.route("/lowpower", methods=["POST"])
def set_low_power():
    try:
        body = request.get_json(force=True, silent=True) or {}
        active = bool(body.get("enabled", False))
        open(_LOW_POWER_FILE, 'w').write('true' if active else 'false')
    except Exception:
        active = False
    return jsonify({"ok": True, "low_power": active})

@app.route("/test-alarm", methods=["POST"])
def test_alarm_route():
    try:
        open(_TEST_ALARM_FILE, 'w').write('1')
    except Exception:
        pass
    return jsonify({"ok": True})

_BASELINE_FILE = '/data/data/com.aero.batteryhealth/files/last_coord.json'

@app.route("/reset-gps-baseline", methods=["POST"])
def reset_gps_baseline():
    try:
        if os.path.exists(_BASELINE_FILE):
            os.remove(_BASELINE_FILE)
    except Exception:
        pass
    return jsonify({"ok": True})

@app.route("/debug")
def debug():
    log_content = ""
    try:
        log_content = open('/data/data/com.aero.batteryhealth/files/sigint_startup.log').read()
    except Exception as e:
        log_content = f"No log file: {e}"
    return f"""<pre style='background:black;color:lime;padding:20px;font-size:12px'>
ENV={config.ENV}
IS_ANDROID={config.IS_ANDROID}
IS_REAL={config.IS_REAL}
SERVER_TIME={datetime.now(timezone.utc).isoformat()}
FROZEN_TS={_latest.get('ts','none')}

STARTUP LOG:
{log_content}
</pre>"""

@app.route("/stream")
def stream():
    q = queue.Queue(maxsize=64)
    with _sub_lock:
        _subscribers.append(q)
    def generate():
        with _lock:
            yield f"data: {json.dumps(_latest)}\n\n"
        try:
            while True:
                yield q.get(timeout=30)
        except Exception:
            pass
        finally:
            with _sub_lock:
                if q in _subscribers:
                    _subscribers.remove(q)
    return Response(generate(), mimetype="text/event-stream",
                    headers={"Cache-Control": "no-cache",
                             "X-Accel-Buffering": "no",
                             "Connection": "keep-alive"})


@app.route("/history")
def history():
    with _history_lock:
        return jsonify(list(_history))

@app.route("/logs/events")
def logs_events():
    try:
        from backend.utils.blackbox import BlackBox
        bb = BlackBox()
        return jsonify(bb.get_last_24h())
    except Exception as e:
        return jsonify([])

@app.route("/logs/heatmap")
def logs_heatmap():
    try:
        from backend.utils.blackbox import BlackBox
        bb = BlackBox()
        buckets = bb.get_hourly_heatmap()
        return jsonify([b["count"] for b in buckets])
    except Exception as e:
        return jsonify([0]*24)

@app.route("/logs/stats")
def logs_stats():
    try:
        from backend.utils.blackbox import BlackBox
        bb = BlackBox()
        return jsonify(bb.get_stats())
    except Exception as e:
        return jsonify({"total_24h": 0, "critical_24h": 0, "disturbed_24h": 0})

def _save_history():
    """Save waterfall history to disk every 60s."""
    import time
    android_files = '/data/data/com.aero.batteryhealth/files'
    hist_path = os.path.join(
        android_files if os.path.exists(android_files)
        else os.path.join(os.path.dirname(__file__), '..', '..'),
        'waterfall_history.json'
    )
    while True:
        time.sleep(60)
        try:
            with _history_lock:
                data = list(_history)
            with open(hist_path, 'w') as f:
                json.dump(data, f)
        except Exception as e:
            pass

def _load_history():
    """Load waterfall history from disk on startup."""
    android_files = '/data/data/com.aero.batteryhealth/files'
    hist_path = os.path.join(
        android_files if os.path.exists(android_files)
        else os.path.join(os.path.dirname(__file__), '..', '..'),
        'waterfall_history.json'
    )
    try:
        with open(hist_path) as f:
            data = json.load(f)
        with _history_lock:
            _history.extend(data[-_HISTORY_MAX:])
        print(f"[Bridge] Loaded {len(data)} history points")
    except Exception:
        pass

def run():
    _load_history()
    threading.Thread(target=_save_history, daemon=True).start()
    t = threading.Thread(target=_udp_listener, daemon=True)
    t.start()
    print(f"[Bridge] Dashboard -> http://127.0.0.1:8080")
    app.run(host="127.0.0.1", port=8080,
            threaded=True, debug=False, use_reloader=False)

if __name__ == "__main__":
    run()

