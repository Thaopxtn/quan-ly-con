package com.lethao.kidcare;

import android.content.ComponentName;
import android.media.MediaMetadata;
import android.media.session.MediaController;
import android.media.session.MediaSessionManager;
import android.media.session.PlaybackState;
import android.service.notification.NotificationListenerService;
import android.util.Log;

import java.util.List;

public class KidNotificationListenerService extends NotificationListenerService {
    private static final String TAG = "KidNotifListener";
    
    private static KidNotificationListenerService instance;

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
