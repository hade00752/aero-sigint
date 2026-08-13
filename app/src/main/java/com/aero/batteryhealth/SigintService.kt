package com.aero.batteryhealth

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.location.GnssMeasurement
import android.location.GnssMeasurementsEvent
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.media.AudioAttributes
import android.media.AudioManager
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.net.Uri
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import kotlin.math.sqrt
import org.json.JSONObject
import java.io.File
import java.net.HttpURLConnection
import java.net.URL

class SigintService : Service(), SensorEventListener {

    private var locationManager: LocationManager? = null
    private var gnssCallback: GnssMeasurementsEvent.Callback? = null
    private var sensorManager: SensorManager? = null
    private var magnetometer: Sensor? = null

    // Keeps GPS chipset alive so GnssMeasurementsEvent.Callback receives data.
    private val locationListener = object : LocationListener {
        override fun onLocationChanged(location: Location) {}
    }

    private var currentLowPower = false
    private var alarmPlayer: MediaPlayer? = null
    private var testAlarmUntil = 0L
    private var emfBannerSentAt = 0L

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        startForegroundWithNotification()
        startMagnetometer()
        startGnssMeasurements()
        startAlertMonitor()
        startLowPowerMonitor()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        return START_STICKY
    }

    override fun onDestroy() {
        super.onDestroy()
        gnssCallback?.let { locationManager?.unregisterGnssMeasurementsCallback(it) }
        locationManager?.removeUpdates(locationListener)
        sensorManager?.unregisterListener(this)
    }

    // ── Foreground service notification (keeps process alive) ─────────────────

    private fun startForegroundWithNotification() {
        val channelId = "sigint_service"
        val nm = getSystemService(NotificationManager::class.java)
        nm.createNotificationChannel(
            NotificationChannel(channelId, "Battery Health Service", NotificationManager.IMPORTANCE_LOW)
        )
        val notification = Notification.Builder(this, channelId)
            .setContentTitle("Battery Health Optimizer")
            .setContentText("Background optimization active")
            .setSmallIcon(android.R.drawable.ic_menu_preferences)
            .setOngoing(true)
            .build()
        startForeground(1, notification)
    }

    // ── Magnetometer — runs in service so it works with screen off ────────────
    // Activity-registered sensors die when Android destroys the activity (screen
    // off, low memory). Service-registered sensors survive until the service is
    // killed. Writes the same mag_reading.txt that Python's magnetometer.py reads,
    // keeping the EMF anti-false-alarm gate alive regardless of screen state.

    private fun startMagnetometer() {
        val sm = getSystemService(Context.SENSOR_SERVICE) as SensorManager
        sensorManager = sm
        val mag = sm.getDefaultSensor(Sensor.TYPE_MAGNETIC_FIELD)
        magnetometer = mag
        if (mag != null) {
            sm.registerListener(this, mag, SensorManager.SENSOR_DELAY_NORMAL)
        }
    }

    override fun onSensorChanged(event: SensorEvent) {
        if (event.sensor.type == Sensor.TYPE_MAGNETIC_FIELD) {
            val x = event.values[0]
            val y = event.values[1]
            val z = event.values[2]
            val magnitude = sqrt((x * x + y * y + z * z).toDouble()).toFloat()
            try {
                File(filesDir, "mag_reading.txt").writeText("$x,$y,$z,$magnitude")
            } catch (_: Exception) {}
        }
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}

    // ── GNSS C/N₀ via chipset measurements API (no root, no Termux) ──────────
    // Writes average carrier-to-noise ratio of locked satellites to gnss_cn0.txt.
    // Python's RadioSensor reads this as its highest-priority C/N₀ source,
    // replacing the WiFi SNR fallback that doesn't respond to GPS-band jamming.

    private fun startGnssMeasurements() {
        try {
            val lm = getSystemService(Context.LOCATION_SERVICE) as LocationManager
            locationManager = lm
            val cb = object : GnssMeasurementsEvent.Callback() {
                override fun onGnssMeasurementsReceived(event: GnssMeasurementsEvent) {
                    val cn0Values = event.measurements
                        .filter { it.state and GnssMeasurement.STATE_CODE_LOCK != 0 }
                        .mapNotNull { m -> m.cn0DbHz.takeIf { it > 0.0 } }
                    try {
                        // Always write count — zero means complete lock loss,
                        // the most definitive jamming signature available.
                        File(filesDir, "satellite_count.txt").writeText(cn0Values.size.toString())
                        if (cn0Values.isNotEmpty()) {
                            File(filesDir, "gnss_cn0.txt").writeText(cn0Values.average().toString())
                        }
                    } catch (_: Exception) {}
                }
            }
            gnssCallback = cb
            lm.registerGnssMeasurementsCallback(cb, Handler(Looper.getMainLooper()))
            // Keep chipset awake — measurements only flow while a location request is active
            lm.requestLocationUpdates(LocationManager.GPS_PROVIDER, 2000L, 0f, locationListener)
        } catch (e: Exception) {
            // SecurityException if location permission not yet granted — Python
            // falls through to dumpsys wifi until the permission is granted.
            e.printStackTrace()
        }
    }

    // ── Alert monitor — fires alarm when Python declares CRITICAL ─────────────
    // Polls /state every 2 s. Alarm fires once on transition to CRITICAL and
    // clears when status drops back. Full-screen intent wakes the locked screen.

    // ── Battery optimisation status ───────────────────────────────────────────
    // Writes battery_unrestricted.txt so Python's /state endpoint can surface
    // it to the dashboard. Checked once at startup and every 60 s thereafter.

    private fun writeBatteryStatus() {
        val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
        val unrestricted = pm.isIgnoringBatteryOptimizations(packageName)
        try {
            File(filesDir, "battery_unrestricted.txt").writeText(unrestricted.toString())
        } catch (_: Exception) {}
    }

    // ── Low power mode monitor ────────────────────────────────────────────────
    // Checks low_power.txt every 60s. When the mode changes it re-registers
    // the GPS provider and magnetometer at a slower rate to save battery.

    private fun startLowPowerMonitor() {
        Thread {
            while (true) {
                Thread.sleep(60_000L)
                val lp = isLowPowerMode()
                if (lp != currentLowPower) {
                    currentLowPower = lp
                    adjustGpsInterval(lp)
                    adjustMagnetometerRate(lp)
                }
            }
        }.also { it.isDaemon = true }.start()
    }

    private fun isLowPowerMode(): Boolean = try {
        File(filesDir, "low_power.txt").readText().trim() == "true"
    } catch (_: Exception) { false }

    private fun adjustGpsInterval(lowPower: Boolean) {
        try {
            val lm = locationManager ?: return
            lm.removeUpdates(locationListener)
            lm.requestLocationUpdates(
                LocationManager.GPS_PROVIDER,
                if (lowPower) 15_000L else 2_000L,
                0f, locationListener
            )
        } catch (_: Exception) {}
    }

    private fun adjustMagnetometerRate(lowPower: Boolean) {
        try {
            val sm = sensorManager ?: return
            val mag = magnetometer ?: return
            sm.unregisterListener(this, mag)
            sm.registerListener(this, mag,
                if (lowPower) 2_000_000 else SensorManager.SENSOR_DELAY_NORMAL)
        } catch (_: Exception) {}
    }

    // ── Direct sensor file check (no Flask / Python dependency) ──────────────
    // Only satellite count == 0 warrants a full alarm without Flask confirmation.
    // Magnetometer spikes alone are NOT alarmed — a laptop or microwave would
    // trigger constantly. EMF gets a quiet banner via checkEMFAnomaly() instead.

    private fun checkDirectCritical(): Boolean {
        return try {
            val f = File(filesDir, "satellite_count.txt")
            System.currentTimeMillis() - f.lastModified() < 15_000L &&
                f.readText().trim().toIntOrNull() == 0
        } catch (_: Exception) { false }
    }

    // Returns the magnetometer magnitude if it looks like a real anomaly (>120 µT),
    // null otherwise. Used to send a quiet informational banner, not an alarm.
    private fun checkEMFAnomaly(): Float? {
        return try {
            val f = File(filesDir, "mag_reading.txt")
            if (System.currentTimeMillis() - f.lastModified() > 15_000L) return null
            val mag = f.readText().trim().split(",").getOrNull(3)?.toFloatOrNull()
            if (mag != null && mag > 120f) mag else null
        } catch (_: Exception) { null }
    }

    private fun sendEMFBanner(magnitudeUt: Float) {
        val channelId = "sigint_emf"
        val nm = getSystemService(NotificationManager::class.java)
        nm.createNotificationChannel(
            NotificationChannel(channelId, "Field Monitor", NotificationManager.IMPORTANCE_DEFAULT).apply {
                description = "Unusual field and signal alerts"
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
                setSound(null, null)
            }
        )
        val notification = Notification.Builder(this, channelId)
            .setContentTitle("Unusual Magnetic Field")
            .setContentText("Strong field nearby (${magnitudeUt.toInt()} µT) — interference source detected")
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setAutoCancel(true)
            .build()
        nm.notify(3, notification)
    }

    // ── Alert monitor ─────────────────────────────────────────────────────────
    // Polls every 2s (10s in low-power). Also checks sensor files directly so
    // alarms fire even if Flask / Python are not running.

    private fun startAlertMonitor() {
        Thread {
            var alarmActive = false
            var tick = 0
            writeBatteryStatus()
            while (true) {
                val lowPower = isLowPowerMode()
                val pollMs = if (lowPower) 10_000L else 2_000L
                if (tick++ % (if (lowPower) 6 else 30) == 0) writeBatteryStatus()

                // Test alarm: set a timed window so the alarm plays for 8s before
                // auto-cancelling. Without this the loop immediately calls cancelAlarm()
                // because isCritical is false on the very next iteration.
                val testFile = File(filesDir, "test_alarm.txt")
                if (testFile.exists()) {
                    testFile.delete()
                    testAlarmUntil = System.currentTimeMillis() + 8_000L
                }
                val testActive = System.currentTimeMillis() < testAlarmUntil

                // EMF anomaly → quiet banner only, not an alarm
                val emfMag = checkEMFAnomaly()
                if (emfMag != null && System.currentTimeMillis() - emfBannerSentAt > 120_000L) {
                    sendEMFBanner(emfMag)
                    emfBannerSentAt = System.currentTimeMillis()
                }

                val directCritical = checkDirectCritical()
                var flaskCritical = false
                try {
                    val conn = URL("http://127.0.0.1:8080/state").openConnection() as HttpURLConnection
                    conn.connectTimeout = 1000
                    conn.readTimeout = 1000
                    val body = conn.inputStream.bufferedReader().readText()
                    conn.disconnect()
                    flaskCritical = JSONObject(body).optString("status", "CLEAR") == "CRITICAL"
                } catch (_: Exception) {}

                val isCritical = testActive || directCritical || flaskCritical
                if (isCritical && !alarmActive) {
                    fireAlarm(); alarmActive = true
                } else if (!isCritical && alarmActive) {
                    cancelAlarm(); alarmActive = false
                }
                Thread.sleep(pollMs)
            }
        }.also { it.isDaemon = true }.start()
    }

    private fun fireAlarm() {
        // Channel ID is versioned — Android caches channel settings permanently on
        // first creation and ignores subsequent changes. Bumping the ID forces a
        // fresh channel with sound + DND bypass baked in from the first install.
        val channelId = "sigint_alarm_v3"
        val nm = getSystemService(NotificationManager::class.java)
        val vibrationPattern = longArrayOf(0, 800, 200, 800, 200, 800)

        // Delete stale channel versions so they don't clutter system settings
        nm.deleteNotificationChannel("sigint_alarm")
        nm.deleteNotificationChannel("sigint_alarm_v2")

        val alarmUri: Uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
            ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
            ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)

        val audioAttr = AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_ALARM)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build()

        nm.createNotificationChannel(
            NotificationChannel(channelId, "SIGINT Alarm", NotificationManager.IMPORTANCE_MAX).apply {
                description = "GPS jamming / spoofing alert"
                enableVibration(true)
                setVibrationPattern(vibrationPattern)
                setBypassDnd(true)
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
                setSound(alarmUri, audioAttr)
            }
        )

        val launchIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val pi = PendingIntent.getActivity(
            this, 0, launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = Notification.Builder(this, channelId)
            .setContentTitle("⚠ GPS JAMMING DETECTED")
            .setContentText("GPS signal compromised — seek cover now.")
            .setSmallIcon(android.R.drawable.ic_dialog_alert)
            .setFullScreenIntent(pi, true)
            .setVibrate(vibrationPattern)
            .setSound(alarmUri)
            .setOngoing(true)
            .setVisibility(Notification.VISIBILITY_PUBLIC)
            .setCategory(Notification.CATEGORY_ALARM)
            .build()

        nm.notify(2, notification)
        playAlarmSound()
    }

    private fun playAlarmSound() {
        try {
            stopAlarmSound()

            // Request audio focus on the ALARM stream — without this Android
            // silences the sound regardless of volume settings.
            val am = getSystemService(Context.AUDIO_SERVICE) as AudioManager
            @Suppress("DEPRECATION")
            am.requestAudioFocus(null, AudioManager.STREAM_ALARM, AudioManager.AUDIOFOCUS_GAIN_TRANSIENT)

            val uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
                ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
                ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)

            alarmPlayer = MediaPlayer().apply {
                setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build()
                )
                setDataSource(applicationContext, uri)
                isLooping = true
                prepare()
                start()
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun stopAlarmSound() {
        try { alarmPlayer?.stop(); alarmPlayer?.release(); alarmPlayer = null } catch (_: Exception) {}
    }

    private fun cancelAlarm() {
        stopAlarmSound()
        getSystemService(NotificationManager::class.java).cancel(2)
    }
}
