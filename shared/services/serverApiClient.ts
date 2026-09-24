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
export const DEFAULT_4G_SERVER_URL = 'https://eco-take-richards-dresses.trycloudflare.com';
const JSDELIVR_SERVER_URL = 'https://cdn.jsdelivr.net/gh/Thaopxtn/quan-ly-con@main/server-url.txt';
const GITHUB_RAW_SERVER_URL = 'https://raw.githubusercontent.com/Thaopxtn/quan-ly-con/main/server-url.txt';
const GITHUB_RAW_SERVER_JSON = 'https://raw.githubusercontent.com/Thaopxtn/quan-ly-con/main/server-url.json';
const GITHUB_API_SERVER_URL = 'https://api.github.com/repos/Thaopxtn/quan-ly-con/contents/server-url.txt';
const GITHUB_PAGES_SERVER_URL = 'https://thaopxtn.github.io/quan-ly-con/server-url.txt';
const FALLBACK_LAN_IPS = ['http://192.168.1.4:3000'];

export class ServerApiClient {
  private static instance: ServerApiClient;
  private serverUrl: string = '';
  private sessionToken: string = '';
  private eventSource: EventSource | null = null;
  private listeners: Map<string, Set<EventCallback>> = new Map();
  private isConnecting: boolean = false;
  private reconnectTimer: any = null;
  private reconnectAttempts: number = 0;
  private heartbeatWatchdog: any = null;
  private isResolvingFromCloud: boolean = false;
  private lastCloudResolvedTime: number = 0;

  private constructor() {
    this.serverUrl = this.initServerUrl();
    if (typeof window !== 'undefined') {
      // Pre-load sessionToken
      this.getSessionToken();
      // Auto-fetch signed token if needed
      if (!this.sessionToken || !this.sessionToken.includes('.')) {
        this.ensureParentToken().catch(() => {});
      }
      // Auto-start SSE subscription in browser / webview
      this.initRealtimeStream();
      // Auto-resolve latest server URL from GitHub if needed
      setTimeout(() => {
        this.resolveServerUrlFromCloud().catch(() => {});
      }, 300);
    }
  }

  public static getInstance(): ServerApiClient {
    if (!ServerApiClient.instance) {
      ServerApiClient.instance = new ServerApiClient();
    }
    return ServerApiClient.instance;
  }

  private initServerUrl(): string {
    if (typeof window === 'undefined') return DEFAULT_4G_SERVER_URL;

    // 1. User configured URL in localStorage (ignore if it's localhost / 127.0.0.1)
    const saved = localStorage.getItem(SERVER_URL_STORAGE_KEY);
    if (saved && saved.trim() && !saved.includes('localhost') && !saved.includes('127.0.0.1')) {
      return saved.trim().replace(/\/+$/, '');
    }

    // Clean up stale localhost in localStorage
    if (saved && (saved.includes('localhost') || saved.includes('127.0.0.1'))) {
      try { localStorage.removeItem(SERVER_URL_STORAGE_KEY); } catch (_) {}
    }

    // 2. Running on web server directly (e.g. trycloudflare.com or custom domain)
    const host = window.location.hostname;
    if (host && host !== 'localhost' && !host.includes('github.io') && host !== '127.0.0.1') {
      return window.location.origin;
    }

    // 3. Fallback default: Always use public 4G Cloudflare URL on phone, NEVER localhost!
    return DEFAULT_4G_SERVER_URL;
  }

  public getServerUrl(): string {
    return this.serverUrl;
  }

  public setServerUrl(newUrl: string): void {
    const cleanUrl = (newUrl || '').trim().replace(/\/+$/, '');
    // If someone passes localhost on phone/webview, keep 4G URL instead
    if (cleanUrl.includes('localhost') || cleanUrl.includes('127.0.0.1')) {
      this.serverUrl = DEFAULT_4G_SERVER_URL;
    } else {
      this.serverUrl = cleanUrl || DEFAULT_4G_SERVER_URL;
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem(SERVER_URL_STORAGE_KEY, this.serverUrl);
    }
    // Reconnect SSE with new URL
    this.reconnectRealtimeStream();
  }

  /**
   * Cập nhật sessionToken có chữ ký số bảo mật mật mã học
   */
  public setSessionToken(token: string): void {
    if (!token) return;
    const clean = token.trim();
    if (this.sessionToken === clean) return;
    this.sessionToken = clean;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('parentpro_session_token', clean);
      } catch (_) {}
    }
    // Tự động kích hoạt kết nối SSE stream với chữ ký số bảo mật mới
    this.initRealtimeStream();
  }

  /**
   * Đảm bảo luôn có token xác thực hợp lệ cho máy cha mẹ từ máy chủ
   */
  public async ensureParentToken(): Promise<string> {
    const curToken = this.getSessionToken();
    if (curToken && curToken.includes('.')) {
      return curToken;
    }
    if (typeof window === 'undefined') return 'parent_master_secret_2026';
    try {
      const res = await fetch(`${this.serverUrl}/api/auth/token`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer parent_master_secret_2026',
          'X-Master-Secret': 'parent_master_secret_2026',
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.token) {
          this.setSessionToken(data.token);
          return data.token;
        }
      }
    } catch (_) {}
    return 'parent_master_secret_2026';
  }

  /**
   * Lấy sessionToken có chữ ký số đang hoạt động
   */
  public getSessionToken(): string {
    if (this.sessionToken && this.sessionToken.includes('.')) return this.sessionToken;

    if (typeof window !== 'undefined') {
      // 0. Server injected token vào HTML (Web Parent Portal)
      const injected = (window as any).__PARENT_SESSION_TOKEN__ || (window as any).__SERVER_SESSION_TOKEN__;
      if (injected && typeof injected === 'string' && injected.trim() && injected.includes('.')) {
        this.sessionToken = injected.trim();
        return this.sessionToken;
      }

      // 1. Explicitly saved session token (phải có chữ ký số '.')
      const saved = localStorage.getItem('parentpro_session_token');
      if (saved && saved.trim() && saved.includes('.')) {
        this.sessionToken = saved.trim();
        return this.sessionToken;
      }

      // 2. Kid paired device info token (Máy Con)
      try {
        const kidInfoStr = localStorage.getItem('kid_device_paired_info');
        if (kidInfoStr) {
          const parsed = JSON.parse(kidInfoStr);
          if (parsed && (parsed.sessionToken || parsed.childId)) {
            this.sessionToken = String(parsed.sessionToken || parsed.childId).trim();
            return this.sessionToken;
          }
        }
      } catch (_) {}

      // 3. Parent pairing sessions token (Máy Cha Mẹ)
      try {
        const parentSessionsStr = localStorage.getItem('parent_pro_pairing_sessions');
        if (parentSessionsStr) {
          const sessions = JSON.parse(parentSessionsStr);
          for (const s of Object.values(sessions) as any[]) {
            if (s && s.sessionToken && typeof s.sessionToken === 'string') {
              this.sessionToken = s.sessionToken.trim();
              return this.sessionToken;
            }
          }
        }
      } catch (_) {}

      // 4. Fallback master secret for parent operations
      return 'parent_master_secret_2026';
    }

    return 'parent_master_secret_2026';
  }

  /**
   * Tự động lấy URL máy chủ mới nhất từ file server-url.txt trên GitHub/jsDelivr CDN (Cách 1)
   */
  public async resolveServerUrlFromCloud(forceRefresh: boolean = false): Promise<string | null> {
    if (typeof window === 'undefined') return null;

    const now = Date.now();
    // If current serverUrl is already alive and healthy, keep it unless forceRefresh
    if (!forceRefresh && (now - this.lastCloudResolvedTime < 10000)) {
      const health = await this.checkHealth();
      if (health.ok) return this.serverUrl;
    }

    if (this.isResolvingFromCloud && !forceRefresh) return this.serverUrl;
    this.isResolvingFromCloud = true;

    try {
      // 0. Quick check bundled local asset file (ultra fast on Android APK assets: 0ms)
      const fetchLocalAsset = async (): Promise<string | null> => {
        try {
          const origin = window.location.origin;
          if (origin && !origin.includes('github.io')) {
            const ctrl = new AbortController();
            const timer = setTimeout(() => ctrl.abort(), 1200);
            const res = await fetch(`${origin}/server-url.txt?_t=${now}`, { signal: ctrl.signal });
            clearTimeout(timer);
            if (res.ok) {
              const text = (await res.text()).trim();
              if (text && text.startsWith('https://')) return text.split('\n')[0].trim().replace(/\/+$/, '');
            }
          }
        } catch (_) {}
        return null;
      };

      // 1. GitHub API Content Endpoint (Ultra reliable in Vietnam, fresh on every call, not cached by jsDelivr, <800ms)
      const fetchGitHubApi = async (): Promise<string | null> => {
        try {
          const ctrl = new AbortController();
          const timer = setTimeout(() => ctrl.abort(), 3500);
          const res = await fetch(GITHUB_API_SERVER_URL, { signal: ctrl.signal });
          clearTimeout(timer);
          if (res.ok) {
            const data = await res.json();
            if (data && data.content) {
              const decoded = atob(data.content.replace(/\s+/g, '')).trim();
              if (decoded && (decoded.startsWith('https://') || decoded.startsWith('http://'))) {
                return decoded.split('\n')[0].trim().replace(/\/+$/, '');
              }
            }
          }
        } catch (_) {}
        return null;
      };

      // 2. Fetch JSON metadata (contains both 4G tunnel URL and local Wi-Fi IPs)
      const fetchJsonCandidate = async (): Promise<{ url?: string; localIps?: string[] } | null> => {
        try {
          const ctrl = new AbortController();
          const timer = setTimeout(() => ctrl.abort(), 3000);
          const res = await fetch(`${GITHUB_RAW_SERVER_JSON}?_t=${now}`, { signal: ctrl.signal });
          clearTimeout(timer);
          if (res.ok) {
            return await res.json();
          }
        } catch (_) {}
        return null;
      };

      // Quick check LAN Wi-Fi IP (only if phone is on the same home Wi-Fi)
      const lanChecks = FALLBACK_LAN_IPS.map(async (ip) => {
        const h = await this.checkHealth(ip);
        return h.ok ? ip : null;
      });
      const quickLanResult = await Promise.race([
        Promise.any(lanChecks).catch(() => null),
        new Promise<null>((r) => setTimeout(() => r(null), 1000))
      ]);
      if (quickLanResult) {
        console.log(`[ServerApiClient] 🏠 Nhận diện kết nối mạng nội bộ Wi-Fi LAN: ${quickLanResult}`);
        this.setServerUrl(quickLanResult);
        this.lastCloudResolvedTime = Date.now();
        return quickLanResult;
      }

      // Prioritize GitHub API and local asset
      const [localUrl, ghApiUrl] = await Promise.all([
        fetchLocalAsset(),
        fetchGitHubApi(),
      ]);

      const primaryCandidate = ghApiUrl || localUrl;
      if (primaryCandidate) {
        const health = await this.checkHealth(primaryCandidate);
        if (health.ok) {
          console.log(`[ServerApiClient] 🌐 Nhận diện máy chủ 4G từ GitHub API: ${primaryCandidate}`);
          this.setServerUrl(primaryCandidate);
          this.lastCloudResolvedTime = Date.now();
          return primaryCandidate;
        }
      }

      // Secondary fallbacks (raw endpoints & jsDelivr)
      const endpoints = [
        `${GITHUB_RAW_SERVER_URL}?_t=${now}`,
        `${GITHUB_PAGES_SERVER_URL}?_t=${now}`,
        `${JSDELIVR_SERVER_URL}?_t=${now}`,
      ];

      const fetchCandidate = async (endpoint: string): Promise<string | null> => {
        try {
          const ctrl = new AbortController();
          const timer = setTimeout(() => ctrl.abort(), 3000);
          const res = await fetch(endpoint, { signal: ctrl.signal });
          clearTimeout(timer);
          if (res.ok) {
            const text = (await res.text()).trim();
            if (text && (text.startsWith('https://') || text.startsWith('http://'))) {
              return text.split('\n')[0].trim().replace(/\/+$/, '');
            }
          }
        } catch (_) {}
        return null;
      };

      const [results, jsonData] = await Promise.all([
        Promise.allSettled(endpoints.map(ep => fetchCandidate(ep))),
        fetchJsonCandidate()
      ]);

      if (jsonData && jsonData.url) {
        const health = await this.checkHealth(jsonData.url);
        if (health.ok) {
          console.log(`[ServerApiClient] 🌐 Nhận diện máy chủ 4G từ server-url.json: ${jsonData.url}`);
          this.setServerUrl(jsonData.url);
          this.lastCloudResolvedTime = Date.now();
          return jsonData.url;
        }
      }

      for (const res of results) {
        if (res.status === 'fulfilled' && res.value) {
          const candidateUrl = res.value;
          const health = await this.checkHealth(candidateUrl);
          if (health.ok) {
            console.log(`[ServerApiClient] 🌐 Nhận diện máy chủ 4G thành công: ${candidateUrl}`);
            this.setServerUrl(candidateUrl);
            this.lastCloudResolvedTime = Date.now();
            return candidateUrl;
          }
        }
      }

      // Fallback: DEFAULT_4G_SERVER_URL
      if (DEFAULT_4G_SERVER_URL) {
        const health = await this.checkHealth(DEFAULT_4G_SERVER_URL);
        if (health.ok) {
          this.setServerUrl(DEFAULT_4G_SERVER_URL);
          return DEFAULT_4G_SERVER_URL;
        }
      }
    } finally {
      this.isResolvingFromCloud = false;
    }

    return this.serverUrl || null;
  }

  public async checkHealth(customUrl?: string): Promise<ServerHealth> {
    const target = (customUrl || this.serverUrl).replace(/\/+$/, '');
    const start = Date.now();
    try {
      const ctrl = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), 4000);
      const res = await fetch(`${target}/api/health?_t=${Date.now()}`, {
        signal: ctrl.signal,
      });
      clearTimeout(timeout);
      if (res.ok) {
        const info = await res.json().catch(() => null);
        // CRITICAL: Ensure info is valid JSON and info.status === 'ok' (not a Cloudflare error HTML page!)
        if (info && info.status === 'ok') {
          return { ok: true, latencyMs: Date.now() - start, info };
        }
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
    const token = this.getSessionToken();
    const tokenParam = token ? `?token=${encodeURIComponent(token)}` : '';
    const streamUrl = `${this.serverUrl}/api/realtime/stream${tokenParam}`;

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
        'child_deleted',
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
    body?: any,
    retryCount: number = 0
  ): Promise<T | null> {
    try {
      const url = `${this.serverUrl}${path}`;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Đính kèm sessionToken có chữ ký số bảo mật mật mã học
      const token = this.getSessionToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        headers['X-Session-Token'] = token;
      }

      const options: RequestInit = {
        method,
        headers,
      };
      if (body !== undefined && method !== 'GET') {
        options.body = JSON.stringify(body);
      }
      const res = await fetch(url, options);

      // Auto-heal 401 Unauthorized hoặc 403 Forbidden: Cố gắng lấy token xác thực hợp lệ cho Cha Mẹ nếu chưa có
      if ((res.status === 401 || res.status === 403) && retryCount === 0 && typeof window !== 'undefined') {
        try {
          const authRes = await fetch(`${this.serverUrl}/api/auth/token`, {
            method: 'POST',
            headers: {
              'Authorization': 'Bearer parent_master_secret_2026',
              'X-Master-Secret': 'parent_master_secret_2026',
            }
          });
          if (authRes.ok) {
            const authData = await authRes.json();
            if (authData && authData.token) {
              this.setSessionToken(authData.token);
              return this.request<T>(path, method, body, 1);
            }
          }
        } catch (_) {}
      }

      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      // Auto-heal: If network failed and we haven't retried yet, resolve URL from GitHub and retry once
      if (retryCount === 0 && typeof window !== 'undefined') {
        const newUrl = await this.resolveServerUrlFromCloud(true);
        if (newUrl && newUrl !== this.serverUrl) {
          return this.request<T>(path, method, body, 1);
        }
      }
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

if (typeof window !== 'undefined') {
  (window as any).serverApiClient = serverApiClient;
}

