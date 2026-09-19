package com.lethao.parentpro;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

public class ParentBootReceiver extends BroadcastReceiver {
    private static final String TAG = "ParentBootReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || intent.getAction() == null) return;
        String action = intent.getAction();
        Log.i(TAG, "Received broadcast action: " + action);

        if (Intent.ACTION_BOOT_COMPLETED.equals(action) ||
            "android.intent.action.QUICKBOOT_POWERON".equals(action) ||
            "com.htc.intent.action.QUICKBOOT_POWERON".equals(action)) {

            try {
                Intent serviceIntent = new Intent(context, ParentMonitorService.class);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(serviceIntent);
                } else {
                    context.startService(serviceIntent);
                }
                Log.i(TAG, "ParentMonitorService started successfully after boot");
            } catch (Exception e) {
                Log.e(TAG, "Failed to start ParentMonitorService after boot: " + e.getMessage(), e);
            }
        }
    }
}
