package com.parentpro.kidcare;

import android.accessibilityservice.AccessibilityService;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.view.accessibility.AccessibilityEvent;
import android.widget.Toast;
import java.util.HashSet;
import java.util.Set;

public class KidAccessibilityService extends AccessibilityService {
    private static final String TAG = "KidAccessibilityService";
    private static final String PREF_NAME = "KidCareEnforcement";
    private long lastBlockToastTime = 0;

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        if (event.getEventType() == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) {
            CharSequence packageNameSeq = event.getPackageName();
            if (packageNameSeq == null) return;
            String currentPkg = packageNameSeq.toString();

            // 1. Ignore KidCare itself
            if (currentPkg.equals(getPackageName())) return;

            // 2. Always allow emergency calling & dialer
            if (isSystemPhoneOrDialer(currentPkg)) return;

            // 3. Read enforcement rules
            SharedPreferences prefs = getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
            boolean isLocked = prefs.getBoolean("is_locked", false);
            boolean kioskEnabled = prefs.getBoolean("kiosk_enabled", false);
            String kioskPackage = prefs.getString("kiosk_package", "");
            Set<String> blockedPackages = prefs.getStringSet("blocked_packages", new HashSet<String>());

            // Scenario A: Full device lock
            if (isLocked) {
                Log.w(TAG, "Device is locked! Blocking foreground app: " + currentPkg);
                showBlockFeedback("Thiết bị đang bị khóa từ xa bởi Bố Mẹ!");
                bringKidCareToForeground();
                return;
            }

            // Scenario B: Pinned Kiosk mode
            if (kioskEnabled && kioskPackage != null && !kioskPackage.isEmpty()) {
                if (!currentPkg.equals(kioskPackage)) {
                    Log.w(TAG, "Kiosk mode active! Pinned: " + kioskPackage + ", blocked: " + currentPkg);
                    showBlockFeedback("Chế độ Kiosk: Chỉ được mở ứng dụng học tập!");
                    launchPinnedAppOrKidCare(kioskPackage);
                    return;
                }
            }

            // Scenario C: Blocked app
            if (isPackageBlocked(currentPkg, blockedPackages)) {
                Log.w(TAG, "App is blocked: " + currentPkg);
                showBlockFeedback("Ứng dụng này đang bị tạm khóa theo quy định gia đình!");
                bringKidCareToForeground();
            }
        }
    }

    private boolean isPackageBlocked(String currentPkg, Set<String> blockedPackages) {
        if (blockedPackages == null || blockedPackages.isEmpty()) return false;
        if (blockedPackages.contains(currentPkg)) return true;
        // Check partial match (e.g. "tiktok", "youtube")
        String lowerPkg = currentPkg.toLowerCase();
        for (String blocked : blockedPackages) {
            if (lowerPkg.contains(blocked.toLowerCase())) {
                return true;
            }
        }
        return false;
    }

    private boolean isSystemPhoneOrDialer(String pkg) {
        String lower = pkg.toLowerCase();
        return lower.contains("dialer") ||
               lower.contains("telecom") ||
               lower.contains("incall") ||
               lower.contains("phone") ||
               lower.contains("emergency");
    }

    private void bringKidCareToForeground() {
        try {
            Intent intent = new Intent(this, MainActivity.class);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            startActivity(intent);
        } catch (Exception e) {
            Log.e(TAG, "Error bringing KidCare to foreground", e);
        }
    }

    private void launchPinnedAppOrKidCare(String pinnedPkg) {
        try {
            Intent intent = getPackageManager().getLaunchIntentForPackage(pinnedPkg);
            if (intent != null) {
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
                startActivity(intent);
            } else {
                bringKidCareToForeground();
            }
        } catch (Exception e) {
            bringKidCareToForeground();
        }
    }

    private void showBlockFeedback(final String message) {
        long now = System.currentTimeMillis();
        if (now - lastBlockToastTime > 3000) {
            lastBlockToastTime = now;
            new Handler(Looper.getMainLooper()).post(new Runnable() {
                @Override
                public void run() {
                    Toast.makeText(getApplicationContext(), message, Toast.LENGTH_SHORT).show();
                }
            });
        }
    }

    @Override
    public void onInterrupt() {
        Log.w(TAG, "KidCare Accessibility Service interrupted");
    }

    @Override
    protected void onServiceConnected() {
        super.onServiceConnected();
        Log.i(TAG, "KidCare Accessibility Service connected and fully active");
    }
}
