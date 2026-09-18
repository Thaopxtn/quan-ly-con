package com.parentpro.parent;

import android.os.Bundle;
import android.util.Log;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.WebViewListener;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "ParentMainActivity";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

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
}
