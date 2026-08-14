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
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import android.telephony.CellSignalStrengthLte
import android.telephony.PhoneStateListener
import android.telephony.SignalStrength
import android.telephony.TelephonyCallback
import android.telephony.TelephonyManager
import org.json.JSONObject
import java.io.File
import java.io.IOException
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import kotlin.math.*

class SigintService : Service(), SensorEventListener {

    // ── Hardware handles ──────────────────────────────────────────────────────

    private var sensorManager: SensorManager? = null
    private var magnetometer: Sensor? = null
    private var accelerometer: Sensor? = null
    private var locationManager: LocationManager? = null
    private var gnssCallback: GnssMeasurementsEvent.Callback? = null

    // ── Sensor readings — written by hardware callbacks, read by fusion loop ──

    @Volatile private var latestMagMagnitude: Double? = null
    @Volatile private var latestLocation: Location? = null
    @Volatile private var latestCn0: Double? = null
    @Volatile private var latestSatCount: Int? = null
    @Volatile private var latestAgc: Double? = null
    @Volatile private var lastGnssUpdateMs: Long = 0L
    @Volatile private var gnssEverActive: Boolean = false
    @Volatile private var gnssRegistered: Boolean = false

    // Accelerometer variance — written by onSensorChanged, read by fusion loop
    @Volatile private var latestAccelVariance: Double = 0.0
    private val accelWindow = ArrayDeque<Double>(30)
    private val accelLock = Any()

    // Cell signal — written by telephony callback, read by fusion loop
    @Volatile private var latestCellRsrp: Int? = null
    @Volatile private var cellBaseline: Int? = null
    private val cellBaselineSamples = mutableListOf<Int>()
    private val cellLock = Any()

    // ── Scorers / logging ─────────────────────────────────────────────────────

    private lateinit var radioScorer: RadioScorer
    private lateinit var spoofScorer: SpoofScorer
    private lateinit var magScorer: MagScorer
    private lateinit var blackBox: BlackBox
    private lateinit var httpServer: SigintHttpServer

    // ── Alarm state ───────────────────────────────────────────────────────────

    private var alarmPlayer: MediaPlayer? = null
    private var testAlarmUntil = 0L
    private var currentLowPower = false

    private val tsFmt = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US).apply {
        timeZone = TimeZone.getTimeZone("UTC")
    }
    private fun nowTs() = tsFmt.format(Date())

    private val locationListener = object : LocationListener {
        override fun onLocationChanged(location: Location) {
            latestLocation = location
        }
    }

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        radioScorer = RadioScorer(filesDir)
        spoofScorer = SpoofScorer(filesDir)
        magScorer   = MagScorer()
        blackBox    = BlackBox(filesDir)
        httpServer  = SigintHttpServer(this, filesDir, blackBox) {
            spoofScorer.deleteBaseline()
        }

        startForegroundWithNotification()
        startSensors()
        startGnssMeasurements()
        startCellMonitor()

        try { httpServer.start() } catch (e: IOException) { e.printStackTrace() }

        startFusionLoop()
        startAlertMonitor()
        startLowPowerMonitor()

        // Watchdog — reschedule each time the service starts so the alarm chain
        // is always live even if the previous alarm was consumed without firing.
        WatchdogReceiver.scheduleNext(this)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        // Retry GNSS registration if the first attempt failed (e.g. service started
        // before the user granted location permission on first install).
        if (!gnssRegistered &&
            checkSelfPermission(android.Manifest.permission.ACCESS_FINE_LOCATION)
                == android.content.pm.PackageManager.PERMISSION_GRANTED) {
            startGnssMeasurements()
        }
        return START_STICKY
    }

    override fun onDestroy() {
        super.onDestroy()
        try { httpServer.stop() } catch (_: Exception) {}
        gnssCallback?.let { locationManager?.unregisterGnssMeasurementsCallback(it) }
        locationManager?.removeUpdates(locationListener)
        sensorManager?.unregisterListener(this)
    }

    // ── Foreground notification ───────────────────────────────────────────────

    private fun startForegroundWithNotification() {
        val channelId = "sigint_service"
        val nm = getSystemService(NotificationManager::class.java)
        nm.createNotificationChannel(
            NotificationChannel(channelId, "Battery Health Service", NotificationManager.IMPORTANCE_LOW)
        )
        startForeground(1,
            Notification.Builder(this, channelId)
                .setContentTitle("Battery Health Optimizer")
                .setContentText("Background optimization active")
                .setSmallIcon(android.R.drawable.ic_menu_preferences)
                .setOngoing(true)
                .build()
        )
    }

    // ── Sensors — magnetometer + accelerometer ────────────────────────────────

    private fun startSensors() {
        val sm = getSystemService(Context.SENSOR_SERVICE) as SensorManager
        sensorManager = sm
        magnetometer  = sm.getDefaultSensor(Sensor.TYPE_MAGNETIC_FIELD)
        accelerometer = sm.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
        magnetometer?.let  { sm.registerListener(this, it, SensorManager.SENSOR_DELAY_NORMAL) }
        accelerometer?.let { sm.registerListener(this, it, SensorManager.SENSOR_DELAY_NORMAL) }
    }

    override fun onSensorChanged(event: SensorEvent) {
        when (event.sensor.type) {
            Sensor.TYPE_MAGNETIC_FIELD -> {
                val x = event.values[0].toDouble()
                val y = event.values[1].toDouble()
                val z = event.values[2].toDouble()
                latestMagMagnitude = sqrt(x * x + y * y + z * z)
            }
            Sensor.TYPE_ACCELEROMETER -> {
                val x = event.values[0].toDouble()
                val y = event.values[1].toDouble()
                val z = event.values[2].toDouble()
                val mag = sqrt(x * x + y * y + z * z)
                synchronized(accelLock) {
                    if (accelWindow.size >= 30) accelWindow.removeFirst()
                    accelWindow.addLast(mag)
                    if (accelWindow.size >= 5) {
                        val mean = accelWindow.average()
                        latestAccelVariance = accelWindow.map { (it - mean).pow(2) }.average()
                    }
                }
            }
        }
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}

    // ── GNSS C/N₀ + AGC via chipset measurements API ─────────────────────────

    private fun startGnssMeasurements() {
        try {
            val lm = getSystemService(Context.LOCATION_SERVICE) as LocationManager
            locationManager = lm
            val cb = object : GnssMeasurementsEvent.Callback() {
                override fun onGnssMeasurementsReceived(event: GnssMeasurementsEvent) {
                    val locked = event.measurements
                        .filter { it.state and GnssMeasurement.STATE_CODE_LOCK != 0 }
                        .mapNotNull { m -> m.cn0DbHz.takeIf { it > 0.0 } }
                    latestSatCount = locked.size
                    if (locked.isNotEmpty()) latestCn0 = locked.average()
                    lastGnssUpdateMs = System.currentTimeMillis()
                    gnssEverActive = true

                    // AGC available on Android 14+ (API 34). When a jammer floods the
                    // antenna the receiver lowers its gain — AGC level drops sharply.
                    // This is detectable even indoors and before C/N₀ fully collapses.
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                        val agcValues = event.measurements.mapNotNull { m ->
                            @Suppress("NewApi")
                            m.automaticGainControlLevelDb
                                .takeIf { !it.isNaN() && !it.isInfinite() }
                        }
                        if (agcValues.isNotEmpty()) latestAgc = agcValues.average()
                    }
                }
            }
            gnssCallback = cb
            lm.registerGnssMeasurementsCallback(cb, Handler(Looper.getMainLooper()))
            lm.requestLocationUpdates(LocationManager.GPS_PROVIDER, 2000L, 0f, locationListener)
            gnssRegistered = true  // only reached if both calls above succeed
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    // ── Cell signal (LTE RSRP) — corroborates RF jamming ─────────────────────
    // A jammer suppressing GPS-band often bleeds into LTE. Simultaneous cell
    // degradation + GPS degradation significantly increases confidence.

    private fun startCellMonitor() {
        try {
            val tm = getSystemService(Context.TELEPHONY_SERVICE) as TelephonyManager
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                tm.registerTelephonyCallback(mainExecutor,
                    object : TelephonyCallback(), TelephonyCallback.SignalStrengthsListener {
                        override fun onSignalStrengthsChanged(ss: SignalStrength) =
                            updateCellSignal(ss)
                    })
            } else {
                @Suppress("DEPRECATION")
                tm.listen(object : PhoneStateListener() {
                    @Suppress("DEPRECATION")
                    override fun onSignalStrengthsChanged(ss: SignalStrength) =
                        updateCellSignal(ss)
                }, PhoneStateListener.LISTEN_SIGNAL_STRENGTHS)
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun updateCellSignal(ss: SignalStrength) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return
        val rsrp = ss.cellSignalStrengths
            .filterIsInstance<CellSignalStrengthLte>()
            .firstOrNull()
            ?.rsrp
            ?.takeIf { it != Int.MIN_VALUE }
            ?: return
        latestCellRsrp = rsrp
        synchronized(cellLock) {
            if (cellBaseline == null && rsrp > -100) {
                cellBaselineSamples.add(rsrp)
                if (cellBaselineSamples.size >= 5) {
                    cellBaseline = cellBaselineSamples.average().toInt()
                    cellBaselineSamples.clear()
                }
            }
        }
    }

    // ── Sensor fusion loop ────────────────────────────────────────────────────

    private fun startFusionLoop() {
        Thread {
            while (true) {
                val pollMs = if (currentLowPower) 10_000L else 2_000L

                // ① RF jamming — C/N₀ score
                // 60s stale threshold: urban environments (buildings, tunnels) can
                // interrupt GPS for 10-30s without any jamming. 60s means a real
                // blanket jammer (which kills GPS instantly and completely) is still
                // detected quickly, while brief city-canyon dropouts are ignored.
                val gnssStale  = System.currentTimeMillis() - lastGnssUpdateMs > 60_000L
                val cn0        = if (gnssStale) null else latestCn0
                val satCount   = if (gnssStale) null else latestSatCount
                val jamScore   = cn0?.let { radioScorer.score(it, satCount) } ?: 0

                // ② AGC score (Android 14+ only; 0 on older devices)
                val agcDb    = latestAgc
                val agcScore = agcDb?.let { radioScorer.scoreAgc(it) } ?: 0

                // ③ GNSS silence — had a fix, now gone
                val gnssSilent = gnssEverActive && gnssStale

                // ④ Spoofing — coordinate teleportation
                val loc = latestLocation
                val (jump, baseSpoofScore) = spoofScorer.check(loc)
                // Accelerometer contradiction: GPS claims movement but device is
                // physically stationary → strong spoof indicator, works indoors
                val accelVar = latestAccelVariance
                val deviceStationary = accelVar in 0.001..0.15
                val spoofScore = if (deviceStationary && jump in 50.0..4_999.0) {
                    maxOf(baseSpoofScore, min(75, 35 + (jump / 100).toInt()))
                } else baseSpoofScore

                // ⑤ Magnetometer
                val mag      = latestMagMagnitude?.let { magScorer.update(it) }
                val emfConf  = mag?.confidence ?: 0
                val emfSrc   = mag?.source     ?: "NONE"
                val variance = mag?.variance   ?: 0.0
                val peak     = mag?.peak

                // ⑥ Cell signal corroboration
                val cellRsrp = latestCellRsrp
                val cellDrop = cellBaseline?.let { base ->
                    cellRsrp?.let { curr -> maxOf(0, base - curr) } ?: 0
                } ?: 0

                val reading = SensorReading(
                    jamScore      = jamScore,
                    agcScore      = agcScore,
                    cn0           = cn0,
                    agcDb         = agcDb,
                    gnssSilent    = gnssSilent,
                    spoofScore    = spoofScore,
                    coordJumpM    = jump,
                    accelVariance = accelVar,
                    emfConfidence = emfConf,
                    emfSource     = emfSrc,
                    varianceUt2   = variance,
                    magnitudeUt   = latestMagMagnitude,
                    peakUt        = peak,
                    cellRsrp      = cellRsrp,
                    cellDrop      = cellDrop,
                    gpsLat        = loc?.latitude,
                    gpsLon        = loc?.longitude,
                    gpsAccuracy   = loc?.accuracy?.toDouble(),
                )

                val ts = nowTs()
                SensorState.publish(reading, ts)
                blackBox.log(reading, ts)

                Thread.sleep(pollMs)
            }
        }.also { it.isDaemon = true }.start()
    }

    // ── Battery optimisation status ───────────────────────────────────────────

    private fun writeBatteryStatus() {
        val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
        SensorState.batteryUnrestricted = pm.isIgnoringBatteryOptimizations(packageName)
    }

    // ── Low power mode monitor ────────────────────────────────────────────────

    private fun startLowPowerMonitor() {
        Thread {
            while (true) {
                Thread.sleep(60_000L)
                val lp = isLowPowerMode()
                if (lp != currentLowPower) {
                    currentLowPower = lp
                    adjustGpsInterval(lp)
                    adjustSensorRate(lp)
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

    private fun adjustSensorRate(lowPower: Boolean) {
        try {
            val sm = sensorManager ?: return
            val rate = if (lowPower) 2_000_000 else SensorManager.SENSOR_DELAY_NORMAL
            magnetometer?.let  { sm.unregisterListener(this, it); sm.registerListener(this, it, rate) }
            accelerometer?.let { sm.unregisterListener(this, it); sm.registerListener(this, it, rate) }
        } catch (_: Exception) {}
    }

    // ── Mute check ────────────────────────────────────────────────────────────

    private fun isAlarmMuted(): Boolean = try {
        val f = File(filesDir, "mute_alarm.txt")
        f.exists() && System.currentTimeMillis() - f.lastModified() < 5 * 60_000L
    } catch (_: Exception) { false }

    // ── Alert monitor ─────────────────────────────────────────────────────────

    private fun startAlertMonitor() {
        Thread {
            var alarmActive = false
            var tick = 0
            writeBatteryStatus()
            while (true) {
                val pollMs = if (currentLowPower) 10_000L else 2_000L
                if (tick++ % (if (currentLowPower) 6 else 30) == 0) writeBatteryStatus()

                val testFile = File(filesDir, "test_alarm.txt")
                if (testFile.exists()) {
                    testFile.delete()
                    testAlarmUntil = System.currentTimeMillis() + 8_000L
                }
                val testActive = System.currentTimeMillis() < testAlarmUntil

                val isCritical = testActive || SensorState.latest.status == "CRITICAL"
                when {
                    isCritical && !alarmActive -> { fireAlarm(); alarmActive = true }
                    isCritical && alarmActive -> {
                        if (isAlarmMuted()) stopAlarmSound()
                        else if (alarmPlayer == null || alarmPlayer?.isPlaying == false) playAlarmSound()
                    }
                    !isCritical && alarmActive -> { cancelAlarm(); alarmActive = false }
                }
                Thread.sleep(pollMs)
            }
        }.also { it.isDaemon = true }.start()
    }

    // ── Alarm / notification ──────────────────────────────────────────────────

    private fun fireAlarm() {
        val channelId = "sigint_alarm_v3"
        val nm = getSystemService(NotificationManager::class.java)
        val vibPattern = longArrayOf(0, 800, 200, 800, 200, 800)
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
                setVibrationPattern(vibPattern)
                setBypassDnd(true)
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
                setSound(alarmUri, audioAttr)
            }
        )

        val pi = PendingIntent.getActivity(
            this, 0,
            Intent(this, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            },
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        nm.notify(2,
            Notification.Builder(this, channelId)
                .setContentTitle("GPS Signal Alert")
                .setContentText("Strong interference detected. Do not rely on GPS location.")
                .setSmallIcon(android.R.drawable.ic_dialog_alert)
                .setFullScreenIntent(pi, true)
                .setVibrate(vibPattern)
                .setSound(alarmUri)
                .setOngoing(true)
                .setVisibility(Notification.VISIBILITY_PUBLIC)
                .setCategory(Notification.CATEGORY_ALARM)
                .build()
        )
        playAlarmSound()
    }

    private fun playAlarmSound() {
        try {
            stopAlarmSound()
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
