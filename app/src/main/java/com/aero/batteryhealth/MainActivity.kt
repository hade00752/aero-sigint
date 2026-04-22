package com.aero.batteryhealth

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity
import com.chaquo.python.Python
import com.chaquo.python.android.AndroidPlatform
import java.net.HttpURLConnection
import java.net.URL
import kotlin.math.sqrt

class MainActivity : AppCompatActivity(), SensorEventListener {

    private lateinit var sensorManager: SensorManager
    private var magnetometer: Sensor? = null
    private lateinit var webView: WebView
    private val handler = Handler(Looper.getMainLooper())

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        startForegroundService(Intent(this, SigintService::class.java))

        if (!Python.isStarted()) {
            Python.start(AndroidPlatform(this))
        }

        // Request permissions on first launch
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
            val perms = arrayOf(
                android.Manifest.permission.ACCESS_FINE_LOCATION,
                android.Manifest.permission.ACCESS_COARSE_LOCATION,
                android.Manifest.permission.BODY_SENSORS
            )
            val missing = perms.filter {
                checkSelfPermission(it) != android.content.pm.PackageManager.PERMISSION_GRANTED
            }.toTypedArray()
            if (missing.isNotEmpty()) requestPermissions(missing, 1001)
        }


        sensorManager = getSystemService(Context.SENSOR_SERVICE) as SensorManager
        magnetometer = sensorManager.getDefaultSensor(Sensor.TYPE_MAGNETIC_FIELD)
        magnetometer?.let {
            sensorManager.registerListener(this, it, SensorManager.SENSOR_DELAY_NORMAL)
        }

        webView = WebView(this)
        setContentView(webView)
        webView.clearCache(true)
        webView.clearHistory()

        val settings: WebSettings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.setGeolocationEnabled(true)
        settings.mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
        settings.cacheMode = WebSettings.LOAD_NO_CACHE
        webView.webViewClient = WebViewClient()

        // Start Python backend then wait for Flask
        Thread {
            try {
                Python.getInstance().getModule("main")
            } catch (e: Exception) {
                e.printStackTrace()
            }
            waitForFlaskAndLoad()
        }.start()
    }

    private fun waitForFlaskAndLoad() {
        var attempts = 0
        while (attempts < 60) {
            try {
                val conn = URL("http://127.0.0.1:8080/health").openConnection() as HttpURLConnection
                conn.connectTimeout = 500
                conn.readTimeout = 500
                val code = conn.responseCode
                conn.disconnect()
                if (code == 200) {
                    handler.post {
                        webView.clearCache(true)
                        webView.clearHistory()
                        webView.loadUrl("http://127.0.0.1:8080?t=" + System.currentTimeMillis())
                    }
                    return
                }
            } catch (e: Exception) {
                // not ready yet
            }
            Thread.sleep(500)
            attempts++
        }
        // fallback - try anyway
        handler.post {
            webView.clearCache(true)
            webView.clearHistory()
            webView.loadUrl("http://127.0.0.1:8080?t=" + System.currentTimeMillis())
        }
    }

    override fun onSensorChanged(event: SensorEvent) {
        if (event.sensor.type == Sensor.TYPE_MAGNETIC_FIELD) {
            val x = event.values[0]
            val y = event.values[1]
            val z = event.values[2]
            val magnitude = sqrt((x * x + y * y + z * z).toDouble()).toFloat()
            try {
                val file = java.io.File(filesDir, "mag_reading.txt")
                file.writeText("$x,$y,$z,$magnitude")
            } catch (e: Exception) {}
        }
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}

    override fun onResume() {
        super.onResume()
        magnetometer?.let {
            sensorManager.registerListener(this, it, SensorManager.SENSOR_DELAY_NORMAL)
        }
        if (::webView.isInitialized) {
            webView.reload()
        }
    }
}