// Event Bus for Real-time Two-way Communication between Parent and Child Apps

export type EventType =
  | 'APP_STATUS_CHANGED'
  | 'APP_LIMIT_UPDATED'
  | 'STUDY_MODE_TOGGLED'
  | 'SOS_TRIGGERED'
  | 'SOS_CANCELLED'
  | 'LOCATION_UPDATED'
  | 'SAFE_ZONE_TOGGLED'
  | 'TIME_EXTENSION_REQUESTED'
  | 'TIME_EXTENSION_RESOLVED'
  | 'TASK_STATUS_CHANGED'
  | 'CHILD_MESSAGE_SENT'
  | 'HARDWARE_CONTROL_CHANGED'
  | 'HARDWARE_PERMISSION_REQUESTED'
  | 'HARDWARE_PERMISSION_RESOLVED'
  | 'KIOSK_MODE_CHANGED'
  | 'REMOTE_APP_OPEN'
  | 'BROADCAST_MESSAGE_SENT'
  | 'BROADCAST_MESSAGE_CLEARED'
  | 'LOCK_CHALLENGE_UPDATED'
  | 'CHALLENGE_SOLVED'
  | 'SMART_ROUTINE_CHANGED'
  | 'VOICE_GUIDE_TRIGGERED'
  | 'REMINDER_TRIGGERED'
  | 'SENSOR_SIMULATED'
  | 'LIVE_STREAM_TOGGLED'
  | 'CHILD_SWITCHED'
  | 'CHILD_ADDED'
  | 'AVATAR_UPDATED'
  | 'STAR_GIFTED'
  | 'TASK_ASSIGNED'
  | 'REWARD_REDEEMED'
  | 'REWARD_APPROVED'
  | 'REWARD_CATALOG_UPDATED'
  | 'SENSOR_TOGGLED'
  | 'FAMILY_ACTION_TRIGGERED'
  | 'DATA_RESET'
  | 'NOTIFICATION_UPDATED'
  | 'NOTIFICATION_CREATED'
  | 'KID_NOTIFICATION_RESPONSE'
  | 'MEDIA_STATE_UPDATED'
  | 'MEDIA_CONTROL_CMD'
  | 'NETWORK_INFO_UPDATED'
  | 'SENSOR_DATA_UPDATED'
  | 'ALARM_UPDATED'
  | 'TIMER_UPDATED'
  | 'SCHEDULE_UPDATED'
  | 'TRACKING_CONFIG_CHANGED'
  | 'PAIRING_REQUESTED'
  | 'PAIRING_APPROVED'
  | 'PAIRING_REJECTED'
  | 'PAIRING_SESSION_CREATED';

export interface BusEvent<T = any> {
  id?: string;
  type: EventType;
  payload: T;
  timestamp: number;
  sender: 'parent' | 'child' | 'system';
}

class ParentProEventBus {
  private channel: BroadcastChannel | null = null;
  private listeners: Map<EventType, Set<(payload: any) => void>> = new Map();
  private seenEventIds: Set<string> = new Set();
  private readonly maxSeen = 300;

  private recordSeen(id: string) {
    this.seenEventIds.add(id);
    if (this.seenEventIds.size > this.maxSeen) {
      const first = this.seenEventIds.values().next().value;
      if (first) this.seenEventIds.delete(first);
    }
  }

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.channel = new BroadcastChannel('parent_pro_sync_bus');
      this.channel.onmessage = (event: MessageEvent<BusEvent>) => {
        const evt = event.data;
        if (!evt) return;
        if (evt.id && this.seenEventIds.has(evt.id)) return;
        if (evt.id) this.recordSeen(evt.id);
        this.notify(evt.type, evt.payload);
      };
    }

    // Storage fallback (only for browsers without BroadcastChannel, or fallback tabs)
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === 'parent_pro_storage_event' && e.newValue) {
          try {
            const data: BusEvent = JSON.parse(e.newValue);
            if (!data) return;
            // Prevent duplicate handling if BroadcastChannel already processed it
            if (data.id && this.seenEventIds.has(data.id)) return;
            if (data.id) this.recordSeen(data.id);
            this.notify(data.type, data.payload);
          } catch (err) {
            console.error('Storage parse error:', err);
          }
        }
      });
    }
  }

  public publish<T>(type: EventType, payload: T, sender: 'parent' | 'child' | 'system' = 'parent') {
    const eventId = 'evt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    const eventData: BusEvent<T> = {
      id: eventId,
      type,
      payload,
      timestamp: Date.now(),
      sender,
    };
    this.recordSeen(eventId);

    // Notify local listeners
    this.notify(type, payload);

    // Broadcast across windows/tabs
    if (this.channel) {
      try {
        this.channel.postMessage(eventData);
      } catch (e) {
        console.warn('BroadcastChannel postMessage failed:', e);
      }
    }

    // Fallback trigger for other tabs without active BroadcastChannel
    try {
      localStorage.setItem('parent_pro_storage_event', JSON.stringify(eventData));
    } catch (e) {
      // ignore
    }
  }

  public emit<T>(type: EventType, payload: T, sender: 'parent' | 'child' | 'system' = 'parent') {
    this.publish(type, payload, sender);
  }

  public subscribe<T>(type: EventType, callback: (payload: T) => void): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(callback);

    // Return un-subscribe function
    return () => {
      this.listeners.get(type)?.delete(callback);
    };
  }

  private notify(type: EventType, payload: any) {
    const handlers = this.listeners.get(type);
    if (handlers) {
      handlers.forEach((fn) => {
        try {
          fn(payload);
        } catch (e) {
          console.error(`Error in handler for ${type}:`, e);
        }
      });
    }
  }
}

export const eventBus = new ParentProEventBus();
export const parentProEventBus = eventBus;
