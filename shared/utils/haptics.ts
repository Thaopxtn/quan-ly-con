/**
 * Safe mobile haptic feedback utility.
 * Works seamlessly across web browsers and Android WebView / Capacitor.
 */
export const haptics = {
  light: () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(12);
      }
    } catch (_) {}
  },
  medium: () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(28);
      }
    } catch (_) {}
  },
  heavy: () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(65);
      }
    } catch (_) {}
  },
  success: () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([15, 30, 25]);
      }
    } catch (_) {}
  },
  warning: () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([40, 50, 40, 50, 70]);
      }
    } catch (_) {}
  },
  impact: () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(24);
      }
    } catch (_) {}
  },
  selection: () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(10);
      }
    } catch (_) {}
  },
};
