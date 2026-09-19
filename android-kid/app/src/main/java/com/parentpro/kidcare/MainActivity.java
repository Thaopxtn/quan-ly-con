package com.parentpro.kidcare;

import android.os.Bundle;
import android.util.Log;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.WebViewListener;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "MainActivity";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(KidPermissionsPlugin.class);
        super.onCreate(savedInstanceState);

        // Configure Status Bar color to match Kid app title header (#0ea5e9) with white icons
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.LOLLIPOP) {
            getWindow().addFlags(android.view.WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
            getWindow().setStatusBarColor(android.graphics.Color.parseColor("#0ea5e9"));
        }
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
            android.view.View decor = getWindow().getDecorView();
            decor.setSystemUiVisibility(decor.getSystemUiVisibility() & ~android.view.View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR);
        }

        if (bridge != null) {
            WebView.setWebContentsDebuggingEnabled(true);
            if (bridge.getWebView() != null) {
                WebSettings settings = bridge.getWebView().getSettings();
                settings.setDomStorageEnabled(true);
                settings.setDatabaseEnabled(true);
                settings.setCacheMode(WebSettings.LOAD_DEFAULT);
            }
            bridge.addWebViewListener(new WebViewListener() {
                @Override
                public boolean onRenderProcessGone(WebView webView, RenderProcessGoneDetail detail) {
                    Log.w(TAG, "WebView render process gone (recovered gracefully without terminating app).");
                    if (webView != null) {
                        try {
                            webView.post(new Runnable() {
                                @Override
                                public void run() {
                                    try {
                                        MainActivity.this.recreate();
                                    } catch (Exception e) {
                                        Log.e(TAG, "Failed to recreate activity after render process gone", e);
                                    }
                                }
                            });
                        } catch (Exception ignored) {}
                    }
                    return true;
                }
            });
        }
    }

    @Override
    public void onBackPressed() {
        if (bridge != null && bridge.getWebView() != null) {
            bridge.getWebView().evaluateJavascript(
                "(function() { " +
                "  try { " +
                "    if (typeof window.handleHardwareBack === 'function') { " +
                "      return window.handleHardwareBack() ? 'true' : 'false'; " +
                "    } " +
                "  } catch(e) {} " +
                "  return 'false'; " +
                "})();",
                new android.webkit.ValueCallback<String>() {
                    @Override
                    public void onReceiveValue(String value) {
                        if (value == null || !value.contains("true")) {
                            moveTaskToBack(true);
                        }
                    }
                }
            );
            return;
        }
        super.onBackPressed();
    }
}
