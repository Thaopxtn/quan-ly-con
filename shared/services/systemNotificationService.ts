// System Notification Service for ParentPro
// Standard OS-level and browser notifications (non-intrusive, dismissible)

export interface SystemNotificationOptions {
  body?: string;
  icon?: string;
  tag?: string;
  badge?: string;
  data?: any;
  silent?: boolean;
}

/**
 * Request permission for native browser/system notifications.
 */
export async function requestSystemNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  try {
    if (Notification.permission === 'granted') {
      return true;
    }
    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
  } catch (e) {
    console.warn('Error requesting notification permission:', e);
  }
  return false;
}

export type NotificationSoundType = 'info' | 'success' | 'warning' | 'emergency';

export interface SystemNotificationOptions {
  body?: string;
  icon?: string;
  tag?: string;
  badge?: string;
  data?: any;
  silent?: boolean;
  soundType?: NotificationSoundType;
}

/**
 * Play an expressive, non-blocking chime using Web Audio API
 */
export function playNotificationSound(type: NotificationSoundType = 'info') {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    const now = ctx.currentTime;

    if (type === 'success') {
      // Triad chord C5 -> E5 -> G5
      [523.25, 659.25, 783.99].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.08);
        gain.gain.setValueAtTime(0.2, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.35);
      });
    } else if (type === 'warning') {
      // 2-tone warning A5 -> F5
      [880.0, 698.46].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.15);
        gain.gain.setValueAtTime(0.25, now + i * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.15);
        osc.stop(now + i * 0.15 + 0.3);
      });
    } else if (type === 'emergency') {
      // 3 pulses urgent siren
      for (let i = 0; i < 3; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(900, now + i * 0.18);
        osc.frequency.linearRampToValueAtTime(1200, now + i * 0.18 + 0.15);
        gain.gain.setValueAtTime(0.3, now + i * 0.18);
        gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.18 + 0.17);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.18);
        osc.stop(now + i * 0.18 + 0.17);
      }
    } else {
      // Standard gentle info chime E5 -> A5
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, now);
      gain1.gain.setValueAtTime(0.2, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.25);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880.0, now + 0.12);
      gain2.gain.setValueAtTime(0.25, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.45);
    }
  } catch (e) {
    // Audio unsupported or autoplay restrictions
  }
}

/**
 * Play a gentle, non-blocking 2-tone chime using Web Audio API
 */
export function playSystemChime() {
  playNotificationSound('info');
}

/**
 * Post a standard system notification (non-blocking)
 */
export function showSystemNotification(title: string, options?: SystemNotificationOptions): Notification | null {
  if (typeof window === 'undefined') return null;

  if (!options?.silent) {
    playNotificationSound(options?.soundType || 'info');
    try {
      if ('vibrate' in navigator) {
        if (options?.soundType === 'emergency') {
          navigator.vibrate([300, 100, 300, 100, 400]);
        } else {
          navigator.vibrate([150, 75, 150]);
        }
      }
    } catch (e) {}
  }

  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      const notif = new Notification(title, {
        body: options?.body || '',
        icon: options?.icon || '/icons/icon-192.png',
        tag: options?.tag || `notif_${Date.now()}`,
        ...options,
      });

      notif.onclick = () => {
        window.focus();
        notif.close();
      };
      return notif;
    } catch (e) {
      console.warn('Standard Notification failed:', e);
    }
  }
  return null;
}

/**
 * Convenience helper to show emergency alert notification in standard system format
 */
export function notifyEmergencyAlert(childName: string, address?: string, time?: string) {
  const notifTime = time || new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const notifAddress = address || 'Đang xác định toạ độ...';
  const childTag = childName.toLowerCase().replace(/\s+/g, '_');

  showSystemNotification(`🚨 Báo động SOS: ${childName}`, {
    body: `Lúc ${notifTime} tại: ${notifAddress}. Nhấn để xem vị trí.`,
    tag: `sos_alert_${childTag}`,
    silent: false,
    soundType: 'emergency',
  });
}
