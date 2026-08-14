package com.aero.batteryhealth

import android.location.Location
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import kotlin.math.*

// ── Sensor reading ────────────────────────────────────────────────────────────

data class SensorReading(
    // RF / GNSS
    val jamScore: Int = 0,
    val agcScore: Int = 0,
    val cn0: Double? = null,
    val agcDb: Double? = null,
    val gnssSilent: Boolean = false,   // GNSS went dark after having an active fix
    // Spoofing
    val spoofScore: Int = 0,
    val timeDelta: Double = 0.0,
    val coordJumpM: Double = 0.0,
    val accelVariance: Double = 0.0,   // near-zero → phone is stationary
    // Probe flood
    val probeScore: Int = 0,
    val probeCount: Int = 0,
    // Magnetometer
    val emfConfidence: Int = 0,
    val emfSource: String = "NONE",
    val magnitudeUt: Double? = null,
    val peakUt: Double? = null,
    val varianceUt2: Double? = null,
    // Cell signal corroboration
    val cellRsrp: Int? = null,
    val cellDrop: Int = 0,
    // GPS position
    val gpsLat: Double? = null,
    val gpsLon: Double? = null,
    val gpsAccuracy: Double? = null,
) {
    val fusedJamScore: Int get() {
        // GNSS silence after an active fix — total lock loss, most definitive signal
        if (gnssSilent) return 90

        val base = maxOf(jamScore, agcScore)
        if (base == 0) return 0
        // Extreme score (e.g. sat count = 0) bypasses all gates
        if (base >= 80) return base

        // EMF gate — military jammers operate at distance so no EMF at the handset.
        // Without corroboration we halve to avoid false positives from dead zones.
        val emfFactor = when {
            emfConfidence >= 40 -> 1.0
            emfConfidence >= 15 -> 0.4 + 0.6 * (emfConfidence / 40.0)
            else -> 0.5
        }
        // Simultaneous cell-band degradation lifts the EMF penalty — a jammer that
        // suppresses GPS and LTE simultaneously is almost certainly military hardware.
        val effective = if (cellDrop >= 12) minOf(1.0, emfFactor + 0.3) else emfFactor
        return min(100, (base * effective).toInt())
    }

    val status: String get() {
        val fj = fusedJamScore
        if (spoofScore >= 50 || probeScore >= 70) return "CRITICAL"
        if (fj >= 70) return "CRITICAL"
        if (fj >= 40 || spoofScore >= 20 || probeScore >= 40) return "DISTURBED"
        return "CLEAR"
    }

    val alerts: List<String> get() {
        val out = mutableListOf<String>()
        val fj = fusedJamScore

        if (gnssSilent) {
            out.add("GNSS DARK — Satellite lock lost after active fix")
        }

        if (fj >= 40 || (jamScore >= 40 && emfSource == "PASSIVE_LOSS")) {
            val cn0Str = cn0?.let { "%.1f".format(it) } ?: "?"
            val cellNote = if (cellDrop >= 12) " + cell degraded ${cellDrop}dB" else ""
            when (emfSource) {
                "ACTIVE_SUPPRESSION" -> out.add("RF JAMMING + EMF — Active suppression ($cn0Str dBHz$cellNote)")
                "PASSIVE_LOSS"       -> out.add("SIGNAL LOSS — Passive (tunnel/building) ($cn0Str dBHz)")
                else                 -> out.add("RF JAMMING — C/N0 suppressed ($cn0Str dBHz$cellNote)")
            }
        }

        if (agcScore >= 40 && fj < 40) {
            val agcStr = agcDb?.let { "%.1f".format(it) } ?: "?"
            out.add("AGC DROP — Receiver flooded ($agcStr dBHz)")
        }

        if (emfConfidence >= 60 && fj < 40) {
            val ut = magnitudeUt?.let { "%.0f".format(it) } ?: "?"
            out.add("EMF ANOMALY — High-field source nearby ($ut uT)")
        }

        if (coordJumpM > 500) {
            val note = if (accelVariance < 0.15 && accelVariance > 0.0) " (device stationary)" else ""
            out.add("TELEPORT — ${"%.0f".format(coordJumpM)}m jump detected$note")
        }

        if (probeScore >= 70) {
            out.add("PROBE FLOOD — Possible drone surveillance")
        }

        return out
    }

    fun toJson(ts: String): JSONObject = JSONObject().apply {
        put("status",           status)
        put("jam_score",        jamScore)
        put("agc_score",        agcScore)
        put("fused_jam_score",  fusedJamScore)
        put("gnss_silent",      gnssSilent)
        put("spoof_score",      spoofScore)
        put("probe_score",      probeScore)
        put("emf_confidence",   emfConfidence)
        put("emf_source",       emfSource)
        put("magnitude_ut",     magnitudeUt ?: JSONObject.NULL)
        put("peak_ut",          peakUt ?: JSONObject.NULL)
        put("variance_ut2",     varianceUt2 ?: JSONObject.NULL)
        put("cn0",              cn0?.let { "%.1f".format(it).toDouble() } ?: JSONObject.NULL)
        put("agc",              agcDb?.let { "%.1f".format(it).toDouble() } ?: JSONObject.NULL)
        put("cell_rsrp",        cellRsrp ?: JSONObject.NULL)
        put("cell_drop",        cellDrop)
        put("accel_variance",   "%.3f".format(accelVariance).toDouble())
        put("time_delta",       timeDelta)
        put("coord_jump_m",     coordJumpM)
        put("probe_count",      probeCount)
        put("gps_locked",       gpsLat != null)
        put("gps_lat",          gpsLat?.let { "%.4f".format(it).toDouble() } ?: JSONObject.NULL)
        put("gps_lon",          gpsLon?.let { "%.4f".format(it).toDouble() } ?: JSONObject.NULL)
        put("battery_unrestricted", JSONObject.NULL)
        put("ts",               ts)
        val arr = JSONArray()
        alerts.forEach { arr.put(it) }
        put("alerts", arr)
    }
}

// ── Radio scoring (ported from radio.py) ─────────────────────────────────────

class RadioScorer(filesDir: File) {

    private val baselineFile = File(filesDir, "baseline.json")
    private var cn0Baseline: Double = 38.0
    private val baselineSamples = mutableListOf<Double>()
    private var prevCn0: Double? = null
    private val BASELINE_SAMPLES = 8
    // Suppresses scoring until the local baseline is established from real readings.
    // The hardcoded default (38 dBHz) is open-sky quality — it produces false positives
    // in urban environments (London, etc.) where normal C/N₀ is 28-35 dBHz.
    private var baselineReady = false

    // AGC baseline — tracks normal receiver gain; drops when antenna is flooded
    private var agcBaseline: Double? = null
    private val agcSamples = mutableListOf<Double>()

    init { loadBaseline() }

    private fun loadBaseline() {
        try {
            val d = JSONObject(baselineFile.readText())
            cn0Baseline = d.getDouble("cn0_baseline")
            agcBaseline = d.optDouble("agc_baseline").takeIf { !it.isNaN() }
            baselineReady = true  // saved baseline is already calibrated
        } catch (_: Exception) {}
    }

    private fun saveBaseline() {
        try {
            val d = JSONObject().put("cn0_baseline", cn0Baseline)
            agcBaseline?.let { d.put("agc_baseline", it) }
            baselineFile.writeText(d.toString())
        } catch (_: Exception) {}
    }

    fun score(cn0: Double, satCount: Int?): Int {
        if (satCount == 0) { prevCn0 = cn0; return 100 }

        if (cn0 > 25.0) {
            baselineSamples.add(cn0)
            if (baselineSamples.size >= BASELINE_SAMPLES) {
                cn0Baseline = baselineSamples.average()
                baselineSamples.clear()
                baselineReady = true
                saveBaseline()
            }
        }

        // Hold scoring at 0 until enough real readings have calibrated the baseline.
        // Prevents false positives from the default 38 dBHz open-sky assumption firing
        // in urban or indoor environments.
        if (!baselineReady) { prevCn0 = cn0; return 0 }

        var s = 0
        val drop = cn0Baseline - cn0
        if (drop > 6.0) s += min(60, (drop * 5).toInt())

        prevCn0?.let { prev ->
            // Require a large sudden drop AND the reading to be well below baseline
            // before adding onset score — urban multipath can cause 15 dBHz swings
            // as the phone moves around a building corner.
            val onset = prev - cn0
            if (onset > 20.0 && cn0 < (cn0Baseline - 10.0)) {
                s = min(100, s + (onset * 2).toInt())
            }
        }
        prevCn0 = cn0
        return min(100, s)
    }

    // AGC (Automatic Gain Control) — available on Android 14+ Samsung/Qualcomm.
    // Jammer floods the antenna; receiver lowers gain → AGC level drops sharply.
    fun scoreAgc(agcDb: Double): Int {
        if (agcDb.isNaN() || agcDb.isInfinite()) return 0
        val baseline = agcBaseline
        if (baseline == null) {
            agcSamples.add(agcDb)
            if (agcSamples.size >= 5) {
                agcBaseline = agcSamples.average()
                agcSamples.clear()
                saveBaseline()
            }
            return 0
        }
        val drop = baseline - agcDb
        return if (drop > 8.0) min(70, (drop * 3).toInt()) else 0
    }
}

// ── Spoofing / coordinate teleportation (ported from time_integrity.py) ──────

class SpoofScorer(private val filesDir: File) {

    private val baselineFile = File(filesDir, "last_coord.json")
    private var lastCoord: Pair<Double, Double>? = null

    init { loadBaseline() }

    private fun loadBaseline() {
        try {
            val d = JSONObject(baselineFile.readText())
            lastCoord = Pair(d.getDouble("lat"), d.getDouble("lon"))
        } catch (_: Exception) {}
    }

    private fun saveBaseline(lat: Double, lon: Double) {
        try {
            baselineFile.writeText(
                JSONObject().put("lat", lat).put("lon", lon)
                    .put("ts", System.currentTimeMillis() / 1000.0).toString()
            )
        } catch (_: Exception) {}
    }

    fun deleteBaseline() {
        try { baselineFile.delete() } catch (_: Exception) {}
        lastCoord = null
    }

    private fun haversine(lat1: Double, lon1: Double, lat2: Double, lon2: Double): Double {
        val R = 6_371_000.0
        val ph1 = Math.toRadians(lat1); val ph2 = Math.toRadians(lat2)
        val dph = Math.toRadians(lat2 - lat1)
        val dlm = Math.toRadians(lon2 - lon1)
        val a = sin(dph / 2).pow(2) + cos(ph1) * cos(ph2) * sin(dlm / 2).pow(2)
        return R * 2 * atan2(sqrt(a), sqrt(1 - a))
    }

    fun check(location: Location?): Pair<Double, Int> {
        if (location == null) return Pair(0.0, 0)
        // Accuracy > 100m means the phone is using cell/WiFi fallback or has a
        // very poor GPS fix (typical indoors). Position can jump 50-300m randomly
        // as towers change — that's noise, not spoofing. Skip the check entirely
        // so we neither score nor corrupt the baseline with bad positions.
        if (location.accuracy > 100f) return Pair(0.0, 0)
        val lat = location.latitude
        val lon = location.longitude
        val jump = lastCoord?.let { (la, lo) -> haversine(la, lo, lat, lon) } ?: 0.0
        if (lastCoord == null || jump < 5_000) {
            lastCoord = Pair(lat, lon)
            saveBaseline(lat, lon)
        }
        val score = if (jump > 500.0) min(70, (jump / 500).toInt()) else 0
        return Pair(jump, score)
    }
}

// ── Magnetometer scoring (ported from magnetometer.py) ───────────────────────

data class MagResult(val confidence: Int, val source: String, val variance: Double, val peak: Double)

class MagScorer {

    private val window = ArrayDeque<Double>(30)
    private var consecSpikes = 0
    private var consecVariance = 0

    fun update(magnitude: Double): MagResult {
        if (window.size >= 30) window.removeFirst()
        window.addLast(magnitude)

        val mean     = window.average()
        val variance = window.map { (it - mean).pow(2) }.average()
        val peak     = window.maxOrNull() ?: magnitude

        if (peak > 110.0) consecSpikes++ else consecSpikes = 0
        if (variance > 80.0) consecVariance++ else consecVariance = 0

        var confidence = 0
        if (consecSpikes >= 3)   confidence += min(60, ((peak - 110.0) * 1.2).toInt())
        if (consecVariance >= 4) confidence += min(40, ((variance - 80.0) * 0.3).toInt())
        confidence = min(100, confidence)

        val inNormal = mean in 20.0..70.0
        val source = when {
            confidence >= 40 -> "ACTIVE_SUPPRESSION"
            !inNormal        -> "PASSIVE_LOSS"
            else             -> "NONE"
        }

        return MagResult(confidence, source, variance, peak)
    }
}
