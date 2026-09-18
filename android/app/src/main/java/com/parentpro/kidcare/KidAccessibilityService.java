package com.parentpro.kidcare;

import android.accessibilityservice.AccessibilityService;
import android.content.Intent;
import android.util.Log;
import android.view.accessibility.AccessibilityEvent;

public class KidAccessibilityService extends AccessibilityService {
    private static final String TAG = "KidAccessibilityService";

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        if (event.getEventType() == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) {
            CharSequence packageName = event.getPackageName();
            if (packageName != null) {
                String currentPkg = packageName.toString();
                Log.d(TAG, "Current foreground app: " + currentPkg);
                // Here real MDM logic inspects rules and blocks or launches lock screen overlay
            }
        }
    }

    @Override
    public void onInterrupt() {
        Log.w(TAG, "Accessibility Service interrupted");
    }

    @Override
    protected void onServiceConnected() {
        super.onServiceConnected();
        Log.i(TAG, "KidCare Accessibility Service connected and active");
    }
}
