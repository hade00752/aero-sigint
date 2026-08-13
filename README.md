# Aero·SIGINT — Civilian Electronic Warfare Early Warning System

A passive early-warning Android app that detects GPS jamming, GPS spoofing, and nearby drone surveillance using sensors already built into any modern smartphone. No root. No internet. No data sent anywhere.

**Designed for non-technical users in high-risk environments** — conflict zones, border regions, areas with documented electronic warfare activity.

Tested on-device. Alarm confirmed working end-to-end.

---

## Current Version: v0.5.0

### What is actually working right now

| Capability | Status | Notes |
|---|---|---|
| GPS jamming detection | ✅ Working | Via GNSS chipset C/N₀ + satellite count |
| GPS spoofing detection | ✅ Working | Coordinate teleportation detection |
| Alarm fires with screen off | ✅ Working | Android foreground service (Kotlin) |
| Alarm fires without Flask/Python | ✅ Working | Kotlin reads sensor files directly |
| Adaptive local baseline | ✅ Working | 4h rolling p75, localStorage-persisted |
| In-app alarm mute (5 min) | ✅ Working | SILENCE button in alert bar |
| Arabic (RTL) | ✅ Working | Full translation + RTL layout |
| Farsi / Persian (RTL) | ✅ Working | Full translation + RTL layout |
| Ukrainian | ✅ Working | Full translation |
| Self-diagnostic screen | ✅ Working | Checks service, battery, GPS, permissions |
| Stealth cover UI | ✅ Working | Triple-tap title — shows fake battery app |
| 24h event log | ✅ Working | Local CSV, displayed in app |
| Low-power mode | ✅ Working | Halves sensor poll rate, ~50% less battery |
| Magnetometer / EMF detection | ✅ Working | Quiet banner, not alarm — avoids false positives |
| Probe / drone surveillance | ⚠️ Partial | Requires Raspberry Pi node in monitor mode |
| NTP clock drift | ⚠️ Display only | Not used for alarming — decorative |
| Mesh between Pi nodes | ❌ Not built | Roadmap item |

---

## The Honest Limitation — Conflict Zones with Persistent EW

**This matters and must be understood by anyone deploying this in Gaza, Lebanon, or Ukraine.**

In areas with persistent electronic warfare (GPS jamming/spoofing operating continuously), a fixed-threshold alarm is nearly useless. If the regional baseline is 65% jamming and the alarm fires at 70%, the alarm sounds all day every day and people start ignoring it.

### How v0.5.0 addresses this: Adaptive Baseline

The app now tracks a 4-hour rolling 75th-percentile of the local jam score and stores it in `localStorage` so it persists across restarts. The status subtitle shows:

- `+32% above local normal — significant escalation` → act on this
- `Within local normal (baseline 61%)` → this is the background environment, not a new event
- `calibrating… (8 min left)` → collecting data, needs 10 minutes on first install

The alarm itself still uses the absolute threshold (satellite count = 0 always fires) but the UI provides context to distinguish background EW from a new escalation event.

**What this still cannot do:**
- Predict a strike is imminent — it can only confirm jamming/spoofing intensity changed
- Distinguish routine IDF/Russian EW from pre-attack preparation
- Work reliably indoors with no sky view (GPS lock requires open sky)
- Run if the phone battery is dead (electricity is unreliable in conflict zones)
- Give advance warning — it warns when jamming starts, not before

---

## Installation

### Option A — APK direct install (recommended for field use)

1. On your Android phone go to **Settings → Apps → Special app access → Install unknown apps**
   Enable for your browser or file manager

2. Download `app-release.apk` from the [Releases](https://github.com/hade00752/aero-sigint/releases) page

3. Open the APK and tap **Install**

4. Grant **Location** permission when prompted (required for GPS monitoring)

5. Tap **Open** — monitoring starts immediately

**Test installs have been done via APKCombo installer** — this works fine as an alternative to direct APK install.

### Option B — APKCombo or similar sideload tools

Download the APK from Releases and open it with APKCombo installer or any sideload manager. Works identically.

### Option C — Build from source (Android Studio)

Requirements: Android Studio Hedgehog or later, JDK 17

```
git clone https://github.com/hade00752/aero-sigint
```

Open the project at `/BatteryHealth` in Android Studio. Connect your phone, enable USB debugging, and run.

To build a signed release APK for distribution:
**Build → Generate Signed Bundle/APK → APK → Create new keystore → release → Finish**

Store the `.jks` keystore file somewhere safe — it is the only way to publish future updates under the same identity.

---

## First-Use Setup (Critical)

After installing, do these once:

1. **Unrestrict battery** — tap the orange banner if it appears, or go to
   `Settings → Battery → Battery optimisation → All apps → Aero SIGINT → Unrestricted`
   Without this, Android will kill the service when the screen turns off.

2. **Test the alarm** — tap **TEST ALARM** on the dashboard to confirm your phone's alarm sound and vibration are working. The alarm uses the system alarm channel (same as your clock alarm), which should pierce Do Not Disturb.

3. **Go outside for 2 minutes** — the service needs a GPS lock to calibrate. Indoors with no fix, the jamming detection path via satellite count will show 0 even without jamming.

4. **Let the baseline calibrate** — in conflict zones, leave the app running for 10 minutes before trusting the adaptive baseline reading. It appears in the detail panel (tap the summary row to expand).

---

## Usage

### Dashboard

The main screen has three zones:

**Orb (centre top)**
- Blue pulsing = SAFE
- Orange = WARNING — interference present
- Red + alarm = ALERT — GPS signal unreliable, do not trust location

**Three threat cards**
- GPS Jamming — satellite signal strength (C/N₀) and count
- GPS Spoofing — coordinate jump distance from real baseline
- Drone Surveillance — probe request flood (Pi node only)

**Summary bar** — tap to expand the detail panel showing raw sensor values

**Alert ticker** — scrolls active alert descriptions in plain language in your chosen language

**SILENCE button** — appears in the alert bar during active alarm. Mutes the sound for 5 minutes. The visual warning stays on-screen. Sound re-arms automatically after 5 minutes if the threat persists.

### Language

Tap the language button in the top-right corner to cycle:
**EN → AR → FA → УКР → EN**

Arabic and Farsi use right-to-left layout automatically.

### Stealth mode

Triple-tap the **AERO·SIGINT** title in the top-left. The screen changes to a fake "Battery Health Optimizer" app with realistic stats. Triple-tap again to return. This is for situations where having this app visible could attract attention.

### Tabs

- **LIVE** — real-time dashboard
- **24H LOG** — timestamped list of all alert events from the last 24 hours
- **PATTERN** — heatmap of alert activity by hour over 24 hours
- **GUIDE** — field guide in your chosen language + system diagnostic check

---

## Architecture and Design Decisions

Understanding why things are built this way matters for anyone extending this.

### Why Android + Python (Chaquopy) instead of a pure native app

Python is used for all sensor fusion, scoring, and the Flask web server. Kotlin handles only what Android requires native code for: GPS chipset access, magnetometer, foreground service, audio. This split means:

- The detection logic can be read, audited, and modified by anyone who knows Python
- The same Python backend runs on a Raspberry Pi without any Android code
- NGOs and researchers can contribute without learning Android development

**The cost:** Chaquopy (the Python-in-Android bridge) adds ~30MB to the APK, Python startup takes 2–3 seconds, and `__file__` paths resolve to read-only APK assets so all file writes must use explicit `/data/data/com.aero.batteryhealth/files/` paths.

### Why a local Flask web server for the dashboard

The UI is a web page served by Flask at `http://127.0.0.1:8080` and loaded in an embedded Android WebView. This means:

- The same UI works in a browser on a Raspberry Pi — no code duplication
- Anyone on the same local WiFi network as a Pi node can open the dashboard on their phone without installing anything
- UI updates (translations, new sensors, layout changes) don't require rebuilding the APK — just restart the Python server

**The cost:** The WebView adds latency and the SSE (Server-Sent Events) connection occasionally drops, requiring reconnect logic.

### Why Kotlin writes sensor files instead of reading sensors in Python

Android does not allow Python to directly access GNSS chipset measurements or magnetometer sensors — these require the Android hardware API, which is only accessible from Java/Kotlin. Kotlin writes raw readings to small text files in `filesDir`:

```
mag_reading.txt        — magnetometer x,y,z,magnitude
gnss_cn0.txt           — average carrier-to-noise ratio of locked satellites
satellite_count.txt    — number of satellites currently locked
gps_fix.json           — lat/lon/accuracy from GPS
battery_unrestricted.txt — whether battery optimisation is disabled
mute_alarm.txt         — timestamp of last mute request (checked by Kotlin)
```

Python reads these files every 2 seconds. This file-based IPC is simple, debuggable, and survives Python restarts without losing the Kotlin sensor stream.

### Why the Kotlin alarm layer fires independently of Python

If Python crashes, Flask crashes, or the daemon gets killed by Android's memory manager, the Kotlin service continues reading `satellite_count.txt` directly and fires the alarm if satellite count hits zero. This means the alarm works even when the Python layer is completely dead.

The Kotlin service also checks `mute_alarm.txt` on each poll to handle the SILENCE button — it stops playing sound but keeps the notification visible.

### GPS spoofing detection — coordinate jump only

Early versions also detected zero-variance (static mock GPS) and NTP clock drift. Both were removed because:

- **Zero variance** — WiFi positioning from the same access point returns near-identical coordinates with accuracy < 50m, indistinguishable from mock GPS. Caused constant false positives indoors.
- **NTP clock drift** — initial implementation stored a static NTP timestamp; the delta grew by 2 every 2-second poll indefinitely. Fixed by storing the NTP offset (NTP time − local time) and computing current NTP time as `time.time() + offset`. But clock drift alone is not a reliable spoofing signal — it's kept for display only.

What remains: if your GPS position jumps more than 500 metres in a single reading compared to the stored real baseline (`last_coord.json`), the spoofing score increases proportionally. 25km jump = 50% score, 50km jump = 70%+ (CRITICAL). The baseline only updates for jumps under 5km — a large jump doesn't overwrite the real position.

**Known gap:** the baseline file can be poisoned if mock GPS was active when the app first ran. Solution: tap RESET GPS BASELINE in the guide tab if spoofing score shows 0% even with mock GPS active.

### GPS jamming detection — GNSS chipset measurements

The most reliable jamming signal is satellite count and C/N₀ (carrier-to-noise ratio) read directly from the GNSS chipset via Android's `GnssMeasurementsEvent` API. This is the same data GPS receiver manufacturers use internally. A real jammer causes C/N₀ to drop and satellites to drop out — this is the detection path.

Secondary path: if no GNSS measurements arrive (the callback stops firing), the satellite count file goes stale. Kotlin checks file age and treats a stale count as uncertain rather than zero.

**Indoors limitation:** indoors with no sky view, `satellite_count.txt` is zero on a normal day. The alarm will not fire from this alone — Kotlin requires both zero count AND a fresh file timestamp. But the jamming score displayed in the Python layer may show elevated values. The self-diagnostic will flag "GPS not locked — go outdoors for jamming detection."

### Adaptive baseline (conflict zones)

Documented extensively above. The p75 percentile is used rather than mean or median because in a conflict zone, the bottom 25% of readings might be during quiet periods (overnight ceasefires, etc.) and shouldn't drag the baseline down. p75 represents "a typical active period."

Floor is set at 25% so the baseline never becomes so low that a real first-time jamming event in a previously quiet area goes unalarmed.

### Why the alarm uses the system alarm ringtone

The alarm plays on `AudioManager.STREAM_ALARM` (the same stream as your clock alarm). This means:

- It respects the alarm volume slider, not the media or ringtone slider
- It can bypass Do Not Disturb when the notification channel has `setBypassDnd(true)` set
- It will play on Bluetooth headphones and external speakers if connected

If the alarm appears silent: check **Settings → Sound → Alarm volume**. It is independent of media volume.

---

## Sensor Fusion Logic

Scores are 0–100. DISTURBED fires at >30, CRITICAL fires at >70 or satellite count = 0.

```
Jam score = fused from:
  - GNSS C/N₀ drop below 25 dBHz
  - Satellite count drop (count=0 → instant CRITICAL from Kotlin layer)
  - WiFi SNR baseline deviation (fallback when no GNSS data)

Spoof score = from:
  - Coordinate jump distance (>500m → score scales with distance)
  - Baseline: last_coord.json (real position stored on first clean fix)

EMF score = from:
  - Magnetometer magnitude (>80µT anomaly, >120µT sends quiet notification)
  - EMF triggers banner only, not alarm — avoids constant false positives
    from laptops, microwaves, power cables

Probe score = from:
  - WiFi probe request flood (Pi node only, requires monitor mode NIC)
```

No single sensor triggers a full alarm. EMF is explicitly excluded from alarming because real-world testing showed magnetometers spike constantly near common household electronics.

---

## What This App Cannot Do

Be clear on these before deploying:

- **Cannot predict strikes.** It detects that jamming started. It cannot know what follows.
- **Cannot distinguish attacker intent.** Military EW, civilian interference, and a neighbour's faulty device can produce similar signals.
- **Cannot detect jamming indoors without GPS lock.** Most jamming detection requires the phone to have a satellite lock first to notice when it loses it.
- **Cannot work with a dead battery.** In areas with no electricity, phones die. The alarm cannot fire from a dead phone.
- **Cannot replace official emergency guidance.** If authorities issue evacuation orders, follow them regardless of what this app shows.
- **Cannot transmit or coordinate with other devices.** Each phone runs independently. There is no mesh, no central server, no shared alerts.
- **Cannot intercept communications or detect specific frequencies.** This is passive sensor reading, not radio surveillance.
- **Cannot detect jamming that started before the app was installed.** The baseline calibrates from the moment of first run.

---

## Running from Source (Desktop / Termux)

For development or Raspberry Pi deployment:

```bash
# Termux on Android
pkg install python git -y
git clone https://github.com/hade00752/aero-sigint
cd aero-sigint
pip install flask ntplib
SIGINT_ENV=android python3 -m backend.bridge.server &
SIGINT_ENV=android python3 -m backend.sensors.daemon
```

Open `http://127.0.0.1:8080` in any browser.

---

## Raspberry Pi Node

A Pi node extends capability — it can run in WiFi monitor mode to detect probe floods (drone surveillance), attach a hardware GPS module for NTP integrity checking, and serve the dashboard to multiple devices over LAN without anyone needing to install the app.

```bash
git clone https://github.com/hade00752/aero-sigint
cd aero-sigint
bash pi/setup.sh
sudo reboot
```

After reboot, dashboard at `http://sigint.local:8080` from any device on the same network.

**Pi adds:** probe flood detection, hardware GPS NTP integrity, fixed power (no battery concern), potential for external antenna.

**Pi does not add:** portability, cellular data, magnetometer (unless attached externally).

---

## Roadmap

In rough priority order. None of these are started unless marked.

### Near term
- **Service watchdog** — AlarmManager periodic check to restart SigintService if Android kills it silently. Currently if the service dies, no alert fires and the user doesn't know.
- **Indoor jamming detection** — when GPS lock is absent, use WiFi SNR trend over time as a proxy. Baseline established over first hour, alert on significant drop. Works inside buildings.
- **Spike notification** — when adaptive baseline detects a significant escalation (>25% above local normal), send a quiet notification even if the user has the phone in their pocket.

### Medium term
- **Burmese and Amharic translations** — documented need in Myanmar and Ethiopia/Tigray conflict zones.
- **F-Droid publication** — open source Android store, no Google account required. Higher trust for humanitarian orgs.
- **Baseline sharing (opt-in)** — anonymised baseline readings contributed voluntarily to a central map, letting new users in a region start with a pre-calibrated baseline rather than spending 10 minutes calibrating from scratch.

### Long term
- **Pi mesh networking** — multiple Pi nodes sharing alerts over local network, cross-validating events. A single phone might see a spike from a local interferer; three Pi nodes in different buildings seeing it simultaneously is much more significant.
- **SDR integration** — Software Defined Radio dongle on Pi for actual RF spectrum monitoring. Currently the app infers jamming from GPS receiver behaviour rather than seeing the jamming signal directly. SDR would allow frequency-specific detection and make the system significantly harder to fool.
- **Signal fingerprinting** — identifying the type of jammer (barrage vs spot vs swept) from C/N₀ patterns over time. Different jammer types indicate different operational contexts.

---

## Contributing

The codebase is intentionally simple. Python sensor logic is in `backend/sensors/`. The dashboard is a single HTML/CSS/JS app in `frontend/`. There is no build system for the frontend — edit the files and restart Flask.

Priority contributions:
- Testing on specific Android devices (sensor behaviour varies significantly between manufacturers)
- Translations — especially Burmese, Amharic, Kurdish, Pashto
- Improving indoor jamming detection (the hardest unsolved problem)
- Battery usage optimisation on low-end Android devices
- Documentation in Arabic and Farsi for non-technical field users

**No telemetry, no analytics, no accounts.** The app is self-contained. There is nothing to sign up for.

---

## Privacy

The app collects nothing and sends nothing.

- All sensor readings are processed on-device
- Event logs are written to local phone storage only
- No network connections are made except to `127.0.0.1` (localhost) and to NTP servers for time integrity checking (this can be disabled in `config.py`)
- The stealth UI cover is optional and purely local

---

## Legal

This app uses only publicly documented Android APIs. It does not:
- Intercept communications (illegal in most jurisdictions)
- Transmit on any frequency
- Access other users' data
- Require any special permissions beyond Location and (optionally) Nearby WiFi Devices

GPS and GNSS measurement access is a standard Android API available to any app granted Location permission.

**Using this app is legal in all jurisdictions we are aware of.** If you are in a jurisdiction where monitoring your own GPS signal quality is illegal, we would be surprised, but please verify locally.

---

## Contact and Distribution

- **GitHub:** [https://github.com/hade00752/aero-sigint](https://github.com/hade00752/aero-sigint)
- **APK:** See [Releases](https://github.com/hade00752/aero-sigint/releases)

For NGO or humanitarian organisation deployment, contact via GitHub issues. We can assist with:
- Custom builds (different app name/icon for specific operational contexts)
- Field testing support
- Translation verification by native speakers

Suggested organisations for first contact:
- **Access Now** — digital security for at-risk communities
- **Frontline Defenders** — security tools for human rights defenders
- **7amleh** — Palestinian digital rights (direct Gaza/West Bank community reach)
- **Airwaves / GPSJam researchers** — GPS spoofing data community

---

**License: GPL-3.0**

All code is open. If you improve this, the improvement stays open.
