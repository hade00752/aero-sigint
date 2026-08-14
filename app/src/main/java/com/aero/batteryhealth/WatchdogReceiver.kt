package com.aero.batteryhealth

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.SystemClock

class WatchdogReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        // startForegroundService is idempotent — if the service is running it just
        // calls onStartCommand again; if it died, this resurrects it.
        context.startForegroundService(Intent(context, SigintService::class.java))
        scheduleNext(context)
    }

    companion object {
        private const val ACTION = "com.aero.batteryhealth.WATCHDOG"
        private const val INTERVAL_MS = 5 * 60_000L

        fun scheduleNext(context: Context) {
            val am = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            val pi = pendingIntent(context)
            // setAndAllowWhileIdle fires even in Doze mode — critical for warzone use
            // where the phone may sit in a pocket for hours.
            am.setAndAllowWhileIdle(
                AlarmManager.ELAPSED_REALTIME_WAKEUP,
                SystemClock.elapsedRealtime() + INTERVAL_MS,
                pi
            )
        }

        fun cancel(context: Context) {
            val am = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            am.cancel(pendingIntent(context))
        }

        private fun pendingIntent(context: Context) = PendingIntent.getBroadcast(
            context, 0,
            Intent(context, WatchdogReceiver::class.java).setAction(ACTION),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }
}
