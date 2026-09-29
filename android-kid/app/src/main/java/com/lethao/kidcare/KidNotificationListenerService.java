package com.lethao.kidcare;

import android.content.ComponentName;
import android.media.session.MediaController;
import android.media.session.MediaSessionManager;
import android.media.session.PlaybackState;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import android.util.Log;
import android.app.Notification;

import java.util.List;
import java.util.LinkedList;
import java.util.ArrayList;

public class KidNotificationListenerService extends NotificationListenerService {
    private static final String TAG = "KidNotifListener";
    
    private static KidNotificationListenerService instance;
    
    public static class NotifLog {
        public String packageName;
        public String title;
        public String text;
        public long postTime;
        public String id;
    }
    
    private static final LinkedList<NotifLog> recentNotifications = new LinkedList<>();

    @Override
    public void onListenerConnected() {
        super.onListenerConnected();
        Log.i(TAG, "NotificationListenerService connected");
        instance = this;
    }

    @Override
    public void onListenerDisconnected() {
        super.onListenerDisconnected();
        instance = null;
    }

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        super.onNotificationPosted(sbn);
        if (sbn == null || sbn.getNotification() == null) return;
        
        String packageName = sbn.getPackageName();
        if (packageName.equals(getPackageName())) return; // Ignore our own
        
        // Ignore system packages if desired, but we can keep them and filter on the web
        
        Bundle extras = sbn.getNotification().extras;
        if (extras == null) return;
        
        String title = extras.getString(Notification.EXTRA_TITLE);
        CharSequence textSeq = extras.getCharSequence(Notification.EXTRA_TEXT);
        String text = textSeq != null ? textSeq.toString() : "";
        
        if (title == null) title = "";
        if (title.isEmpty() && text.isEmpty()) return;
        
        NotifLog log = new NotifLog();
        log.packageName = packageName;
        log.title = title;
        log.text = text;
        log.postTime = sbn.getPostTime();
        log.id = sbn.getKey();
        
        synchronized(recentNotifications) {
            recentNotifications.addFirst(log);
            if (recentNotifications.size() > 50) {
                recentNotifications.removeLast();
            }
        }
    }

    public static List<NotifLog> getRecentAndClear() {
        List<NotifLog> copy = new ArrayList<>();
        synchronized(recentNotifications) {
            copy.addAll(recentNotifications);
            recentNotifications.clear();
        }
        return copy;
    }

    public static KidNotificationListenerService getInstance() {
        return instance;
    }

    public MediaController getActiveMediaController() {
        try {
            MediaSessionManager mediaSessionManager = (MediaSessionManager) getSystemService(MEDIA_SESSION_SERVICE);
            if (mediaSessionManager == null) return null;
            
            ComponentName componentName = new ComponentName(this, KidNotificationListenerService.class);
            List<MediaController> controllers = mediaSessionManager.getActiveSessions(componentName);
            
            for (MediaController controller : controllers) {
                PlaybackState state = controller.getPlaybackState();
                if (state != null && (state.getState() == PlaybackState.STATE_PLAYING || state.getState() == PlaybackState.STATE_BUFFERING)) {
                    return controller;
                }
            }
            if (!controllers.isEmpty()) {
                return controllers.get(0);
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to get active media controller", e);
        }
        return null;
    }
}

