const fs = require('fs');
let content = fs.readFileSync('D:/luufilelaptrinh/quan ly con/android-kid/app/src/main/java/com/lethao/kidcare/KidProtectionService.java', 'utf8');

const importBlock = `import android.Manifest;
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

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
`;

content = content.replace(/import android\.Manifest;[\s\S]*?import androidx\.core\.content\.ContextCompat;/g, importBlock);

const classBody = `public class KidProtectionService extends Service {
    private static final String TAG = "KidProtectionService";
    private static final String CHANNEL_ID = "kidcare_protection_channel";
    private static final int NOTIFICATION_ID = 1001;
    private PowerManager.WakeLock wakeLock;

    private WindowManager windowManager;
    private View lockOverlayView;
    private SharedPreferences prefs;
    private SharedPreferences.OnSharedPreferenceChangeListener prefsListener;

    private Thread commandPollerThread;
    private boolean isPolling = false;

    private void startCommandPoller() {
        if (isPolling) return;
        isPolling = true;
        commandPollerThread = new Thread(() -> {
            while (isPolling) {
                try {
                    Thread.sleep(3500); // Poll every 3.5 seconds
                    if (prefs == null) continue;
                    String serverUrl = prefs.getString("serverUrl", "");
                    String childId = prefs.getString("childId", "");
                    
                    if (serverUrl.isEmpty() || childId.isEmpty()) continue;

                    URL url = new URL(serverUrl + "/api/command?childId=" + childId);
                    HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                    conn.setRequestMethod("GET");
                    conn.setConnectTimeout(5000);
                    conn.setReadTimeout(5000);

                    if (conn.getResponseCode() == 200) {
                        BufferedReader in = new BufferedReader(new InputStreamReader(conn.getInputStream()));
                        StringBuilder response = new StringBuilder();
                        String line;
                        while ((line = in.readLine()) != null) {
                            response.append(line);
                        }
                        in.close();

                        String json = response.toString();
                        if (json.contains("\\\"status\\\":\\\"pending\\\"")) {
                            Log.i(TAG, "Found pending command! Waking up MainActivity...");
                            // Wake up JS to process the command and send ACK
                            wakeUpMainActivity();
                            // Sleep a bit longer to let JS process and send ACK
                            Thread.sleep(3000);
                        }
                    }
                } catch (Exception e) {
                    // Ignore network errors in background
                }
            }
        });
        commandPollerThread.start();
    }

    private void wakeUpMainActivity() {
        try {
            Intent intent = new Intent(this, MainActivity.class);
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            startActivity(intent);
        } catch (Exception e) {
            Log.e(TAG, "Failed to wake up MainActivity", e);
        }
    }
`;

content = content.replace(/public class KidProtectionService extends Service \{[\s\S]*?private SharedPreferences\.OnSharedPreferenceChangeListener prefsListener;/g, classBody);

const onCreateStart = `    @Override
    public void onCreate() {
        super.onCreate();
        Log.i(TAG, "KidProtectionService created");
        createNotificationChannel();`;

const newOnCreateStart = `    @Override
    public void onCreate() {
        super.onCreate();
        Log.i(TAG, "KidProtectionService created");
        createNotificationChannel();
        startCommandPoller();`;

content = content.replace(onCreateStart, newOnCreateStart);

const onDestroyEnd = `    @Override
    public void onDestroy() {
        super.onDestroy();`;

const newOnDestroyEnd = `    @Override
    public void onDestroy() {
        isPolling = false;
        super.onDestroy();`;

content = content.replace(onDestroyEnd, newOnDestroyEnd);

fs.writeFileSync('D:/luufilelaptrinh/quan ly con/android-kid/app/src/main/java/com/lethao/kidcare/KidProtectionService.java', content);
console.log("Done");
