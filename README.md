
# Aero·SIGINT — Civilian Electronic Warfare Early Warning System

A passive early-warning system that detects RF jamming, GPS spoofing, and nearby surveillance activity using a standard Android phone or a Raspberry Pi node.

Designed for non-technical users in high-risk environments.
No data collection. No transmission. Fully local.

---

## Installation (APK)

**Requirements**

* Android 8.0+ (API 26)
* No root required

**Steps**

1. Enable unknown app installs
   `Settings → Apps → Special app access → Install unknown apps → Allow`

2. Download the APK
   From the **Releases** section of this repository

3. Install
   Open the `.apk` → **Install** → **Open**

4. Grant permissions

   * Location (required for GPS monitoring)

---

## Usage

* The app starts monitoring immediately after launch
* Runs continuously in the background (persistent notification required by Android)
* Works with screen off

**Open dashboard**

* Tap the app icon

**Stealth mode**

* Triple-tap the top-left title

---

## Quick Overview

The system detects:

* **RF Jamming** — suppression of radio / GPS signals
* **GPS Spoofing** — falsified location data
* **Device/Drone Scanning** — abnormal probe request activity

Alerts are shown in plain language (e.g. *“Radio signals are being jammed”*).

---

## Running from Source (Termux)

```bash
# Install Termux + Termux:API (via F-Droid)

pkg install python git termux-api -y

git clone https://github.com/hade00752/aero-sigint
cd aero-sigint

pip install flask ntplib

# Optional alias
echo "alias sigint='pkill -f backend 2>/dev/null; sleep 1; cd ~/aero-sigint && SIGINT_ENV=android python3 -m backend.bridge.server & sleep 1 && SIGINT_ENV=android python3 -m backend.sensors.daemon'" >> ~/.zshrc

source ~/.zshrc
sigint
```

Open:

```
http://127.0.0.1:8080
```

---

## Raspberry Pi Node

A single node can serve nearby devices over WiFi.

**Basic setup**

```bash
git clone https://github.com/hade00752/aero-sigint
cd aero-sigint
bash pi/setup.sh
sudo reboot
```

After reboot:

```
http://sigint.local:8080
```

No app install required for connected devices.

---

## Detection Capabilities

| Threat Type       | Method                         | Platform          |
| ----------------- | ------------------------------ | ----------------- |
| RF Jamming        | WiFi signal baseline deviation | Android           |
| EMF anomaly       | Magnetometer spikes            | Android           |
| GPS spoofing      | Coordinate inconsistency       | Android           |
| Time manipulation | GNSS vs NTP drift              | Pi + GPS module   |
| Surveillance      | Probe request analysis         | Pi (monitor mode) |

---

## How It Works (High Level)

```
Sensors → Fusion Engine → UDP Broadcast → Local Server → Web Dashboard
```

* Multiple sensors reduce false positives
* Alerts require corroboration (no single-sensor panic)
* Events logged locally (CSV)

---

## What This Is Not

* Does **not** intercept communications
* Does **not** transmit signals
* Does **not** require internet
* Does **not** send data anywhere

This is a passive, local monitoring tool.

---

## Project Goal

Make electronic warfare awareness accessible to civilians.

Short term:

* Direct APK distribution (WhatsApp, Telegram, etc.)

Mid term:

* NGO partnerships

Long term:

* Distributed mesh of Pi nodes validating events across regions

---

## Contributing

Priority areas:

* Android device testing (sensor calibration)
* Translations (Arabic, Ukrainian, Burmese, Amharic)
* Native GNSS measurements (Android)
* Mesh networking between nodes
* Battery optimisation

License: **GPL-3.0**

---

## Contact

* GitHub: [https://github.com/hade00752/aero-sigint](https://github.com/hade00752/aero-sigint)
