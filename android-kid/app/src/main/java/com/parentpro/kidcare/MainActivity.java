package com.parentpro.kidcare;

import android.os.Bundle;
import android.util.Log;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.WebViewListener;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "MainActivity";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(KidPermissionsPlugin.class);
        super.onCreate(savedInstanceState);

        if (bridge != null) {
            WebView.setWebContentsDebuggingEnabled(true);
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
