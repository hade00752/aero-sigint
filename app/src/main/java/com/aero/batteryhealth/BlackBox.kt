package com.aero.batteryhealth

import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

class BlackBox(filesDir: File) {

    private val logsDir = File(filesDir, "logs").also { it.mkdirs() }
    private var lastLogStatus = ""
    private var lastLogMs = 0L
    private val THROTTLE_MS = 30_000L
    private val dateFmt = SimpleDateFormat("yyyy-MM-dd", Locale.US).apply {
        timeZone = TimeZone.getTimeZone("UTC")
    }
    private val tsFmt = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US).apply {
        timeZone = TimeZone.getTimeZone("UTC")
    }

    fun log(reading: SensorReading, ts: String) {
        val status = reading.status
        if (status == "CLEAR") return
        val now = System.currentTimeMillis()
        if (status == lastLogStatus && now - lastLogMs < THROTTLE_MS) return
        lastLogStatus = status
        lastLogMs = now

        val date = dateFmt.format(Date())
        val f = File(logsDir, "events_$date.csv")
        if (!f.exists()) {
            f.writeText("ts,status,jam_score,fused_jam_score,spoof_score,probe_score,emf_confidence,alerts\n")
        }
        val alerts = reading.alerts.joinToString("|").replace(",", ";")
        f.appendText("$ts,$status,${reading.jamScore},${reading.fusedJamScore}," +
            "${reading.spoofScore},${reading.probeScore},${reading.emfConfidence},\"$alerts\"\n")
    }

    fun getLast24h(): JSONArray {
        val cutoffMs = System.currentTimeMillis() - 24 * 3_600_000L
        val result = JSONArray()
        logFiles().forEach { f ->
            try {
                f.readLines().drop(1).forEach { line ->
                    if (line.isBlank()) return@forEach
                    val parts = line.split(",", limit = 9)
                    if (parts.size < 7) return@forEach
                    val epochMs = try { tsFmt.parse(parts[0])?.time ?: 0L } catch (_: Exception) { 0L }
                    if (epochMs < cutoffMs) return@forEach
                    result.put(JSONObject().apply {
                        put("ts",             parts[0])
                        put("status",         parts[1])
                        put("jam_score",      parts[2].toIntOrNull() ?: 0)
                        put("fused_jam_score",parts[3].toIntOrNull() ?: 0)
                        put("spoof_score",    parts[4].toIntOrNull() ?: 0)
                        put("probe_score",    parts[5].toIntOrNull() ?: 0)
                        put("emf_confidence", parts[6].toIntOrNull() ?: 0)
                    })
                }
            } catch (_: Exception) {}
        }
        return result
    }

    fun getStats(): JSONObject {
        val events = getLast24h()
        var critical = 0; var disturbed = 0
        for (i in 0 until events.length()) {
            when (events.getJSONObject(i).optString("status")) {
                "CRITICAL"  -> critical++
                "DISTURBED" -> disturbed++
            }
        }
        return JSONObject().apply {
            put("critical_count",  critical)
            put("disturbed_count", disturbed)
            put("total_count",     events.length())
            put("period_hours",    24)
        }
    }

    private fun logFiles(): List<File> =
        logsDir.listFiles()
            ?.filter { it.name.startsWith("events_") && it.name.endsWith(".csv") }
            ?.sortedBy { it.name }
            ?: emptyList()
}
