package com.aero.batteryhealth

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.os.IBinder

class SigintService : Service() {

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        val channelId = "sigint_service"
        val nm = getSystemService(NotificationManager::class.java)
        val channel = NotificationChannel(
            channelId, "Battery Health Service",
            NotificationManager.IMPORTANCE_LOW
        )
        nm.createNotificationChannel(channel)

        val notification = Notification.Builder(this, channelId)
            .setContentTitle("Battery Health Optimizer")
            .setContentText("Background optimization active")
            .setSmallIcon(android.R.drawable.ic_menu_preferences)
            .setOngoing(true)
            .build()

        startForeground(1, notification)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        return START_STICKY
    }
}