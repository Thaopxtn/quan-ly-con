/**
 * High-Performance Server API & Realtime SSE Client for ParentPro & KidCare
 * Replaces Firebase Realtime Database with direct, zero-quota PC Server / 4G connection.
 */

export interface ServerHealth {
  ok: boolean;
  latencyMs?: number;
  info?: any;
}

type EventCallback = (data: any) => void;

const SERVER_URL_STORAGE_KEY = 'parentpro_server_url';
const DEFAULT_LOCAL_PORT = 3000;

export class ServerApiClient {
  private static instance: ServerApiClient;
  private serverUrl: string = '';
  private eventSource: EventSource | null = null;
  private listeners: Map<string, Set<EventCallback>> = new Map();
  private isConnecting: boolean = false;
  private reconnectTimer: any = null;
  private reconnectAttempts: number = 0;
  private heartbeatWatchdog: any = null;

  private constructor() {
    this.serverUrl = this.initServerUrl();
    if (typeof window !== 'undefined') {
      // Auto-start SSE subscription in browser / webview
      this.initRealtimeStream();
    }
  }

  public static getInstance(): ServerApiClient {
    if (!ServerApiClient.instance) {
      ServerApiClient.instance = new ServerApiClient();
    }
    return ServerApiClient.instance;
  }

  private initServerUrl(): string {
    if (typeof window === 'undefined') return `http://localhost:${DEFAULT_LOCAL_PORT}`;

    // 1. User configured URL in localStorage
    const saved = localStorage.getItem(SERVER_URL_STORAGE_KEY);
    if (saved && saved.trim()) {
      return saved.trim().replace(/\/+$/, '');
    }

    // 2. Running on web server directly (e.g. http://localhost:3000, http://192.168.1.x:3000, or trycloudflare.com)
    const host = window.location.hostname;
    if (host && host !== 'localhost' && !host.includes('github.io') && host !== '127.0.0.1') {
      return window.location.origin;
    }

    // 3. Fallback default
    return `http://localhost:${DEFAULT_LOCAL_PORT}`;
  }

  public getServerUrl(): string {
    return this.serverUrl;
  }

  public setServerUrl(newUrl: string): void {
    const cleanUrl = (newUrl || '').trim().replace(/\/+$/, '');
    this.serverUrl = cleanUrl || `http://localhost:${DEFAULT_LOCAL_PORT}`;
    if (typeof window !== 'undefined') {
      localStorage.setItem(SERVER_URL_STORAGE_KEY, this.serverUrl);
    }
    // Reconnect SSE with new URL
    this.reconnectRealtimeStream();
  }

  public async checkHealth(customUrl?: string): Promise<ServerHealth> {
    const target = (customUrl || this.serverUrl).replace(/\/+$/, '');
    const start = Date.now();
    try {
      const ctrl = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), 4000);
      const res = await fetch(`${target}/api/health`, {
        signal: ctrl.signal,
        headers: { 'Cache-Control': 'no-cache' },
      });
      clearTimeout(timeout);
      if (res.ok) {
        const info = await res.json().catch(() => ({}));
        return { ok: true, latencyMs: Date.now() - start, info };
      }
      return { ok: false, latencyMs: Date.now() - start };
    } catch (_) {
      return { ok: false };
    }
  }

  // ─── Realtime Server-Sent Events (SSE) Stream ───────────────────────────

  private initRealtimeStream(): void {
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') return;
    if (this.isConnecting || (this.eventSource && this.eventSource.readyState === EventSource.OPEN)) return;

    this.isConnecting = true;
    const streamUrl = `${this.serverUrl}/api/realtime/stream`;

    try {
      if (this.eventSource) {
        this.eventSource.close();
      }

      const es = new EventSource(streamUrl);
      this.eventSource = es;

      es.onopen = () => {
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.resetWatchdog();
        this.emit('connection_status', { connected: true, url: this.serverUrl });
      };

      // Built-in SSE events
      const registeredEvents = [
        'telemetry',
        'command',
        'command_ack',
        'settings',
        'stars',
        'sos',
        'time_request',
        'time_request_resolved',
        'chat',
        'pairing_created',
        'pairing_connected',
        'children_updated',
        'safe_zones',
        'live_tracking',
        'share_created',
        'share_accepted',
        'share_revoked',
        'pc_config',
        'pc_telemetry',
        'pc_command',
      ];

      registeredEvents.forEach(evtName => {
        es.addEventListener(evtName, (event: MessageEvent) => {
          this.resetWatchdog();
          try {
            const data = JSON.parse(event.data);
            this.emit(evtName, data);
          } catch (e) {
            console.warn(`[SSE parse error] event: ${evtName}`, e);
          }
        });
      });

      es.onmessage = (event: MessageEvent) => {
        this.resetWatchdog();
        try {
          const data = JSON.parse(event.data);
          if (data && data.type) {
            this.emit(data.type, data);
          }
        } catch (_) {}
      };

      es.onerror = () => {
        this.isConnecting = false;
        if (es.readyState === EventSource.CLOSED) {
          this.emit('connection_status', { connected: false, url: this.serverUrl });
          this.scheduleReconnect();
        }
      };
    } catch (err) {
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  private resetWatchdog(): void {
    if (this.heartbeatWatchdog) clearTimeout(this.heartbeatWatchdog);
    // If no ping/event received for 45s, force reconnect
    this.heartbeatWatchdog = setTimeout(() => {
      this.reconnectRealtimeStream();
    }, 45000);
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 15000);
    this.reconnectTimer = setTimeout(() => {
      this.initRealtimeStream();
    }, delay);
  }

  public reconnectRealtimeStream(): void {
    if (this.eventSource) {
      try { this.eventSource.close(); } catch (_) {}
      this.eventSource = null;
    }
    this.isConnecting = false;
    this.initRealtimeStream();
  }

  public on(event: string, callback: EventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => {
      this.off(event, callback);
    };
  }

  public off(event: string, callback: EventCallback): void {
    const set = this.listeners.get(event);
    if (set) {
      set.delete(callback);
      if (set.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  public emit(event: string, data: any): void {
    const set = this.listeners.get(event);
    if (set) {
      set.forEach(cb => {
        try { cb(data); } catch (e) { console.error(`[Event error in ${event}]:`, e); }
      });
    }
  }

  // ─── HTTP REST Helper ───────────────────────────────────────────────────

  private async request<T = any>(
    path: string,
    method: 'GET' | 'POST' | 'DELETE' = 'GET',
    body?: any
  ): Promise<T | null> {
    try {
      const url = `${this.serverUrl}${path}`;
      const options: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
      };
      if (body !== undefined && method !== 'GET') {
        options.body = JSON.stringify(body);
      }
      const res = await fetch(url, options);
      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      return null;
    }
  }

  // ─── Telemetry ─────────────────────────────────────────────────────────

  public async uploadTelemetry(data: any): Promise<boolean> {
    const res = await this.request('/api/telemetry', 'POST', data);
    return Boolean(res && res.success);
  }

  public async getTelemetry(childId?: string, limit: number = 100): Promise<any[]> {
    const qs = childId ? `?childId=${encodeURIComponent(childId)}&limit=${limit}` : `?limit=${limit}`;
    const res = await this.request<{ locations: any[] }>(`/api/telemetry${qs}`);
    return res && Array.isArray(res.locations) ? res.locations : [];
  }

  // ─── Remote Commands & ACKs ─────────────────────────────────────────────

  public async sendCommand(commandData: any): Promise<{ success: boolean; commandId?: string }> {
    const res = await this.request<{ success: boolean; commandId?: string }>('/api/command', 'POST', commandData);
    return {
      success: Boolean(res && res.success),
      commandId: res ? res.commandId : undefined,
    };
  }

  public async getCommands(childId?: string): Promise<any[]> {
    const qs = childId ? `?childId=${encodeURIComponent(childId)}` : '';
    const res = await this.request<{ commands: any[] }>(`/api/command${qs}`);
    return res && Array.isArray(res.commands) ? res.commands : [];
  }

  public async sendCommandAck(ackData: any): Promise<boolean> {
    const res = await this.request('/api/command/ack', 'POST', ackData);
    return Boolean(res && res.success);
  }

  // ─── Child Settings ─────────────────────────────────────────────────────

  public async saveChildSettings(childId: string, settings: any, parentId?: string): Promise<boolean> {
    const res = await this.request('/api/settings', 'POST', { childId, settings, parentId });
    return Boolean(res && res.success);
  }

  public async getChildSettings(childId: string): Promise<any | null> {
    const res = await this.request<{ success: boolean; settings: any }>(`/api/settings?childId=${encodeURIComponent(childId)}`);
    return res && res.settings ? res.settings : null;
  }

  // ─── Stars & Rewards ────────────────────────────────────────────────────

  public async saveChildStars(childId: string, stars: number, transaction?: any, parentId?: string): Promise<boolean> {
    const res = await this.request('/api/stars', 'POST', { childId, stars, transaction, parentId });
    return Boolean(res && res.success);
  }

  public async getChildStars(childId: string): Promise<any> {
    const res = await this.request<{ success: boolean; data: any }>(`/api/stars?childId=${encodeURIComponent(childId)}`);
    return res && res.data ? res.data : { stars: 0, childId };
  }

  // ─── SOS Emergency ──────────────────────────────────────────────────────

  public async triggerSos(sosData: any): Promise<boolean> {
    const res = await this.request('/api/sos', 'POST', sosData);
    return Boolean(res && res.success);
  }

  public async resolveSos(childId: string): Promise<boolean> {
    const res = await this.request('/api/sos/resolve', 'POST', { childId });
    return Boolean(res && res.success);
  }

  public async getActiveSos(childId?: string): Promise<any[]> {
    const qs = childId ? `?childId=${encodeURIComponent(childId)}&active=true` : '?active=true';
    const res = await this.request<{ alerts: any[] }>(`/api/sos${qs}`);
    return res && Array.isArray(res.alerts) ? res.alerts : [];
  }

  // ─── Time Requests ──────────────────────────────────────────────────────

  public async sendTimeRequest(reqData: any): Promise<boolean> {
    const res = await this.request('/api/time-requests', 'POST', reqData);
    return Boolean(res && res.success);
  }

  public async resolveTimeRequest(
    id: string,
    childId: string,
    status: 'approved' | 'rejected',
    approvedMinutes?: number
  ): Promise<boolean> {
    const res = await this.request('/api/time-requests/resolve', 'POST', {
      id,
      childId,
      status,
      approvedMinutes,
      resolvedAt: Date.now(),
    });
    return Boolean(res && res.success);
  }

  public async getTimeRequests(childId?: string): Promise<any[]> {
    const qs = childId ? `?childId=${encodeURIComponent(childId)}` : '';
    const res = await this.request<{ requests: any[] }>(`/api/time-requests${qs}`);
    return res && Array.isArray(res.requests) ? res.requests : [];
  }

  // ─── Family Chat ────────────────────────────────────────────────────────

  public async sendChatMessage(msg: any): Promise<boolean> {
    const res = await this.request('/api/chat', 'POST', msg);
    return Boolean(res && res.success);
  }

  public async getChatMessages(childId?: string): Promise<any[]> {
    const qs = childId ? `?childId=${encodeURIComponent(childId)}` : '';
    const res = await this.request<{ messages: any[] }>(`/api/chat${qs}`);
    return res && Array.isArray(res.messages) ? res.messages : [];
  }

  // ─── Pairing ────────────────────────────────────────────────────────────

  public async createPairing(session: any): Promise<{ success: boolean; session?: any }> {
    // Automatically inject serverUrl into pairing session
    const payload = { ...session, serverUrl: this.serverUrl };
    const res = await this.request<{ success: boolean; session: any }>('/api/pairing', 'POST', payload);
    return {
      success: Boolean(res && res.success),
      session: res ? res.session : undefined,
    };
  }

  public async getPairing(code: string): Promise<any | null> {
    const res = await this.request<{ success: boolean; session: any }>(`/api/pairing?code=${encodeURIComponent(code)}`);
    return res && res.session ? res.session : null;
  }

  public async confirmPairing(confirmData: any): Promise<{ success: boolean; session?: any; child?: any }> {
    const res = await this.request<{ success: boolean; session: any; child: any }>('/api/pairing/confirm', 'POST', confirmData);
    return {
      success: Boolean(res && res.success),
      session: res ? res.session : undefined,
      child: res ? res.child : undefined,
    };
  }

  // ─── Sharing ────────────────────────────────────────────────────────────

  public async createShare(session: any): Promise<{ success: boolean; session?: any }> {
    const res = await this.request<{ success: boolean; session: any }>('/api/sharing', 'POST', session);
    return {
      success: Boolean(res && res.success),
      session: res ? res.session : undefined,
    };
  }

  public async getShare(code?: string): Promise<{ success: boolean; session?: any; shares?: any } | null> {
    const qs = code ? `?code=${encodeURIComponent(code)}` : '';
    const res = await this.request<{ success: boolean; session?: any; shares?: any }>(`/api/sharing${qs}`);
    return res || null;
  }

  public async acceptShare(code: string, toParentId: string, toParentName: string): Promise<boolean> {
    const res = await this.request('/api/sharing/accept', 'POST', { code, toParentId, toParentName });
    return Boolean(res && res.success);
  }

  public async revokeShare(ownerParentId: string, childId: string, targetParentId: string): Promise<boolean> {
    const res = await this.request('/api/sharing/revoke', 'POST', { ownerParentId, childId, targetParentId });
    return Boolean(res && res.success);
  }

  // ─── Safe Zones (Geofences) ─────────────────────────────────────────────

  public async saveSafeZones(childId: string, safeZones: any): Promise<boolean> {
    const res = await this.request('/api/safe-zones', 'POST', { childId, safeZones });
    return Boolean(res && res.success);
  }

  public async getSafeZones(childId: string): Promise<any[]> {
    const res = await this.request<{ safeZones: any[] }>(`/api/safe-zones?childId=${encodeURIComponent(childId)}`);
    return res && Array.isArray(res.safeZones) ? res.safeZones : [];
  }

  // ─── Live Tracking ──────────────────────────────────────────────────────

  public async setLiveTracking(childId: string, active: boolean, durationSeconds: number = 600): Promise<boolean> {
    const res = await this.request('/api/live-tracking', 'POST', { childId, active, durationSeconds, startedAt: Date.now() });
    return Boolean(res && res.success);
  }

  public async getLiveTracking(childId: string): Promise<any> {
    const res = await this.request<{ status: any }>(`/api/live-tracking?childId=${encodeURIComponent(childId)}`);
    return res && res.status ? res.status : { active: false };
  }

  // ─── Children Profiles & Registry ───────────────────────────────────────

  public async saveChildProfile(parentId: string, child: any): Promise<boolean> {
    const res = await this.request('/api/children', 'POST', { parentId, child });
    return Boolean(res && res.success);
  }

  public async getChildrenList(parentId: string): Promise<any[]> {
    const res = await this.request<{ children: any[] }>(`/api/children?parentId=${encodeURIComponent(parentId)}`);
    return res && Array.isArray(res.children) ? res.children : [];
  }

  public async deleteChild(parentId: string, childId: string): Promise<boolean> {
    const res = await this.request(`/api/children?parentId=${encodeURIComponent(parentId)}&childId=${encodeURIComponent(childId)}`, 'DELETE');
    return Boolean(res && res.success);
  }

  // ─── PC Remote Control & Telemetry ──────────────────────────────────────

  public async sendPcCommand(childId: string, command: any): Promise<boolean> {
    const res = await this.request('/api/pc/command', 'POST', { childId, command });
    return Boolean(res && res.success);
  }

  public async savePcConfig(childId: string, config: any): Promise<boolean> {
    const res = await this.request('/api/pc/config', 'POST', { childId, config });
    return Boolean(res && res.success);
  }

  public async uploadPcTelemetry(childId: string, telemetry: any): Promise<boolean> {
    const res = await this.request('/api/pc/telemetry', 'POST', { childId, telemetry });
    return Boolean(res && res.success);
  }
}

export const serverApiClient = ServerApiClient.getInstance();
