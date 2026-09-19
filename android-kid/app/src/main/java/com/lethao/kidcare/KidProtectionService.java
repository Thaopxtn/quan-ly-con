package com.lethao.kidcare;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import android.util.Log;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;

public class KidProtectionService extends Service {
    private static final String TAG = "KidProtectionService";
    private static final String CHANNEL_ID = "kidcare_protection_channel";
    private static final int NOTIFICATION_ID = 1001;
    private PowerManager.WakeLock wakeLock;

    @Override
    public void onCreate() {
        super.onCreate();
        Log.i(TAG, "KidProtectionService created");
        createNotificationChannel();

        try {
            PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
            if (pm != null) {
                wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "KidCare::ProtectionWakeLock");
                wakeLock.acquire();
                Log.i(TAG, "KidProtectionService: Acquired PARTIAL_WAKE_LOCK to keep network and commands alive when screen is off");
            }
        } catch (Throwable t) {
            Log.w(TAG, "Could not acquire WakeLock: " + t.getMessage());
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Log.i(TAG, "KidProtectionService onStartCommand called (startId=" + startId + ")");

        try {
            Intent notificationIntent = new Intent(this, MainActivity.class);
            notificationIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);

            int pendingFlags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                pendingFlags |= PendingIntent.FLAG_IMMUTABLE;
            }
            PendingIntent pendingIntent = PendingIntent.getActivity(this, 0, notificationIntent, pendingFlags);

            Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
                    .setContentTitle("KidCare: Thiết bị đang được bảo vệ")
                    .setContentText("Hệ thống giám sát an toàn và bảo vệ trẻ em đang hoạt động.")
                    .setSmallIcon(R.mipmap.ic_launcher)
                    .setContentIntent(pendingIntent)
                    .setOngoing(true)
                    .setPriority(NotificationCompat.PRIORITY_LOW)
                    .setCategory(NotificationCompat.CATEGORY_SERVICE)
                    .build();

            // Android 14+ (API 34+) requires runtime location permission before attaching FOREGROUND_SERVICE_TYPE_LOCATION
            boolean hasLocationPermission = ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED ||
                                            ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && hasLocationPermission) {
                int fgsType = android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION;
                startForeground(NOTIFICATION_ID, notification, fgsType);
                Log.i(TAG, "KidProtectionService started in foreground with LOCATION type");
            } else {
                startForeground(NOTIFICATION_ID, notification);
                Log.i(TAG, "KidProtectionService started in foreground standard");
            }
        } catch (Throwable t) {
            Log.e(TAG, "Non-fatal error in startForeground: " + t.getMessage(), t);
            try {
                stopSelf(startId);
            } catch (Throwable ignored) {}
        }

        return START_STICKY;
    }

    // Android 15 (API 35+) FGS timeout handler - gracefully stops service without throwing system crash
    public void onTimeout(int startId, int fgsType) {
        Log.w(TAG, "Foreground service timeout reached for fgsType=" + fgsType + ". Stopping service gracefully.");
        try {
            stopSelf(startId);
        } catch (Throwable ignored) {
            stopSelf();
        }
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        Log.i(TAG, "KidProtectionService: Task removed from Recents, scheduling immediate restart...");
        try {
            Intent restartServiceIntent = new Intent(getApplicationContext(), this.getClass());
            restartServiceIntent.setPackage(getPackageName());
            int pendingFlags = PendingIntent.FLAG_ONE_SHOT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                pendingFlags |= PendingIntent.FLAG_IMMUTABLE;
            }
            PendingIntent restartServicePendingIntent = PendingIntent.getService(
                    getApplicationContext(), 1001, restartServiceIntent, pendingFlags
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
        Log.i(TAG, "KidProtectionService destroyed cleanly");
        if (wakeLock != null && wakeLock.isHeld()) {
            try {
                wakeLock.release();
                Log.i(TAG, "KidProtectionService: Released PARTIAL_WAKE_LOCK");
            } catch (Throwable ignored) {}
            wakeLock = null;
        }
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Dịch Vụ Bảo Vệ Trẻ Em KidCare 24/7",
                    NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Duy trì kết nối đồng bộ và bảo vệ an toàn cho con liên tục");
            channel.setShowBadge(false);

            NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }
}
