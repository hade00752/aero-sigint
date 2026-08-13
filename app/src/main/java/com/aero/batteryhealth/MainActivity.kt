package com.aero.batteryhealth

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.provider.Settings
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

        webView.addJavascriptInterface(BatteryBridge(), "BatteryBridge")

        // Show a loading screen immediately so there is never a black screen.
        // Chaquopy first-run extraction can take 2+ minutes — this keeps the
        // user informed rather than staring at a blank display.
        handler.post {
            webView.loadData("""<!DOCTYPE html>
<html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<style>*{margin:0;padding:0;box-sizing:border-box}
body{background:#060d1a;color:#00c6ff;font-family:'Courier New',monospace;
display:flex;align-items:center;justify-content:center;height:100vh;
flex-direction:column;gap:14px;user-select:none}
.t{font-size:22px;font-weight:900;letter-spacing:.3em}
.s{font-size:10px;letter-spacing:.22em;opacity:.55}
.bar{width:160px;height:2px;background:rgba(0,198,255,.15);border-radius:2px;overflow:hidden;margin-top:8px}
.fill{height:100%;background:#00c6ff;border-radius:2px;animation:p 2s ease-in-out infinite alternate}
.note{font-size:8px;letter-spacing:.16em;opacity:.3;margin-top:4px;text-align:center;max-width:240px}
@keyframes p{0%{width:12%}100%{width:92%}}</style></head>
<body><div class="t">AERO·SIGINT</div>
<div class="s">INITIALIZING SENSORS</div>
<div class="bar"><div class="fill"></div></div>
<div class="note">First launch may take up to 2 minutes<br>while the app sets up offline components</div>
</body></html>""", "text/html", "UTF-8")
        }

        // Thread 1: start Python backend. main.py calls start_bridge() at module
        // level — Flask app.run() blocks here for the lifetime of the process.
        // getModule("main") therefore never returns, so waitForFlaskAndLoad()
        // must run on a separate thread, not chained after this call.
        Thread {
            try {
                Python.getInstance().getModule("main")
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }.start()

        // Thread 2: poll /health independently and load the WebView when ready.
        Thread {
            waitForFlaskAndLoad()
        }.start()
    }

    inner class BatteryBridge {
        @android.webkit.JavascriptInterface
        fun openBatterySettings() {
            try {
                startActivity(Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                    data = Uri.parse("package:$packageName")
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                })
            } catch (_: Exception) {
                try {
                    startActivity(Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS).apply {
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    })
                } catch (_: Exception) {}
            }
        }
    }

    private fun waitForFlaskAndLoad() {
        var attempts = 0
        while (attempts < 240) {  // 240 × 500ms = 120 s — enough for first-run Chaquopy pip install
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
