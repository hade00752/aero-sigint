package com.aero.batteryhealth

import android.content.Context
import fi.iki.elonen.NanoHTTPD
import fi.iki.elonen.NanoHTTPD.IHTTPSession
import fi.iki.elonen.NanoHTTPD.Method
import fi.iki.elonen.NanoHTTPD.Response
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.io.PipedInputStream
import java.io.PipedOutputStream
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

// ── Shared state — written by fusion loop, read by HTTP server ─────────────────

object SensorState {
    @Volatile var latest: SensorReading = SensorReading()
    @Volatile var batteryUnrestricted: Boolean? = null

    private val historyLock = Any()
    private val _history = ArrayDeque<SensorReading>()
    val historySnapshot: List<SensorReading> get() = synchronized(historyLock) { _history.toList() }

    private val sseLock = Any()
    private val sseWriters = mutableListOf<PipedOutputStream>()

    fun addSseWriter(os: PipedOutputStream) = synchronized(sseLock) { sseWriters.add(os) }

    fun publish(reading: SensorReading, ts: String) {
        latest = reading
        synchronized(historyLock) {
            if (_history.size >= 500) _history.removeFirst()
            _history.addLast(reading)
        }
        val json = reading.toJson(ts)
        json.put("battery_unrestricted", batteryUnrestricted ?: JSONObject.NULL)
        val data = "data: $json\n\n".toByteArray(Charsets.UTF_8)
        val snapshot = synchronized(sseLock) { sseWriters.toList() }
        val dead = mutableListOf<PipedOutputStream>()
        snapshot.forEach { os ->
            try { os.write(data); os.flush() }
            catch (_: Exception) { dead.add(os) }
        }
        if (dead.isNotEmpty()) synchronized(sseLock) { sseWriters.removeAll(dead.toSet()) }
    }
}

// ── NanoHTTPD server replacing Flask ──────────────────────────────────────────

class SigintHttpServer(
    private val context: Context,
    private val filesDir: File,
    private val blackBox: BlackBox,
    private val onResetGps: () -> Unit,
) : NanoHTTPD("127.0.0.1", 8080) {

    private val tsFmt = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US).apply {
        timeZone = TimeZone.getTimeZone("UTC")
    }

    private fun nowTs() = tsFmt.format(Date())

    override fun serve(session: IHTTPSession): Response {
        val uri  = session.uri.trimEnd('/')
        val meth = session.method

        return when {
            uri == "" || uri == "/index.html"     -> asset("frontend/templates/index.html", MIME_HTML)
            uri.startsWith("/static/")            -> staticAsset(uri)
            uri == "/stream"                      -> sseResponse()
            uri == "/state"                       -> stateResponse()
            uri == "/history"                     -> historyResponse()
            uri == "/health"                      -> json("{\"status\":\"ok\"}")
            uri == "/logs/events"                 -> json(blackBox.getLast24h().toString())
            uri == "/logs/stats"                  -> json(blackBox.getStats().toString())
            uri == "/lowpower"  && meth == Method.POST -> handleLowPower(session)
            uri == "/test-alarm" && meth == Method.POST -> handleTestAlarm()
            uri == "/mute-alarm" && meth == Method.POST -> handleMuteAlarm()
            uri == "/reset-gps-baseline" && meth == Method.POST -> handleResetGps()
            else -> notFound()
        }
    }

    // ── /stream — Server-Sent Events ──────────────────────────────────────────

    private fun sseResponse(): Response {
        val pipeOut = PipedOutputStream()
        val pipeIn  = PipedInputStream(pipeOut, 4096)
        SensorState.addSseWriter(pipeOut)
        // Send current state immediately so the dashboard doesn't wait 2s
        try {
            val init = "data: ${SensorState.latest.toJson(nowTs())}\n\n"
            pipeOut.write(init.toByteArray(Charsets.UTF_8))
            pipeOut.flush()
        } catch (_: Exception) {}
        val resp = newChunkedResponse(Response.Status.OK, "text/event-stream; charset=utf-8", pipeIn)
        resp.addHeader("Cache-Control", "no-cache")
        resp.addHeader("X-Accel-Buffering", "no")
        resp.addHeader("Access-Control-Allow-Origin", "*")
        return resp
    }

    // ── /state ────────────────────────────────────────────────────────────────

    private fun stateResponse(): Response {
        val r   = SensorState.latest
        val obj = r.toJson(nowTs())
        obj.put("battery_unrestricted", SensorState.batteryUnrestricted ?: JSONObject.NULL)
        return json(obj.toString())
    }

    // ── /history ──────────────────────────────────────────────────────────────

    private fun historyResponse(): Response {
        val ts   = nowTs()
        val arr  = JSONArray()
        SensorState.historySnapshot.takeLast(120).forEach { arr.put(it.toJson(ts)) }
        return json(arr.toString())
    }

    // ── Command endpoints ─────────────────────────────────────────────────────

    private fun handleLowPower(session: IHTTPSession): Response {
        val body = readBody(session)
        val enable = try { JSONObject(body).optBoolean("enabled", false) } catch (_: Exception) { false }
        File(filesDir, "low_power.txt").writeText(enable.toString())
        return json("{\"ok\":true,\"low_power\":$enable}")
    }

    private fun handleTestAlarm(): Response {
        File(filesDir, "test_alarm.txt").writeText("1")
        return json("{\"ok\":true}")
    }

    private fun handleMuteAlarm(): Response {
        File(filesDir, "mute_alarm.txt").writeText(System.currentTimeMillis().toString())
        return json("{\"ok\":true,\"muted_until\":${System.currentTimeMillis() + 5 * 60_000L}}")
    }

    private fun handleResetGps(): Response {
        onResetGps()
        return json("{\"ok\":true}")
    }

    // ── Static asset serving from APK assets ─────────────────────────────────

    private fun asset(assetPath: String, mime: String): Response {
        return try {
            val stream = context.assets.open(assetPath)
            val resp = newChunkedResponse(Response.Status.OK, mime, stream)
            resp.addHeader("Access-Control-Allow-Origin", "*")
            resp
        } catch (_: Exception) {
            notFound()
        }
    }

    private fun staticAsset(uri: String): Response {
        // /static/css/dashboard.css → frontend/static/css/dashboard.css
        val assetPath = "frontend$uri"
        val mime = when {
            uri.endsWith(".css")  -> "text/css; charset=utf-8"
            uri.endsWith(".js")   -> "text/javascript; charset=utf-8"
            uri.endsWith(".png")  -> "image/png"
            uri.endsWith(".ico")  -> "image/x-icon"
            uri.endsWith(".woff2")-> "font/woff2"
            else                  -> "application/octet-stream"
        }
        return asset(assetPath, mime)
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private fun json(body: String): Response {
        val resp = newFixedLengthResponse(Response.Status.OK, "application/json; charset=utf-8", body)
        resp.addHeader("Access-Control-Allow-Origin", "*")
        return resp
    }

    private fun notFound() = newFixedLengthResponse(Response.Status.NOT_FOUND, MIME_PLAINTEXT, "404")

    private fun readBody(session: IHTTPSession): String {
        return try {
            val len = session.headers["content-length"]?.toLongOrNull() ?: 0L
            if (len <= 0L) return ""
            val buf = ByteArray(len.toInt())
            session.inputStream.read(buf)
            String(buf, Charsets.UTF_8)
        } catch (_: Exception) { "" }
    }

    companion object {
        private const val MIME_HTML = "text/html; charset=utf-8"
    }
}
