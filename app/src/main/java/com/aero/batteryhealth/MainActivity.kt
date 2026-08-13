package com.aero.batteryhealth

import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.webkit.GeolocationPermissions
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity
import com.chaquo.python.Python
import com.chaquo.python.android.AndroidPlatform
import java.net.HttpURLConnection
import java.net.URL

class MainActivity : AppCompatActivity() {

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
                android.Manifest.permission.BODY_SENSORS,
                "android.permission.HIGH_SAMPLING_RATE_SENSORS"
            )
            val missing = perms.filter {
                checkSelfPermission(it) != android.content.pm.PackageManager.PERMISSION_GRANTED
            }.toTypedArray()
            if (missing.isNotEmpty()) requestPermissions(missing, 1001)
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
        // Without this override, setGeolocationEnabled(true) is ignored — the
        // browser geolocation API returns PERMISSION_DENIED and GPS timestamps
        // never reach Python, making time-integrity detection permanently dead.
        webView.webChromeClient = object : WebChromeClient() {
            override fun onGeolocationPermissionsShowPrompt(
                origin: String, callback: GeolocationPermissions.Callback
            ) {
                callback.invoke(origin, true, false)
            }
        }

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
}
