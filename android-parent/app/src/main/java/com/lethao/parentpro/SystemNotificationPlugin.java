package com.lethao.parentpro;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.util.Log;
import androidx.core.app.ActivityCompat;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "SystemNotificationPlugin")
public class SystemNotificationPlugin extends Plugin {
    private static final String TAG = "ParentNotificationPlugin";

    public static final String CHANNEL_SOS = "parentpro_sos_channel";
    public static final String CHANNEL_CHAT = "parentpro_chat_channel";
    public static final String CHANNEL_ALERT = "parentpro_alert_channel";

    @Override
    public void load() {
        super.load();
        createNotificationChannels();
    }

    private void createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Context context = getContext();
            NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (manager == null) return;

            AudioAttributes audioAttributes = new AudioAttributes.Builder()
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                    .build();

            // 1. SOS Emergency Channel (Highest importance, heads-up banner, sirens)
            NotificationChannel sosChannel = new NotificationChannel(
                    CHANNEL_SOS,
                    "Cảnh Báo SOS Khẩn Cấp",
                    NotificationManager.IMPORTANCE_HIGH
            );
            sosChannel.setDescription("Thông báo khẩn cấp khi con bấm nút SOS hoặc gặp nguy hiểm");
            sosChannel.enableLights(true);
            sosChannel.setLightColor(Color.RED);
            sosChannel.enableVibration(true);
            sosChannel.setVibrationPattern(new long[]{0, 500, 200, 500, 200, 500, 200, 500});
            Uri alertSound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
            if (alertSound == null) alertSound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
            sosChannel.setSound(alertSound, audioAttributes);
            manager.createNotificationChannel(sosChannel);

            // 2. Family Chat Channel (Heads-up banner for messages)
            NotificationChannel chatChannel = new NotificationChannel(
                    CHANNEL_CHAT,
                    "Tin Nhắn Gia Đình",
                    NotificationManager.IMPORTANCE_HIGH
            );
            chatChannel.setDescription("Tin nhắn tức thì gửi từ con cái hoặc các thành viên");
            chatChannel.enableLights(true);
            chatChannel.setLightColor(Color.BLUE);
            chatChannel.enableVibration(true);
            chatChannel.setVibrationPattern(new long[]{0, 250, 100, 250});
            Uri chatSound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
            chatChannel.setSound(chatSound, audioAttributes);
            manager.createNotificationChannel(chatChannel);

            // 3. Alerts Channel (Battery, Time requests, Geofence)
            NotificationChannel alertChannel = new NotificationChannel(
                    CHANNEL_ALERT,
                    "Cảnh Báo An Toàn & Thiết Bị",
                    NotificationManager.IMPORTANCE_HIGH
            );
            alertChannel.setDescription("Cảnh báo pin yếu, xin thêm giờ, ra khỏi vùng an toàn");
            alertChannel.enableLights(true);
            alertChannel.setLightColor(Color.YELLOW);
            alertChannel.enableVibration(true);
            alertChannel.setVibrationPattern(new long[]{0, 200, 100, 200});
            manager.createNotificationChannel(alertChannel);

            Log.i(TAG, "Notification channels created successfully");
        }
    }

    @PluginMethod
    public void showNotification(PluginCall call) {
        String title = call.getString("title", "ParentPro Thông Báo");
        String body = call.getString("body", "");
        String soundType = call.getString("soundType", "info");
        String tag = call.getString("tag", "parent_notif_" + System.currentTimeMillis());
        int notifId = call.getInt("id", (int) (System.currentTimeMillis() % 100000));

        Context context = getContext();
        try {
            // Check permission on Android 13+
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                if (ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                    Log.w(TAG, "POST_NOTIFICATIONS permission not granted, requesting now");
                    ActivityCompat.requestPermissions(getActivity(), new String[]{Manifest.permission.POST_NOTIFICATIONS}, 101);
                }
            }

            // Pick channel based on soundType
            String targetChannelId = CHANNEL_ALERT;
            boolean isEmergency = "emergency".equalsIgnoreCase(soundType) || title.contains("SOS") || title.contains("KHẨN CẤP");
            boolean isChat = "chat".equalsIgnoreCase(soundType);

            if (isEmergency) {
                targetChannelId = CHANNEL_SOS;
            } else if (isChat) {
                targetChannelId = CHANNEL_CHAT;
            }

            Intent intent = new Intent(context, MainActivity.class);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            int pendingFlags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                pendingFlags |= PendingIntent.FLAG_IMMUTABLE;
            }
            PendingIntent pendingIntent = PendingIntent.getActivity(context, notifId, intent, pendingFlags);

            NotificationCompat.Builder builder = new NotificationCompat.Builder(context, targetChannelId)
                    .setSmallIcon(R.mipmap.ic_launcher)
                    .setContentTitle(title)
                    .setContentText(body)
                    .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                    .setContentIntent(pendingIntent)
                    .setAutoCancel(true)
                    .setPriority(NotificationCompat.PRIORITY_HIGH)
                    .setCategory(isEmergency ? NotificationCompat.CATEGORY_ALARM : (isChat ? NotificationCompat.CATEGORY_MESSAGE : NotificationCompat.CATEGORY_STATUS));

            if (isEmergency) {
                builder.setVibrate(new long[]{0, 500, 200, 500, 200, 500, 200, 500});
                builder.setFullScreenIntent(pendingIntent, true);

                // Wake up the physical screen
                try {
                    PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
                    if (pm != null) {
                        PowerManager.WakeLock wl = pm.newWakeLock(
                                PowerManager.FULL_WAKE_LOCK | PowerManager.ACQUIRE_CAUSES_WAKEUP | PowerManager.ON_AFTER_RELEASE,
                                "ParentPro::EmergencyWakeUp"
                        );
                        wl.acquire(5000);
                    }
                } catch (Throwable ignored) {}
            } else if (isChat) {
                builder.setVibrate(new long[]{0, 250, 100, 250});
            }

            NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (manager != null) {
                manager.notify(tag, notifId, builder.build());
                Log.i(TAG, "Notification posted: " + title + " (channel=" + targetChannelId + ")");
            }

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Failed to post notification: " + e.getMessage(), e);
            JSObject ret = new JSObject();
            ret.put("success", false);
            ret.put("error", e.getMessage());
            call.resolve(ret);
        }
    }

    @PluginMethod
    public void requestNotificationPermission(PluginCall call) {
        Context context = getContext();
        boolean isGranted = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            isGranted = ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED;
            if (!isGranted && getActivity() != null) {
                ActivityCompat.requestPermissions(getActivity(), new String[]{Manifest.permission.POST_NOTIFICATIONS}, 101);
            }
        }
        JSObject ret = new JSObject();
        ret.put("granted", isGranted);
        call.resolve(ret);
    }
}
