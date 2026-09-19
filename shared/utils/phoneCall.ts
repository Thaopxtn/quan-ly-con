import { safeCopyToClipboard } from './clipboard';

/**
 * Safe Phone Call Utility
 * Prevents white screen / document unload on web browsers when clicking tel: links.
 * Works seamlessly on:
 * - Desktop Web (Chrome, Edge, Firefox, Safari)
 * - Mobile Web (Android Chrome, iOS Safari)
 * - Native Android / iOS WebView (Capacitor)
 */
export function makePhoneCall(phoneNumber: string): boolean {
  if (typeof window === 'undefined') return false;
  const cleanNumber = (phoneNumber || '').replace(/[^0-9+]/g, '');
  if (!cleanNumber) return false;

  const telUri = `tel:${cleanNumber}`;

  // 1. On Native Capacitor: open system dialer without unloading WebView
  try {
    if ((window as any).Capacitor?.isNativePlatform?.()) {
      window.open(telUri, '_system');
      return true;
    }
  } catch (e) {}

  // 2. On Mobile Web browsers: use a temporary invisible <a> click
  const isMobile = typeof navigator !== 'undefined' && /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (isMobile) {
    try {
      const a = document.createElement('a');
      a.href = telUri;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        try {
          document.body.removeChild(a);
        } catch (e) {}
      }, 1000);
      return true;
    } catch (e) {}
  }

  // 3. On Desktop Web: NEVER navigate window.location directly (which causes white screen)!
  // Use a hidden iframe to trigger the protocol handler cleanly.
  try {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = telUri;
    document.body.appendChild(iframe);
    setTimeout(() => {
      try {
        document.body.removeChild(iframe);
      } catch (err) {}
    }, 2500);
    return true;
  } catch (err) {
    return false;
  }
}
