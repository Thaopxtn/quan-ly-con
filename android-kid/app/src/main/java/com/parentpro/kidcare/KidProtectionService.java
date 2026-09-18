package com.parentpro.kidcare;

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
import android.util.Log;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;

public class KidProtectionService extends Service {
    private static final String TAG = "KidProtectionService";
    private static final String CHANNEL_ID = "kidcare_protection_channel";
    private static final int NOTIFICATION_ID = 1001;

    @Override
    public void onCreate() {
        super.onCreate();
        Log.i(TAG, "KidProtectionService created");
        createNotificationChannel();
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

        return START_NOT_STICKY;
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
    public void onDestroy() {
        Log.i(TAG, "KidProtectionService destroyed cleanly");
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
