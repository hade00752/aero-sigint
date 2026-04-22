import json
import os
import queue
import socket
import sys
import threading
import traceback
from datetime import datetime, timezone

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

os.environ['SIGINT_ENV'] = 'android'

from flask import Flask, Response, jsonify, send_from_directory
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
            except Exception:
                pass
    except Exception as e:
        pass

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

@app.route("/state")
def state():
    with _lock:
        data = dict(_latest)
    data["server_ts"] = datetime.now(timezone.utc).isoformat()
    return jsonify(data)

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


@app.route("/logs/events")
def logs_events():
    import glob, csv
    events = []
    try:
        log_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'logs')
        for f in sorted(glob.glob(os.path.join(log_dir, 'events_*.csv')), reverse=True)[:3]:
            with open(f) as csvf:
                for row in csv.DictReader(csvf):
                    events.append(row)
    except Exception as e:
        pass
    return jsonify(events[-100:] if len(events) > 100 else events)

@app.route("/logs/heatmap")
def logs_heatmap():
    buckets = [0] * 24
    try:
        import glob, csv
        log_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'logs')
        for f in glob.glob(os.path.join(log_dir, 'events_*.csv')):
            with open(f) as csvf:
                for row in csv.DictReader(csvf):
                    try:
                        hour = int(row.get('ts','00:00')[11:13])
                        buckets[hour] += 1
                    except:
                        pass
    except:
        pass
    return jsonify(buckets)

@app.route("/logs/stats")
def logs_stats():
    return jsonify({"total": 0, "critical": 0, "disturbed": 0})

def run():
    t = threading.Thread(target=_udp_listener, daemon=True)
    t.start()
    print(f"[Bridge] Dashboard -> http://127.0.0.1:8080")
    app.run(host="127.0.0.1", port=8080,
            threaded=True, debug=False, use_reloader=False)

if __name__ == "__main__":
    run()

