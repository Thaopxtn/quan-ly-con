package com.lethao.kidcare;

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
    private static final String TAG = "KidNotificationPlugin";

    public static final String CHANNEL_URGENT = "kidcare_urgent_channel";
    public static final String CHANNEL_CHAT = "kidcare_chat_channel";
    public static final String CHANNEL_INFO = "kidcare_info_channel";

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

            // 1. Urgent Commands Channel (Heads-up banner, locks, siren, broadcast)
            NotificationChannel urgentChannel = new NotificationChannel(
                    CHANNEL_URGENT,
                    "Lệnh Khẩn Cấp Từ Bố Mẹ",
                    NotificationManager.IMPORTANCE_HIGH
            );
            urgentChannel.setDescription("Thông báo khẩn cấp, khóa máy từ xa và thông điệp của Bố Mẹ");
            urgentChannel.enableLights(true);
            urgentChannel.setLightColor(Color.RED);
            urgentChannel.enableVibration(true);
            urgentChannel.setVibrationPattern(new long[]{0, 500, 200, 500, 200, 500});
            Uri alertSound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
            if (alertSound == null) alertSound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
            urgentChannel.setSound(alertSound, audioAttributes);
            manager.createNotificationChannel(urgentChannel);

            // 2. Chat Channel (Heads-up banner for messages)
            NotificationChannel chatChannel = new NotificationChannel(
                    CHANNEL_CHAT,
                    "Tin Nhắn Từ Bố Mẹ",
                    NotificationManager.IMPORTANCE_HIGH
            );
            chatChannel.setDescription("Tin nhắn tức thì từ Bố Mẹ và gia đình");
            chatChannel.enableLights(true);
            chatChannel.setLightColor(Color.BLUE);
            chatChannel.enableVibration(true);
            chatChannel.setVibrationPattern(new long[]{0, 250, 100, 250});
            Uri chatSound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
            chatChannel.setSound(chatSound, audioAttributes);
            manager.createNotificationChannel(chatChannel);

            // 3. Info / Routines Channel (Lessons, habit reminders)
            NotificationChannel infoChannel = new NotificationChannel(
                    CHANNEL_INFO,
                    "Lời Nhắc & Hoạt Động Của Bé",
                    NotificationManager.IMPORTANCE_HIGH
            );
            infoChannel.setDescription("Nhắc uống nước, đến giờ học bài, đi ngủ hoặc bài học mới");
            infoChannel.enableLights(true);
            infoChannel.setLightColor(Color.GREEN);
            infoChannel.enableVibration(true);
            infoChannel.setVibrationPattern(new long[]{0, 200, 100, 200});
            manager.createNotificationChannel(infoChannel);

            Log.i(TAG, "KidCare Notification channels created successfully");
        }
    }

    @PluginMethod
    public void showNotification(PluginCall call) {
        String title = call.getString("title", "KidCare Thông Báo");
        String body = call.getString("body", "");
        String soundType = call.getString("soundType", "info");
        String tag = call.getString("tag", "kid_notif_" + System.currentTimeMillis());
        int notifId = call.getInt("id", (int) (System.currentTimeMillis() % 100000));

        Context context = getContext();
        try {
            // Check permission on Android 13+
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                if (ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                    Log.w(TAG, "POST_NOTIFICATIONS permission not granted, requesting now");
                    ActivityCompat.requestPermissions(getActivity(), new String[]{Manifest.permission.POST_NOTIFICATIONS}, 102);
                }
            }

            // Pick channel based on soundType
            String targetChannelId = CHANNEL_INFO;
            boolean isEmergency = "emergency".equalsIgnoreCase(soundType) || title.contains("Khóa") || title.contains("KHÓA") || title.contains("TÌM MÁY") || title.contains("SOS");
            boolean isChat = "chat".equalsIgnoreCase(soundType);

            if (isEmergency) {
                targetChannelId = CHANNEL_URGENT;
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
                    .setCategory(isEmergency ? NotificationCompat.CATEGORY_ALARM : (isChat ? NotificationCompat.CATEGORY_MESSAGE : NotificationCompat.CATEGORY_EVENT));

            if (isEmergency) {
                builder.setVibrate(new long[]{0, 500, 200, 500, 200, 500});
                builder.setFullScreenIntent(pendingIntent, true);

                // Wake up screen
                try {
                    PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
                    if (pm != null) {
                        PowerManager.WakeLock wl = pm.newWakeLock(
                                PowerManager.FULL_WAKE_LOCK | PowerManager.ACQUIRE_CAUSES_WAKEUP | PowerManager.ON_AFTER_RELEASE,
                                "KidCare::EmergencyWakeUp"
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
                Log.i(TAG, "KidCare Notification posted: " + title + " (channel=" + targetChannelId + ")");
            }

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Failed to post notification in KidCare: " + e.getMessage(), e);
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
                ActivityCompat.requestPermissions(getActivity(), new String[]{Manifest.permission.POST_NOTIFICATIONS}, 102);
            }
        }
        JSObject ret = new JSObject();
        ret.put("granted", isGranted);
        call.resolve(ret);
    }
}
