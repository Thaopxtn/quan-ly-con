package com.lethao.parentpro;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import android.util.Log;
import androidx.core.app.NotificationCompat;

public class ParentMonitorService extends Service {
    private static final String TAG = "ParentMonitorService";
    private static final String SERVICE_CHANNEL_ID = "parentpro_monitor_service_channel";
    private static final int NOTIFICATION_ID = 2001;
    private PowerManager.WakeLock wakeLock;

    @Override
    public void onCreate() {
        super.onCreate();
        Log.i(TAG, "ParentMonitorService created");
        createServiceNotificationChannel();

        try {
            PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
            if (pm != null) {
                wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "ParentPro::MonitorWakeLock");
                wakeLock.acquire();
                Log.i(TAG, "ParentMonitorService: Acquired PARTIAL_WAKE_LOCK for 24/7 background alerts");
            }
        } catch (Throwable t) {
            Log.w(TAG, "Could not acquire WakeLock: " + t.getMessage());
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Log.i(TAG, "ParentMonitorService onStartCommand called (startId=" + startId + ")");

        try {
            Intent notificationIntent = new Intent(this, MainActivity.class);
            notificationIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);

            int pendingFlags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                pendingFlags |= PendingIntent.FLAG_IMMUTABLE;
            }
            PendingIntent pendingIntent = PendingIntent.getActivity(this, 0, notificationIntent, pendingFlags);

            Notification notification = new NotificationCompat.Builder(this, SERVICE_CHANNEL_ID)
                    .setContentTitle("ParentPro: Đang bảo vệ & giám sát con")
                    .setContentText("Sẵn sàng nhận tín hiệu SOS và thông báo an toàn từ con 24/7.")
                    .setSmallIcon(R.mipmap.ic_launcher)
                    .setContentIntent(pendingIntent)
                    .setOngoing(true)
                    .setPriority(NotificationCompat.PRIORITY_LOW)
                    .setCategory(NotificationCompat.CATEGORY_SERVICE)
                    .build();

            startForeground(NOTIFICATION_ID, notification);
            Log.i(TAG, "ParentMonitorService started in foreground");
        } catch (Throwable t) {
            Log.e(TAG, "Error in startForeground: " + t.getMessage(), t);
        }

        return START_STICKY;
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        Log.i(TAG, "ParentMonitorService: Task removed from Recents, scheduling immediate restart...");
        try {
            Intent restartServiceIntent = new Intent(getApplicationContext(), this.getClass());
            restartServiceIntent.setPackage(getPackageName());
            int pendingFlags = PendingIntent.FLAG_ONE_SHOT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                pendingFlags |= PendingIntent.FLAG_IMMUTABLE;
            }
            PendingIntent restartServicePendingIntent = PendingIntent.getService(
                    getApplicationContext(), 2001, restartServiceIntent, pendingFlags
            );
            android.app.AlarmManager alarmService = (android.app.AlarmManager) getApplicationContext().getSystemService(Context.ALARM_SERVICE);
            if (alarmService != null) {
                alarmService.set(android.app.AlarmManager.ELAPSED_REALTIME, android.os.SystemClock.elapsedRealtime() + 1000, restartServicePendingIntent);
            }
        } catch (Throwable t) {
            Log.w(TAG, "Could not schedule alarm restart onTaskRemoved: " + t.getMessage());
        }
        super.onTaskRemoved(rootIntent);
    }

    @Override
    public void onDestroy() {
        Log.i(TAG, "ParentMonitorService destroyed");
        if (wakeLock != null && wakeLock.isHeld()) {
            try {
                wakeLock.release();
                Log.i(TAG, "ParentMonitorService: Released PARTIAL_WAKE_LOCK");
            } catch (Throwable ignored) {}
            wakeLock = null;
        }
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void createServiceNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    SERVICE_CHANNEL_ID,
                    "Dịch Vụ Giám Sát ParentPro 24/7",
                    NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Duy trì kết nối nhận cảnh báo SOS và thông báo con liên tục");
            channel.setShowBadge(false);

            NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }
}
