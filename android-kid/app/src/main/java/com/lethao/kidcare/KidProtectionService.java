package com.lethao.kidcare;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import android.provider.Settings;
import android.util.Log;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;

public class KidProtectionService extends Service {
    private static final String TAG = "KidProtectionService";
    private static final String CHANNEL_ID = "kidcare_protection_channel";
    private static final int NOTIFICATION_ID = 1001;
    private PowerManager.WakeLock wakeLock;

    private WindowManager windowManager;
    private View lockOverlayView;
    private SharedPreferences prefs;
    private SharedPreferences.OnSharedPreferenceChangeListener prefsListener;

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
                Log.i(TAG, "KidProtectionService: Acquired PARTIAL_WAKE_LOCK");
            }
        } catch (Throwable t) {
            Log.w(TAG, "Could not acquire WakeLock: " + t.getMessage());
        }

        prefs = getSharedPreferences("KidCareEnforcement", Context.MODE_PRIVATE);
        prefsListener = (sharedPreferences, key) -> {
            if ("is_locked".equals(key)) {
                updateLockScreenState();
            }
        };
        prefs.registerOnSharedPreferenceChangeListener(prefsListener);
        updateLockScreenState();
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

            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && hasLocationPermission) {
                    int fgsType = android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION;
                    startForeground(NOTIFICATION_ID, notification, fgsType);
                    Log.i(TAG, "KidProtectionService started in foreground with LOCATION type");
                } else if (Build.VERSION.SDK_INT >= 34) {
                    int fgsType = 1073741824; // FOREGROUND_SERVICE_TYPE_SPECIAL_USE
                    startForeground(NOTIFICATION_ID, notification, fgsType);
                    Log.i(TAG, "KidProtectionService started in foreground with SPECIAL_USE type");
                } else {
                    startForeground(NOTIFICATION_ID, notification);
                    Log.i(TAG, "KidProtectionService started in foreground standard");
                }
            } catch (SecurityException se) {
                Log.w(TAG, "Failed to start FGS with location type, falling back to specialUse/standard...", se);
                if (Build.VERSION.SDK_INT >= 34) {
                    int fgsType = 1073741824; // FOREGROUND_SERVICE_TYPE_SPECIAL_USE
                    startForeground(NOTIFICATION_ID, notification, fgsType);
                } else {
                    startForeground(NOTIFICATION_ID, notification);
                }
            }
        } catch (Throwable t) {
            Log.e(TAG, "Non-fatal error in startForeground: " + t.getMessage(), t);
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

    private void updateLockScreenState() {
        if (prefs == null) return;
        boolean isLocked = prefs.getBoolean("is_locked", false);
        if (isLocked) {
            showLockScreen();
        } else {
            hideLockScreen();
        }
    }

    private void showLockScreen() {
        if (lockOverlayView != null) return;

        windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);
        if (windowManager == null) return;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(this)) {
            Log.w(TAG, "Cannot draw overlay: permission denied");
            return;
        }

        FrameLayout layout = new FrameLayout(this);
        layout.setBackgroundColor(Color.parseColor("#FA0ea5e9")); // 98% opacity blue

        LinearLayout container = new LinearLayout(this);
        container.setOrientation(LinearLayout.VERTICAL);
        container.setGravity(Gravity.CENTER);

        TextView title = new TextView(this);
        title.setText("THIẾT BỊ ĐÃ BỊ KHÓA");
        title.setTextColor(Color.WHITE);
        title.setTextSize(26);
        title.setGravity(Gravity.CENTER);

        TextView subtitle = new TextView(this);
        subtitle.setText("Hãy dành thời gian nghỉ ngơi hoặc làm bài tập nhé!");
        subtitle.setTextColor(Color.parseColor("#94A3B8")); // slate-400
        subtitle.setTextSize(16);
        subtitle.setGravity(Gravity.CENTER);
        subtitle.setPadding(0, 30, 0, 0);

        container.addView(title);
        container.addView(subtitle);

        FrameLayout.LayoutParams params = new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT,
                Gravity.CENTER
        );
        layout.addView(container, params);

        lockOverlayView = layout;

        int layoutFlag;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            layoutFlag = WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY;
        } else {
            layoutFlag = WindowManager.LayoutParams.TYPE_PHONE;
        }

        WindowManager.LayoutParams layoutParams = new WindowManager.LayoutParams(
                WindowManager.LayoutParams.MATCH_PARENT,
                WindowManager.LayoutParams.MATCH_PARENT,
                layoutFlag,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
                        | WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL
                        | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN
                        | WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED
                        | WindowManager.LayoutParams.FLAG_FULLSCREEN,
                android.graphics.PixelFormat.TRANSLUCENT);

        try {
            windowManager.addView(lockOverlayView, layoutParams);
            Log.i(TAG, "Lock screen overlay displayed");
        } catch (Exception e) {
            Log.e(TAG, "Failed to add lock view", e);
            lockOverlayView = null;
        }
    }

    private void hideLockScreen() {
        if (lockOverlayView != null && windowManager != null) {
            try {
                windowManager.removeView(lockOverlayView);
                Log.i(TAG, "Lock screen overlay hidden");
            } catch (Exception ignored) {}
            lockOverlayView = null;
        }
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
