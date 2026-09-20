import confetti from 'canvas-confetti';
import { Capacitor } from '@capacitor/core';

/**
 * Safely fires confetti on Web/Desktop browsers while strictly avoiding
 * full-screen canvas overlays on Android/iOS native WebViews.
 * On Android WebViews, hardware-accelerated full-screen canvas elements
 * capture touch hit-tests even with pointer-events: none, causing the app
 * to completely freeze and become unclickable.
 */
export function fireSafeConfetti(opts?: confetti.Options): void {
  if (typeof window === 'undefined') return;

  // On native mobile platforms (Android/iOS), skip canvas injection to prevent touch freeze
  if (Capacitor.isNativePlatform()) {
    return;
  }

  try {
    confetti(opts);
  } catch (err) {
    console.warn('[safeConfetti] confetti invocation failed gracefully:', err);
  }
}

/**
 * Forcefully cleans up and removes any rogue canvas elements created by confetti
 * or other overlays on document.body, restoring 100% touch interactivity.
 */
export function resetSafeConfetti(): void {
  if (typeof document === 'undefined') return;

  try {
    if (typeof (confetti as any).reset === 'function') {
      (confetti as any).reset();
    }
  } catch (e) {}

  try {
    // Forcefully remove any full-screen fixed canvases attached to body
    const canvases = document.querySelectorAll('canvas');
    canvases.forEach((canvas) => {
      const style = window.getComputedStyle(canvas);
      if (
        style.position === 'fixed' ||
        style.position === 'absolute' ||
        (style.zIndex && parseInt(style.zIndex, 10) > 1000)
      ) {
        if (canvas.parentNode) {
          canvas.parentNode.removeChild(canvas);
        }
      }
    });
  } catch (err) {
    console.warn('[safeConfetti] canvas cleanup error:', err);
  }
}

export default fireSafeConfetti;
