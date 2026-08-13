# Aero·SIGINT

### Civilian Electronic Warfare Early Warning

A passive early-warning app that detects GPS jamming, GPS spoofing, and nearby drone surveillance using sensors already built into any Android phone.

**No root. No internet. No data sent anywhere. Fully local.**

Designed for non-technical users in high-risk environments — conflict zones, border regions, and areas with documented electronic warfare activity.

---

## What It Detects

| Threat | What It Means |
|---|---|
| **GPS Jamming** | Satellite signals are being blocked — your location and navigation cannot be trusted |
| **GPS Spoofing** | Fake GPS signals are making your phone think it is somewhere else |
| **Drone Surveillance** | Unknown wireless devices are scanning the area nearby |
| **EMF Anomaly** | Unusual magnetic field detected — possible electronic interference source |

Alerts appear in plain language in your chosen language. No technical knowledge required to understand them.

---

## Languages

**English · العربية · فارسی · Українська**

Switch between all four from the top-right button. Arabic and Farsi use right-to-left layout automatically.

---

## Install

### From Releases (recommended)

1. On your Android phone: **Settings → Apps → Special app access → Install unknown apps → Allow**
2. Download `app-release.apk` from the [Releases](https://github.com/hade00752/aero-sigint/releases) page
3. Open the file and tap **Install**
4. Grant **Location** permission when prompted
5. Tap **Open** — monitoring starts immediately

Works with APKCombo installer or any sideload manager as an alternative.

**Requirements:** Android 8.0+ · No root required

---

## First Use

After installing, do these once:

1. **Unrestrict battery** — tap the orange banner if it appears, or go to
   `Settings → Battery → Battery optimisation → Aero SIGINT → Unrestricted`
   Without this, Android will kill the monitoring service when the screen turns off.

2. **Step outside for 2 minutes** — the app needs a GPS lock to calibrate. This only needs to happen once.

3. **Test the alarm** — tap **TEST ALARM** to confirm sound and vibration work before you need them.

4. **Let the baseline calibrate** — in high-interference areas, leave the app running for 10 minutes. It learns what is normal for your location so it can tell you when something changes.

---

## Key Features

**Adaptive Local Baseline**
In conflict zones where jamming is constant, a fixed alarm threshold becomes meaningless — the alarm would sound all day and people stop responding. Aero·SIGINT learns the local normal level of interference for your specific location and alerts you when the level escalates significantly above it. The dashboard shows you `+18% above local normal` rather than just a raw score.

**Alarm That Works When You Need It**
The alarm fires even with the screen off, even if the app is in the background, and even if the Python detection layer crashes — the Android service layer monitors sensors independently and sounds the alarm directly.

**SILENCE Button**
When the alarm fires, a SILENCE button appears on screen. Tap it to mute the sound for 5 minutes without dismissing the warning. The alert stays visible. Sound re-arms automatically if the threat continues.

**Stealth Cover**
Triple-tap the title to switch to a fake "Battery Health Optimizer" screen. Triple-tap again to return. For situations where having this app visible could attract attention.

**24-Hour Log and Pattern View**
Every alert event is logged locally with a timestamp. The Pattern tab shows a 24-hour heatmap of activity — useful for identifying recurring jamming windows.

**System Diagnostic**
The Guide tab runs a live system check: service running, battery unrestricted, GPS locked, location permission granted. Shows any issues at a glance.

**No Internet Required**
After installation, the app works completely offline. All detection happens on your phone.

---

## Honest Limitations

- **Does not predict strikes.** It detects that jamming or spoofing started. It cannot know what follows.
- **Indoors, jamming detection is reduced.** GPS requires open sky. A phone indoors with no satellite lock cannot detect jamming through satellite signal loss.
- **Baseline takes 10 minutes to calibrate** after first install or after moving to a new location.
- **Cannot work with a dead battery.** In areas without reliable electricity, keep the phone charged.
- **Cannot replace official emergency guidance.** If authorities issue evacuation orders, follow them regardless of what this app shows.
- **Probe/drone detection requires a Raspberry Pi node** in WiFi monitor mode. The Android app alone cannot detect this threat category.

---

## Raspberry Pi Node

A Pi node extends the system — detecting drone probe floods, sharing the dashboard over local WiFi to multiple devices without anyone needing to install the app.

```bash
git clone https://github.com/hade00752/aero-sigint
cd aero-sigint
bash pi/setup.sh
sudo reboot
```

Dashboard available at `http://sigint.local:8080` from any device on the same network after reboot.

---

## Running from Source (Termux / Desktop)

```bash
pkg install python git -y
git clone https://github.com/hade00752/aero-sigint
cd aero-sigint
pip install flask ntplib
SIGINT_ENV=android python3 -m backend.bridge.server &
SIGINT_ENV=android python3 -m backend.sensors.daemon
```

Open `http://127.0.0.1:8080` in any browser.

---

## Privacy

The app collects nothing and sends nothing.

- All processing is on-device
- Event logs stay on local phone storage only
- No accounts, no registration, no analytics
- The only outbound connection is to NTP servers for time integrity checking (optional, can be disabled)

---

## Roadmap

- Indoor jamming detection without GPS lock
- Service watchdog to restart automatically if Android kills the background service
- Burmese, Amharic, Kurdish, and Pashto translations
- F-Droid publication (open source app store — no Google account required)
- Opt-in anonymised baseline sharing so users in a region start with a pre-calibrated baseline
- Pi mesh networking — multiple nodes cross-validating events

---

## Contributing

Contributions welcome in:

- **Testing** — sensor behaviour varies between Android manufacturers; real-device logs are valuable
- **Translations** — especially Burmese, Amharic, Kurdish, Pashto
- **Indoor jamming detection** — the hardest unsolved problem
- **Field reports** — documented real-world behaviour in active conflict zones

---

## Distribution and NGO Deployment

For humanitarian organisations interested in deploying this for field staff or affected communities — open a GitHub issue or reach out directly. We can assist with custom builds, field testing support, and translation verification.

Organisations already relevant to this work:
- [Access Now](https://accessnow.org) — digital security for at-risk communities
- [Frontline Defenders](https://frontlinedefenders.org) — security tools for human rights defenders
- [7amleh](https://7amleh.org) — Palestinian digital rights, direct Gaza/West Bank community reach
- [GPSJam](https://gpsjam.org) — GPS interference monitoring and research community

---

**License: GPL-3.0** · All improvements stay open.

[Releases](https://github.com/hade00752/aero-sigint/releases) · [Issues](https://github.com/hade00752/aero-sigint/issues) · [github.com/hade00752/aero-sigint](https://github.com/hade00752/aero-sigint)
