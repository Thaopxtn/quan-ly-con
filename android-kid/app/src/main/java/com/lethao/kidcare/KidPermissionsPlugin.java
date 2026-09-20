package com.lethao.kidcare;

import android.Manifest;
import android.app.admin.DevicePolicyManager;
import android.content.BroadcastReceiver;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;
import android.text.TextUtils;
import android.util.Log;
import android.telephony.TelephonyManager;
import android.telephony.SubscriptionManager;
import android.telephony.SubscriptionInfo;
import java.net.NetworkInterface;
import java.util.Collections;
import java.util.List;
import java.util.Calendar;
import androidx.core.content.ContextCompat;

import android.app.AppOpsManager;
import android.app.usage.UsageStats;
import android.app.usage.UsageStatsManager;
import android.hardware.camera2.CameraManager;
import android.hardware.Sensor;
import android.hardware.SensorManager;
import android.media.AudioManager;
import android.view.KeyEvent;
import android.view.WindowManager;

import android.content.pm.ApplicationInfo;
import android.content.pm.ResolveInfo;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.drawable.BitmapDrawable;
import android.graphics.drawable.Drawable;
import android.util.Base64;
import java.io.ByteArrayOutputStream;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "KidPermissionsPlugin")
public class KidPermissionsPlugin extends Plugin {
    private static final String TAG = "KidPermissionsPlugin";
    private BroadcastReceiver screenStateReceiver;

    @Override
    public void load() {
        super.load();
        registerScreenStateReceiver();
    }

    private void registerScreenStateReceiver() {
        if (screenStateReceiver != null) return;
        try {
            Context context = getContext();
            screenStateReceiver = new BroadcastReceiver() {
                @Override
                public void onReceive(Context ctx, Intent intent) {
                    if (intent == null || intent.getAction() == null) return;
                    String action = intent.getAction();
                    boolean isScreenOn = Intent.ACTION_SCREEN_ON.equals(action) || Intent.ACTION_USER_PRESENT.equals(action);
                    JSObject data = new JSObject();
                    data.put("isScreenOn", isScreenOn);
                    data.put("action", action);
                    notifyListeners("screenStateChange", data);
                }
            };
            IntentFilter filter = new IntentFilter();
            filter.addAction(Intent.ACTION_SCREEN_ON);
            filter.addAction(Intent.ACTION_SCREEN_OFF);
            filter.addAction(Intent.ACTION_USER_PRESENT);
            context.registerReceiver(screenStateReceiver, filter);
        } catch (Exception e) {
            Log.w(TAG, "Error registering screenStateReceiver: " + e.getMessage());
        }
    }

    @Override
    protected void handleOnDestroy() {
        if (screenStateReceiver != null) {
            try {
                getContext().unregisterReceiver(screenStateReceiver);
            } catch (Exception ignored) {}
            screenStateReceiver = null;
        }
        super.handleOnDestroy();
    }

    @PluginMethod
    public void getScreenState(PluginCall call) {
        Context context = getContext();
        PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
        boolean isInteractive = true;
        if (pm != null) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT_WATCH) {
                isInteractive = pm.isInteractive();
            } else {
                isInteractive = pm.isScreenOn();
            }
        }
        JSObject ret = new JSObject();
        ret.put("isScreenOn", isInteractive);
        call.resolve(ret);
    }

    @PluginMethod
    public void getInstalledApps(PluginCall call) {
        new Thread(() -> {
            try {
                Context context = getContext();
                PackageManager pm = context.getPackageManager();
                JSArray appList = new JSArray();

                Intent mainIntent = new Intent(Intent.ACTION_MAIN, null);
                mainIntent.addCategory(Intent.CATEGORY_LAUNCHER);
                List<ResolveInfo> pkgAppsList = pm.queryIntentActivities(mainIntent, 0);

                String myPackage = context.getPackageName();
                int iconLimit = 32; // Optimized: Convert real icon thumbnail for top 32 apps only to reduce launch latency
                int iconCount = 0;

                for (ResolveInfo resolveInfo : pkgAppsList) {
                    try {
                        if (resolveInfo.activityInfo == null) continue;
                        String pkgName = resolveInfo.activityInfo.packageName;
                        if (pkgName == null || pkgName.equals(myPackage)) continue; // Skip KidCare itself

                        String appName = resolveInfo.loadLabel(pm).toString();
                        if (appName == null || appName.isEmpty()) {
                            appName = pkgName;
                        }

                        boolean isSystem = false;
                        if (resolveInfo.activityInfo.applicationInfo != null) {
                            isSystem = (resolveInfo.activityInfo.applicationInfo.flags & ApplicationInfo.FLAG_SYSTEM) != 0;
                        }

                        JSObject appObj = new JSObject();
                        appObj.put("id", "app_" + pkgName.replace(".", "_"));
                        appObj.put("packageName", pkgName);
                        appObj.put("name", appName);
                        appObj.put("isSystem", isSystem);

                        // Categorize heuristically
                        String cat = "other";
                        String lowerName = appName.toLowerCase();
                        String lowerPkg = pkgName.toLowerCase();
                        if (lowerPkg.contains("youtube") || lowerPkg.contains("video") || lowerPkg.contains("vlc") || lowerPkg.contains("netflix") || lowerPkg.contains("tiktok")) {
                            cat = "video";
                        } else if (lowerPkg.contains("game") || lowerPkg.contains("roblox") || lowerPkg.contains("freefire") || lowerPkg.contains("pubg") || lowerPkg.contains("play")) {
                            cat = "game";
                        } else if (lowerPkg.contains("zalo") || lowerPkg.contains("facebook") || lowerPkg.contains("messenger") || lowerPkg.contains("instagram") || lowerPkg.contains("viber") || lowerPkg.contains("tele")) {
                            cat = "social";
                        } else if (lowerPkg.contains("browser") || lowerPkg.contains("chrome") || lowerPkg.contains("firefox") || lowerPkg.contains("opera")) {
                            cat = "browser";
                        } else if (lowerName.contains("học") || lowerName.contains("toán") || lowerName.contains("anh") || lowerName.contains("sách") || lowerPkg.contains("duolingo") || lowerPkg.contains("study") || lowerPkg.contains("class") || lowerPkg.contains("zoom") || lowerPkg.contains("meet") || lowerPkg.contains("monkey") || lowerPkg.contains("edu") || lowerPkg.contains("camera") || lowerPkg.contains("calculator") || lowerPkg.contains("deskclock") || lowerPkg.contains("gallery")) {
                            cat = "study";
                        }
                        appObj.put("category", cat);

                        if (iconCount < iconLimit) {
                            try {
                                Drawable iconDrawable = resolveInfo.loadIcon(pm);
                                String iconBase64 = drawableToBase64(iconDrawable);
                                if (iconBase64 != null) {
                                    appObj.put("icon", iconBase64);
                                    iconCount++;
                                }
                            } catch (Throwable ignored) {}
                        }

                        appList.put(appObj);
                    } catch (Exception ignored) {}
                }

                JSObject ret = new JSObject();
                ret.put("apps", appList);
                ret.put("count", appList.length());
                call.resolve(ret);
            } catch (Exception e) {
                Log.e(TAG, "Error getting installed apps", e);
                call.reject("Failed to get installed apps: " + e.getMessage());
            }
        }).start();
    }

    @PluginMethod
    public void launchApp(PluginCall call) {
        String packageName = call.getString("packageName", "");
        if (packageName == null || packageName.isEmpty()) {
            call.reject("Package name is empty");
            return;
        }
        try {
            Context context = getContext();
            PackageManager pm = context.getPackageManager();
            Intent intent = pm.getLaunchIntentForPackage(packageName);
            if (intent != null) {
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED);
                context.startActivity(intent);
                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("packageName", packageName);
                call.resolve(ret);
            } else {
                call.reject("Cannot find launch intent for package: " + packageName);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error launching app: " + packageName, e);
            call.reject("Failed to launch app: " + e.getMessage());
        }
    }

    private String drawableToBase64(Drawable drawable) {
        if (drawable == null) return null;
        try {
            Bitmap bitmap;
            int width = drawable.getIntrinsicWidth();
            int height = drawable.getIntrinsicHeight();
            if (width <= 0 || height <= 0) {
                width = 48;
                height = 48;
            }
            width = Math.min(width, 56);
            height = Math.min(height, 56);

            if (drawable instanceof BitmapDrawable) {
                Bitmap bmp = ((BitmapDrawable) drawable).getBitmap();
                if (bmp != null) {
                    bitmap = Bitmap.createScaledBitmap(bmp, 48, 48, false);
                } else {
                    bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888);
                    Canvas canvas = new Canvas(bitmap);
                    drawable.setBounds(0, 0, canvas.getWidth(), canvas.getHeight());
                    drawable.draw(canvas);
                }
            } else {
                bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888);
                Canvas canvas = new Canvas(bitmap);
                drawable.setBounds(0, 0, canvas.getWidth(), canvas.getHeight());
                drawable.draw(canvas);
            }

            if (bitmap != null) {
                ByteArrayOutputStream stream = new ByteArrayOutputStream();
                bitmap.compress(Bitmap.CompressFormat.PNG, 65, stream);
                byte[] byteArray = stream.toByteArray();
                return "data:image/png;base64," + Base64.encodeToString(byteArray, Base64.NO_WRAP);
            }
        } catch (Throwable ignored) {}
        return null;
    }

    @PluginMethod
    public void checkPermissions(PluginCall call) {
        Context context = getContext();
        JSObject ret = new JSObject();

        boolean overlay = isOverlayPermissionGranted(context);
        boolean accessibility = isAccessibilityServiceEnabled(context);
        boolean deviceAdmin = isDeviceAdminActive(context);
        boolean location = isLocationPermissionGranted(context);
        boolean battery = isBatteryOptimizationIgnored(context);
        boolean usageStats = isUsageStatsPermissionGranted(context);
        boolean writeSettings = isWriteSettingsPermissionGranted(context);
        boolean camera = isCameraPermissionGranted(context);
        boolean activityRecognition = isActivityRecognitionPermissionGranted(context);
        boolean calendar = isCalendarPermissionGranted(context);
        boolean audio = isAudioPermissionGranted(context);

        ret.put("overlay", overlay);
        ret.put("accessibility", accessibility);
        ret.put("device_admin", deviceAdmin);
        ret.put("location", location);
        ret.put("battery", battery);
        ret.put("usage_stats", usageStats);
        ret.put("write_settings", writeSettings);
        ret.put("camera", camera);
        ret.put("activity_recognition", activityRecognition);
        ret.put("calendar", calendar);
        ret.put("audio", audio);
        ret.put("isAllGranted", overlay && accessibility && deviceAdmin && location && battery && usageStats);

        call.resolve(ret);
    }

    @PluginMethod
    public void openPermissionSettings(PluginCall call) {
        String type = call.getString("type", "");
        Context context = getContext();
        String packageName = context.getPackageName();
        Intent intent = null;

        try {
            switch (type) {
                case "overlay":
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                        intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:" + packageName));
                    }
                    break;
                case "accessibility":
                    intent = new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS);
                    break;
                case "device_admin":
                    ComponentName comp = new ComponentName(context, KidDeviceAdminReceiver.class);
                    intent = new Intent(DevicePolicyManager.ACTION_ADD_DEVICE_ADMIN);
                    intent.putExtra(DevicePolicyManager.EXTRA_DEVICE_ADMIN, comp);
                    intent.putExtra(DevicePolicyManager.EXTRA_ADD_EXPLANATION, "Kích hoạt quyền quản trị để ngăn chặn gỡ cài đặt KidCare trái phép, bảo vệ trẻ em an toàn 24/7.");
                    break;
                case "battery":
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                        intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:" + packageName));
                    }
                    break;
                case "usage_stats":
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                        intent = new Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS);
                    }
                    break;
                case "write_settings":
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                        intent = new Intent(Settings.ACTION_MANAGE_WRITE_SETTINGS, Uri.parse("package:" + packageName));
                    }
                    break;
                case "notification_policy":
                case "dnd":
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                        intent = new Intent(Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS);
                    }
                    break;
                case "home_launcher":
                case "launcher":
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                        intent = new Intent(Settings.ACTION_HOME_SETTINGS);
                    } else {
                        intent = new Intent(Settings.ACTION_SETTINGS);
                    }
                    break;
                case "camera":
                case "activity_recognition":
                case "calendar":
                case "audio":
                case "location":
                case "app_details":
                default:
                    intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + packageName));
                    break;
            }

            if (intent != null) {
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(intent);
                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("type", type);
                call.resolve(ret);
            } else {
                call.reject("Cannot create intent for type: " + type);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error opening settings for: " + type, e);
            // Fallback to application details settings
            try {
                Intent fallback = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + packageName));
                fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(fallback);
                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("fallback", true);
                call.resolve(ret);
            } catch (Exception ex) {
                call.reject("Failed to open settings: " + ex.getMessage());
            }
        }
    }

    @PluginMethod
    public void openHomeLauncherSettings(PluginCall call) {
        Context context = getContext();
        try {
            Intent intent;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                intent = new Intent(Settings.ACTION_HOME_SETTINGS);
            } else {
                intent = new Intent(Settings.ACTION_SETTINGS);
            }
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            try {
                Intent homeIntent = new Intent(Intent.ACTION_MAIN);
                homeIntent.addCategory(Intent.CATEGORY_HOME);
                homeIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(Intent.createChooser(homeIntent, "Chọn KidCare làm Màn hình chính mặc định"));
                JSObject ret = new JSObject();
                ret.put("success", true);
                call.resolve(ret);
            } catch (Exception ex) {
                call.reject("Could not open launcher settings: " + ex.getMessage());
            }
        }
    }

    @PluginMethod
    public void startProtectionService(PluginCall call) {
        Context context = getContext();
        try {
            Intent serviceIntent = new Intent(context, KidProtectionService.class);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent);
            } else {
                context.startService(serviceIntent);
            }
            JSObject ret = new JSObject();
            ret.put("started", true);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Error starting KidProtectionService", e);
            call.reject("Failed to start protection service: " + e.getMessage());
        }
    }

    @PluginMethod
    public void updateEnforcementRules(PluginCall call) {
        Context context = getContext();
        try {
            boolean isLocked = Boolean.TRUE.equals(call.getBoolean("isLocked", false));
            boolean kioskEnabled = Boolean.TRUE.equals(call.getBoolean("kioskEnabled", false));
            String kioskPackage = call.getString("kioskPackage", "");
            com.getcapacitor.JSArray blockedArr = call.getArray("blockedPackages");

            java.util.Set<String> blockedSet = new java.util.HashSet<>();
            if (blockedArr != null) {
                for (int i = 0; i < blockedArr.length(); i++) {
                    try {
                        String pkg = blockedArr.getString(i);
                        if (pkg != null && !pkg.isEmpty()) {
                            blockedSet.add(pkg);
                        }
                    } catch (Exception ignored) {}
                }
            }

            android.content.SharedPreferences.Editor editor = context.getSharedPreferences("KidCareEnforcement", Context.MODE_PRIVATE).edit();
            editor.putBoolean("is_locked", isLocked);
            editor.putBoolean("kiosk_enabled", kioskEnabled);
            editor.putString("kiosk_package", kioskPackage);
            editor.putStringSet("blocked_packages", blockedSet);
            editor.apply();

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Error updating enforcement rules", e);
            call.reject("Failed to update enforcement rules: " + e.getMessage());
        }
    }

    @PluginMethod
    public void wakeUpDevice(PluginCall call) {
        Context context = getContext();
        try {
            PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
            if (pm != null) {
                PowerManager.WakeLock wl = pm.newWakeLock(
                        PowerManager.FULL_WAKE_LOCK | PowerManager.ACQUIRE_CAUSES_WAKEUP | PowerManager.ON_AFTER_RELEASE,
                        "KidCare::WakeUpDevice"
                );
                wl.acquire(5000);
            }
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            Log.w(TAG, "Error waking up device: " + e.getMessage());
            JSObject ret = new JSObject();
            ret.put("success", false);
            call.resolve(ret);
        }
    }

    @PluginMethod
    public void getDeviceInfo(PluginCall call) {
        Context context = getContext();
        JSObject ret = new JSObject();

        String phoneNumber = "";
        String imei = "";
        String macAddress = "";
        String serial = "";
        String androidId = "";
        String hardwareId = "";
        String hardwareIdType = "android_id";

        // 1. Android ID
        try {
            androidId = Settings.Secure.getString(context.getContentResolver(), Settings.Secure.ANDROID_ID);
            if (androidId == null) androidId = "";
        } catch (Exception e) {
            Log.w(TAG, "Cannot read android_id: " + e.getMessage());
        }

        // 2. Phone Number & IMEI from TelephonyManager
        try {
            TelephonyManager tm = (TelephonyManager) context.getSystemService(Context.TELEPHONY_SERVICE);
            if (tm != null) {
                // Phone number
                try {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                        if (ContextCompat.checkSelfPermission(context, Manifest.permission.READ_PHONE_NUMBERS) == PackageManager.PERMISSION_GRANTED) {
                            phoneNumber = tm.getLine1Number();
                        }
                    } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                        if (ContextCompat.checkSelfPermission(context, Manifest.permission.READ_PHONE_NUMBERS) == PackageManager.PERMISSION_GRANTED
                            || ContextCompat.checkSelfPermission(context, Manifest.permission.READ_PHONE_STATE) == PackageManager.PERMISSION_GRANTED
                            || ContextCompat.checkSelfPermission(context, Manifest.permission.READ_SMS) == PackageManager.PERMISSION_GRANTED) {
                            phoneNumber = tm.getLine1Number();
                        }
                    } else {
                        phoneNumber = tm.getLine1Number();
                    }
                } catch (Exception ex) {
                    Log.w(TAG, "tm.getLine1Number error: " + ex.getMessage());
                }

                // SubscriptionManager fallback for phone number
                if ((phoneNumber == null || phoneNumber.isEmpty()) && Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP_MR1) {
                    try {
                        SubscriptionManager sm = (SubscriptionManager) context.getSystemService(Context.TELEPHONY_SUBSCRIPTION_SERVICE);
                        if (sm != null && (ContextCompat.checkSelfPermission(context, Manifest.permission.READ_PHONE_STATE) == PackageManager.PERMISSION_GRANTED
                            || ContextCompat.checkSelfPermission(context, Manifest.permission.READ_PHONE_NUMBERS) == PackageManager.PERMISSION_GRANTED)) {
                            List<SubscriptionInfo> subs = sm.getActiveSubscriptionInfoList();
                            if (subs != null && !subs.isEmpty()) {
                                for (SubscriptionInfo sub : subs) {
                                    String num = sub.getNumber();
                                    if (num != null && !num.isEmpty()) {
                                        phoneNumber = num;
                                        break;
                                    }
                                }
                            }
                        }
                    } catch (Exception ex) {
                        Log.w(TAG, "SubscriptionManager error: " + ex.getMessage());
                    }
                }

                // IMEI
                try {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        if (ContextCompat.checkSelfPermission(context, Manifest.permission.READ_PHONE_STATE) == PackageManager.PERMISSION_GRANTED) {
                            imei = tm.getImei();
                        }
                    } else {
                        imei = tm.getDeviceId();
                    }
                } catch (SecurityException se) {
                    Log.w(TAG, "IMEI access restricted by Android OS: " + se.getMessage());
                } catch (Exception ex) {
                    Log.w(TAG, "tm.getImei error: " + ex.getMessage());
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "TelephonyManager error: " + e.getMessage());
        }

        // 3. Serial Number
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                if (ContextCompat.checkSelfPermission(context, Manifest.permission.READ_PHONE_STATE) == PackageManager.PERMISSION_GRANTED) {
                    serial = Build.getSerial();
                }
            } else {
                serial = Build.SERIAL;
            }
            if ("unknown".equalsIgnoreCase(serial)) serial = "";
        } catch (SecurityException se) {
            Log.w(TAG, "Build.getSerial access restricted: " + se.getMessage());
        } catch (Exception ex) {
            Log.w(TAG, "Build.getSerial error: " + ex.getMessage());
        }

        // 4. MAC Address
        try {
            List<NetworkInterface> all = Collections.list(NetworkInterface.getNetworkInterfaces());
            for (NetworkInterface nif : all) {
                if (nif.getName().equalsIgnoreCase("wlan0") || nif.getName().equalsIgnoreCase("eth0")) {
                    byte[] macBytes = nif.getHardwareAddress();
                    if (macBytes != null && macBytes.length > 0) {
                        StringBuilder res = new StringBuilder();
                        for (byte b : macBytes) {
                            res.append(String.format("%02X:", b));
                        }
                        if (res.length() > 0) res.deleteCharAt(res.length() - 1);
                        String foundMac = res.toString();
                        if (!"02:00:00:00:00:00".equals(foundMac)) {
                            macAddress = foundMac;
                            break;
                        }
                    }
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "MAC address extraction error: " + e.getMessage());
        }

        // 5. Hardware Identifier Priority: IMEI -> MAC -> SERIAL -> ANDROID_ID
        if (imei != null && !imei.isEmpty() && !"unknown".equalsIgnoreCase(imei)) {
            hardwareId = imei;
            hardwareIdType = "imei";
        } else if (macAddress != null && !macAddress.isEmpty() && !"02:00:00:00:00:00".equals(macAddress)) {
            hardwareId = macAddress;
            hardwareIdType = "mac";
        } else if (serial != null && !serial.isEmpty() && !"unknown".equalsIgnoreCase(serial)) {
            hardwareId = serial;
            hardwareIdType = "serial";
        } else if (androidId != null && !androidId.isEmpty()) {
            hardwareId = androidId;
            hardwareIdType = "android_id";
        } else {
            hardwareId = "dev_" + Build.BOARD + "_" + Build.MODEL;
            hardwareIdType = "fallback";
        }

        // 6. Device Name, Model, Manufacturer
        String manufacturer = Build.MANUFACTURER != null ? Build.MANUFACTURER : "Android";
        String model = Build.MODEL != null ? Build.MODEL : "Device";
        String deviceName = "";
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N_MR1) {
                deviceName = Settings.Global.getString(context.getContentResolver(), Settings.Global.DEVICE_NAME);
            }
        } catch (Exception ignored) {}
        if (deviceName == null || deviceName.isEmpty()) {
            try {
                deviceName = Settings.Secure.getString(context.getContentResolver(), "bluetooth_name");
            } catch (Exception ignored) {}
        }
        if (deviceName == null || deviceName.isEmpty()) {
            deviceName = (manufacturer.substring(0, 1).toUpperCase() + manufacturer.substring(1) + " " + model).trim();
        }

        String osVersion = "Android " + Build.VERSION.RELEASE + " (API " + Build.VERSION.SDK_INT + ")";

        ret.put("phoneNumber", phoneNumber != null ? phoneNumber : "");
        ret.put("imei", imei != null ? imei : "");
        ret.put("mac", macAddress != null ? macAddress : "");
        ret.put("serial", serial != null ? serial : "");
        ret.put("androidId", androidId != null ? androidId : "");
        ret.put("hardwareId", hardwareId);
        ret.put("hardwareIdType", hardwareIdType);
        ret.put("manufacturer", manufacturer);
        ret.put("model", model);
        ret.put("deviceName", deviceName);
        ret.put("osVersion", osVersion);

        call.resolve(ret);
    }

    @PluginMethod
    public void requestPhonePermissions(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            String[] perms;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                perms = new String[]{
                    Manifest.permission.READ_PHONE_STATE,
                    Manifest.permission.READ_PHONE_NUMBERS
                };
            } else {
                perms = new String[]{
                    Manifest.permission.READ_PHONE_STATE,
                    Manifest.permission.READ_PHONE_NUMBERS,
                    Manifest.permission.READ_SMS
                };
            }
            if (getActivity() != null) {
                getActivity().requestPermissions(perms, 1002);
            }
        }
        JSObject ret = new JSObject();
        ret.put("requested", true);
        call.resolve(ret);
    }

    private boolean isOverlayPermissionGranted(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            return Settings.canDrawOverlays(context);
        }
        return true;
    }

    private boolean isAccessibilityServiceEnabled(Context context) {
        String serviceName = context.getPackageName() + "/" + KidAccessibilityService.class.getName();
        int accessibilityEnabled = 0;
        try {
            accessibilityEnabled = Settings.Secure.getInt(
                context.getContentResolver(),
                Settings.Secure.ACCESSIBILITY_ENABLED
            );
        } catch (Settings.SettingNotFoundException e) {
            Log.e(TAG, "Settings.SettingNotFoundException: " + e.getMessage());
        }

        if (accessibilityEnabled == 1) {
            String settingValue = Settings.Secure.getString(
                context.getContentResolver(),
                Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
            );
            if (settingValue != null) {
                TextUtils.SimpleStringSplitter splitter = new TextUtils.SimpleStringSplitter(':');
                splitter.setString(settingValue);
                while (splitter.hasNext()) {
                    String accessibilityService = splitter.next();
                    if (accessibilityService.equalsIgnoreCase(serviceName) || accessibilityService.contains(context.getPackageName())) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    private boolean isDeviceAdminActive(Context context) {
        DevicePolicyManager dpm = (DevicePolicyManager) context.getSystemService(Context.DEVICE_POLICY_SERVICE);
        if (dpm != null) {
            ComponentName comp = new ComponentName(context, KidDeviceAdminReceiver.class);
            return dpm.isAdminActive(comp);
        }
        return false;
    }

    private boolean isLocationPermissionGranted(Context context) {
        int fineLocation = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION);
        int coarseLocation = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION);
        return fineLocation == PackageManager.PERMISSION_GRANTED || coarseLocation == PackageManager.PERMISSION_GRANTED;
    }

    private boolean isBatteryOptimizationIgnored(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
            if (pm != null) {
                return pm.isIgnoringBatteryOptimizations(context.getPackageName());
            }
        }
        return true;
    }

    private boolean isUsageStatsPermissionGranted(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            try {
                AppOpsManager appOps = (AppOpsManager) context.getSystemService(Context.APP_OPS_SERVICE);
                int mode = appOps.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, android.os.Process.myUid(), context.getPackageName());
                return mode == AppOpsManager.MODE_ALLOWED;
            } catch (Exception e) {
                return false;
            }
        }
        return true;
    }

    private boolean isWriteSettingsPermissionGranted(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            return Settings.System.canWrite(context);
        }
        return true;
    }

    private boolean isCameraPermissionGranted(Context context) {
        return ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED;
    }

    private boolean isActivityRecognitionPermissionGranted(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            return ContextCompat.checkSelfPermission(context, Manifest.permission.ACTIVITY_RECOGNITION) == PackageManager.PERMISSION_GRANTED;
        }
        return true;
    }

    private boolean isCalendarPermissionGranted(Context context) {
        return ContextCompat.checkSelfPermission(context, Manifest.permission.READ_CALENDAR) == PackageManager.PERMISSION_GRANTED;
    }

    private boolean isAudioPermissionGranted(Context context) {
        return ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED;
    }

    @PluginMethod
    public void setFlashlight(PluginCall call) {
        boolean enabled = Boolean.TRUE.equals(call.getBoolean("enabled", false));
        Context context = getContext();
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                CameraManager cameraManager = (CameraManager) context.getSystemService(Context.CAMERA_SERVICE);
                if (cameraManager != null) {
                    String[] cameraIdList = cameraManager.getCameraIdList();
                    if (cameraIdList.length > 0) {
                        String cameraId = cameraIdList[0];
                        cameraManager.setTorchMode(cameraId, enabled);
                        JSObject ret = new JSObject();
                        ret.put("success", true);
                        ret.put("enabled", enabled);
                        call.resolve(ret);
                        return;
                    }
                }
            }
            JSObject ret = new JSObject();
            ret.put("success", false);
            ret.put("reason", "Camera torch not available");
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Error toggling flashlight", e);
            JSObject ret = new JSObject();
            ret.put("success", false);
            ret.put("error", e.getMessage());
            call.resolve(ret);
        }
    }

    @PluginMethod
    public void setHardwareControl(PluginCall call) {
        Context context = getContext();
        JSObject ret = new JSObject();
        try {
            // 1. Volume
            if (call.hasOption("volume")) {
                int vol = call.getInt("volume", 50);
                vol = Math.max(0, Math.min(100, vol));
                AudioManager am = (AudioManager) context.getSystemService(Context.AUDIO_SERVICE);
                if (am != null) {
                    int maxVol = am.getStreamMaxVolume(AudioManager.STREAM_MUSIC);
                    int targetVol = (int) Math.round((vol / 100.0) * maxVol);
                    am.setStreamVolume(AudioManager.STREAM_MUSIC, targetVol, 0);
                    ret.put("volume", vol);
                }
            }

            // 2. Brightness
            if (call.hasOption("brightness")) {
                int brightVal = call.getInt("brightness", 50);
                final int bright = Math.max(0, Math.min(100, brightVal));
                final float winBrightness = (float) (bright / 100.0);
                if (getActivity() != null) {
                    getActivity().runOnUiThread(() -> {
                        try {
                            WindowManager.LayoutParams lp = getActivity().getWindow().getAttributes();
                            lp.screenBrightness = winBrightness;
                            getActivity().getWindow().setAttributes(lp);
                        } catch (Exception ignored) {}
                    });
                }
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && Settings.System.canWrite(context)) {
                    int sysBright = (int) Math.round((bright / 100.0) * 255);
                    Settings.System.putInt(context.getContentResolver(), Settings.System.SCREEN_BRIGHTNESS, sysBright);
                }
                ret.put("brightness", bright);
            }

            // 3. Flashlight
            if (call.hasOption("flashlight")) {
                boolean flash = Boolean.TRUE.equals(call.getBoolean("flashlight", false));
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    CameraManager cm = (CameraManager) context.getSystemService(Context.CAMERA_SERVICE);
                    if (cm != null && cm.getCameraIdList().length > 0) {
                        cm.setTorchMode(cm.getCameraIdList()[0], flash);
                    }
                }
                ret.put("flashlight", flash);
            }

            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Error setting hardware control", e);
            ret.put("success", false);
            ret.put("error", e.getMessage());
            call.resolve(ret);
        }
    }

    @PluginMethod
    public void getHardwareStatus(PluginCall call) {
        Context context = getContext();
        JSObject ret = new JSObject();
        try {
            AudioManager am = (AudioManager) context.getSystemService(Context.AUDIO_SERVICE);
            int volumePercent = 50;
            if (am != null) {
                int curVol = am.getStreamVolume(AudioManager.STREAM_MUSIC);
                int maxVol = am.getStreamMaxVolume(AudioManager.STREAM_MUSIC);
                if (maxVol > 0) {
                    volumePercent = (int) Math.round((curVol * 100.0) / maxVol);
                }
            }
            int brightnessPercent = 50;
            try {
                int sysBright = Settings.System.getInt(context.getContentResolver(), Settings.System.SCREEN_BRIGHTNESS);
                brightnessPercent = (int) Math.round((sysBright * 100.0) / 255.0);
            } catch (Exception ignored) {}

            ret.put("volume", volumePercent);
            ret.put("brightness", brightnessPercent);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Error getting hardware status: " + e.getMessage());
        }
    }

    @PluginMethod
    public void controlMedia(PluginCall call) {
        String action = call.getString("action", "play_pause");
        Context context = getContext();
        try {
            AudioManager am = (AudioManager) context.getSystemService(Context.AUDIO_SERVICE);
            if (am != null) {
                int keyCode = KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE;
                if ("play".equalsIgnoreCase(action)) {
                    keyCode = KeyEvent.KEYCODE_MEDIA_PLAY;
                } else if ("pause".equalsIgnoreCase(action)) {
                    keyCode = KeyEvent.KEYCODE_MEDIA_PAUSE;
                } else if ("next".equalsIgnoreCase(action)) {
                    keyCode = KeyEvent.KEYCODE_MEDIA_NEXT;
                } else if ("prev".equalsIgnoreCase(action) || "previous".equalsIgnoreCase(action)) {
                    keyCode = KeyEvent.KEYCODE_MEDIA_PREVIOUS;
                } else if ("stop".equalsIgnoreCase(action)) {
                    keyCode = KeyEvent.KEYCODE_MEDIA_STOP;
                }

                KeyEvent downEvent = new KeyEvent(KeyEvent.ACTION_DOWN, keyCode);
                KeyEvent upEvent = new KeyEvent(KeyEvent.ACTION_UP, keyCode);
                am.dispatchMediaKeyEvent(downEvent);
                am.dispatchMediaKeyEvent(upEvent);

                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("action", action);
                call.resolve(ret);
                return;
            }
            call.reject("AudioManager not available");
        } catch (Exception e) {
            Log.e(TAG, "Error controlling media: " + action, e);
            call.reject("Failed to control media: " + e.getMessage());
        }
    }

    @PluginMethod
    public void getUsageStats(PluginCall call) {
        new Thread(() -> {
            Context context = getContext();
            JSObject ret = new JSObject();
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                try {
                    UsageStatsManager usm = (UsageStatsManager) context.getSystemService(Context.USAGE_STATS_SERVICE);
                    if (usm != null) {
                        Calendar cal = Calendar.getInstance();
                        cal.set(Calendar.HOUR_OF_DAY, 0);
                        cal.set(Calendar.MINUTE, 0);
                        cal.set(Calendar.SECOND, 0);
                        long startTime = cal.getTimeInMillis();
                        long endTime = System.currentTimeMillis();

                        List<UsageStats> stats = usm.queryUsageStats(UsageStatsManager.INTERVAL_DAILY, startTime, endTime);
                        JSArray appUsageList = new JSArray();
                        long totalMinutesToday = 0;

                        if (stats != null) {
                            for (UsageStats u : stats) {
                                long totalTimeMillis = u.getTotalTimeInForeground();
                                if (totalTimeMillis > 30000) {
                                    long mins = totalTimeMillis / 60000;
                                    totalMinutesToday += mins;
                                    JSObject item = new JSObject();
                                    item.put("packageName", u.getPackageName());
                                    item.put("usedMinutes", mins);
                                    item.put("lastTimeUsed", u.getLastTimeUsed());
                                    appUsageList.put(item);
                                }
                            }
                        }

                        ret.put("isGranted", isUsageStatsPermissionGranted(context));
                        ret.put("totalMinutesToday", totalMinutesToday);
                        ret.put("appsUsage", appUsageList);
                        call.resolve(ret);
                        return;
                    }
                } catch (Exception e) {
                    Log.w(TAG, "queryUsageStats error: " + e.getMessage());
                }
            }
            ret.put("isGranted", false);
            ret.put("totalMinutesToday", 0);
            ret.put("appsUsage", new JSArray());
            call.resolve(ret);
        }).start();
    }

    @PluginMethod
    public void getHealthData(PluginCall call) {
        Context context = getContext();
        JSObject ret = new JSObject();
        try {
            SensorManager sm = (SensorManager) context.getSystemService(Context.SENSOR_SERVICE);
            if (sm != null) {
                Sensor stepSensor = sm.getDefaultSensor(Sensor.TYPE_STEP_COUNTER);
                ret.put("sensorAvailable", stepSensor != null);
            } else {
                ret.put("sensorAvailable", false);
            }
            android.content.SharedPreferences sp = context.getSharedPreferences("KidCareHealth", Context.MODE_PRIVATE);
            int cachedSteps = sp.getInt("daily_steps", 0);
            ret.put("dailySteps", cachedSteps);
            ret.put("isActivityRecognitionGranted", isActivityRecognitionPermissionGranted(context));
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Error getting health data: " + e.getMessage());
        }
    }

    @PluginMethod
    public void requestAllAppPermissions(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && getActivity() != null) {
            List<String> perms = new java.util.ArrayList<>();
            perms.add(Manifest.permission.ACCESS_FINE_LOCATION);
            perms.add(Manifest.permission.ACCESS_COARSE_LOCATION);
            perms.add(Manifest.permission.CAMERA);
            perms.add(Manifest.permission.RECORD_AUDIO);
            perms.add(Manifest.permission.READ_PHONE_STATE);
            perms.add(Manifest.permission.READ_CALENDAR);
            perms.add(Manifest.permission.WRITE_CALENDAR);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                perms.add(Manifest.permission.ACTIVITY_RECOGNITION);
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                perms.add(Manifest.permission.POST_NOTIFICATIONS);
                perms.add(Manifest.permission.READ_PHONE_NUMBERS);
            }
            getActivity().requestPermissions(perms.toArray(new String[0]), 1005);
        }
        JSObject ret = new JSObject();
        ret.put("requested", true);
        call.resolve(ret);
    }
}
