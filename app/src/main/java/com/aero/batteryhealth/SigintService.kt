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
import android.location.LocationManager
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

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        startForegroundWithNotification()
        startMagnetometer()
        startGnssMeasurements()
        startAlertMonitor()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        return START_STICKY
    }

    override fun onDestroy() {
        super.onDestroy()
        gnssCallback?.let { locationManager?.unregisterGnssMeasurementsCallback(it) }
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
                    if (cn0Values.isNotEmpty()) {
                        try {
                            File(filesDir, "gnss_cn0.txt").writeText(cn0Values.average().toString())
                        } catch (_: Exception) {}
                    }
                }
            }
            gnssCallback = cb
            lm.registerGnssMeasurementsCallback(cb, Handler(Looper.getMainLooper()))
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

    // ── Alert monitor — fires alarm when Python declares CRITICAL ─────────────

    private fun startAlertMonitor() {
        Thread {
            var alarmActive = false
            var tick = 0
            writeBatteryStatus()
            while (true) {
                if (tick++ % 30 == 0) writeBatteryStatus()  // recheck every 60 s
                try {
                    val conn = URL("http://127.0.0.1:8080/state").openConnection() as HttpURLConnection
                    conn.connectTimeout = 1000
                    conn.readTimeout = 1000
                    val body = conn.inputStream.bufferedReader().readText()
                    conn.disconnect()
                    val status = JSONObject(body).optString("status", "CLEAR")
                    if (status == "CRITICAL" && !alarmActive) {
                        fireAlarm()
                        alarmActive = true
                    } else if (status != "CRITICAL" && alarmActive) {
                        cancelAlarm()
                        alarmActive = false
                    }
                } catch (_: Exception) {
                    // Flask not up yet, or bridge unreachable — silent retry
                }
                Thread.sleep(2000)
            }
        }.also { it.isDaemon = true }.start()
    }

    private fun fireAlarm() {
        val channelId = "sigint_alarm"
        val nm = getSystemService(NotificationManager::class.java)
        val vibrationPattern = longArrayOf(0, 600, 200, 600, 200, 600)

        nm.createNotificationChannel(
            NotificationChannel(channelId, "SIGINT Alarm", NotificationManager.IMPORTANCE_MAX).apply {
                description = "GPS jamming / spoofing alert"
                enableVibration(true)
                setVibrationPattern(vibrationPattern)
                setBypassDnd(true)
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
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
            .setContentTitle("⚠ RF JAMMING DETECTED")
            .setContentText("GPS signal compromised — possible strike precursor. Seek cover.")
            .setSmallIcon(android.R.drawable.ic_dialog_alert)
            .setFullScreenIntent(pi, true)
            .setVibrate(vibrationPattern)
            .setOngoing(true)
            .setVisibility(Notification.VISIBILITY_PUBLIC)
            .setCategory(Notification.CATEGORY_ALARM)
            .build()

        nm.notify(2, notification)
    }

    private fun cancelAlarm() {
        getSystemService(NotificationManager::class.java).cancel(2)
    }
}
