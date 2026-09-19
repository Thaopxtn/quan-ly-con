package com.lethao.kidcare;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

public class KidBootReceiver extends BroadcastReceiver {
    private static final String TAG = "KidBootReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())) {
            Log.i(TAG, "Phone rebooted. Starting KidProtectionService 24/7 foreground protection...");
            try {
                Intent serviceIntent = new Intent(context, KidProtectionService.class);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(serviceIntent);
                } else {
                    context.startService(serviceIntent);
                }
            } catch (Exception e) {
                Log.e(TAG, "Error starting KidProtectionService on boot", e);
            }
        }
    }
}
