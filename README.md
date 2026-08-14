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

**Requirements:** Android 8.0+ · No root required

---

## First Use

After installing, do these once:

1. **Grant location permission** — tap **Allow** when the app asks. Without this, no GPS or jamming detection is possible.

2. **Unrestrict battery** — tap the orange banner if it appears, or go to
   `Settings → Battery → Battery optimisation → Aero SIGINT → Unrestricted`
   Without this, Android kills the monitoring service when the screen turns off.

3. **Go outside and wait for GPS lock** — GPS requires open sky. The first satellite lock after a fresh install can take **2-5 minutes**. While acquiring, the Guide tab shows "No GPS fix yet — stay outdoors" — this is normal, not an error. Once locked, full jamming detection activates.

4. **Test the alarm** — tap **TEST ALARM** to confirm sound and vibration work before you need them.

5. **Let the baseline calibrate** — in high-interference areas, leave the app running for 10 minutes. It learns what is normal for your location so it can tell you when something changes.

---

## Key Features

**Adaptive Local Baseline**
In conflict zones where jamming is constant, a fixed alarm threshold becomes meaningless. Aero·SIGINT learns the local normal level of interference for your specific location and alerts you when the level escalates significantly above it.

**AGC Jamming Detection** *(Android 14+ only)*
Reads the GPS receiver's Automatic Gain Control. When a jammer floods the antenna, the receiver lowers gain — Aero·SIGINT detects this as the earliest possible jamming indicator, before satellite count drops.

**GNSS Silence Detection**
If the app had a working satellite lock and it suddenly goes dark (>10 seconds of no measurements), the jam score jumps to 90 immediately — jamming often kills all satellite contact at once.

**Accelerometer Contradiction Check**
If the phone is stationary (accelerometer shows no movement) but GPS suddenly jumps hundreds of metres, that contradiction strongly indicates spoofing rather than genuine movement.

**Cell Signal Corroboration**
Sudden LTE signal drop combined with GPS anomalies raises the confidence score — jammers often degrade cellular alongside GPS.

**Alarm That Works When You Need It**
The alarm fires even with the screen off, even if the app is in the background. A watchdog timer restarts the service if Android kills it, and it auto-starts on device reboot.

**SILENCE Button**
When the alarm fires, a SILENCE button appears on screen. Tap it to mute the sound for 5 minutes without dismissing the warning. The alert stays visible. Sound re-arms automatically if the threat continues.

**Stealth Cover**
Triple-tap the title to switch to a fake "Battery Health Optimizer" screen. Triple-tap again to return. For situations where having this app visible could attract attention.

**24-Hour Log and Pattern View**
Every alert event is logged locally with a timestamp. The Pattern tab shows a 24-hour heatmap of activity — useful for identifying recurring jamming windows.

**System Diagnostic**
The Guide tab runs a live system check: service running, battery unrestricted, GPS locked, location granted. Shows any issues at a glance.

**No Internet Required**
After installation, the app works completely offline. All detection happens on your phone.

---

## Troubleshooting

**Dashboard is blank / all zeros**

This is normal for the first 2-5 minutes after installation or after a reboot. The GPS needs time to acquire satellite lock. Steps to resolve:

1. Go outside with clear sky view
2. Wait up to 5 minutes — GPS cold start takes time
3. Check the Guide tab — it will show "No GPS fix yet" (blue info, not an error) while acquiring
4. Once the GPS locks, all sensor data appears immediately

If after 5 minutes outdoors the Guide tab still shows no service: go to `Settings → Apps → Aero SIGINT → Permissions` and confirm Location is set to "Allow all the time" or "Allow while using".

**"Location restricted" shown in Guide tab**

This was a known bug in versions before v0.5.1 — the diagnostic mistakenly used a browser geolocation API that always reports "denied" inside Android WebView, regardless of your actual permission setting. Update to the latest version to fix this.

**Alarm sounding in a known-safe area**

Tap the baseline area in the dashboard to reset the local baseline. High-jamming environments need ~10 minutes of ambient data before the adaptive baseline settles.

---

## Honest Limitations

- **Does not predict strikes.** It detects that jamming or spoofing started. It cannot know what follows.
- **Indoors, jamming detection is reduced.** GPS requires open sky. A phone indoors with no satellite lock cannot detect jamming through satellite signal loss.
- **AGC detection requires Android 14+.** On older Android, jamming detection still works through C/N₀ and satellite count, but AGC is not available.
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

## Privacy

The app collects nothing and sends nothing.

- All processing is on-device
- Event logs stay on local phone storage only
- No accounts, no registration, no analytics
- No outbound network connections of any kind

---

## Roadmap

- Indoor jamming detection without GPS lock
- Burmese, Amharic, Kurdish, and Pashto translations
- F-Droid publication — submitted, under review
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

## Contact

**Email:** haidarmahmood50@gmail.com

For NGO deployment, field testing, translation help, or any questions about the app — email directly. GitHub Issues also works for technical questions.

---

## Distribution and NGO Deployment

For humanitarian organisations interested in deploying this for field staff or affected communities — get in touch. We can assist with custom builds, field testing support, and translation verification.

Organisations already relevant to this work:
- [Access Now](https://accessnow.org) — digital security for at-risk communities
- [Frontline Defenders](https://frontlinedefenders.org) — security tools for human rights defenders
- [7amleh](https://7amleh.org) — Palestinian digital rights, direct Gaza/West Bank community reach
- [GPSJam](https://gpsjam.org) — GPS interference monitoring and research community

---

**License: GPL-3.0** · All improvements stay open.

[Releases](https://github.com/hade00752/aero-sigint/releases) · [Issues](https://github.com/hade00752/aero-sigint/issues) · [github.com/hade00752/aero-sigint](https://github.com/hade00752/aero-sigint)
