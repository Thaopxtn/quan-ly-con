/**
 * Connection Monitor Service for ParentPro & KidCare
 * Tracks and periodically checks:
 * 1. Local PC Server & 4G Cloudflare Tunnel connectivity + ping latency
 * 2. Child devices real-time heartbeat, battery, network, and screen state
 * 3. Parent device internet status
 */

import { useState, useEffect } from 'react';
import { ServerApiClient } from './serverApiClient';

export interface ChildConnectionSummary {
  childId: string;
  childName: string;
  avatar?: string;
  deviceName?: string;
  model?: string;
  isOnline: boolean;
  lastSeenMs: number;
  lastSeenText: string;
  battery: number;
  isCharging?: boolean;
  networkType: 'wifi' | 'cellular' | 'unknown';
  wifiSSID?: string;
  screenState: 'active' | 'screen_off' | 'locked';
  currentApp?: string;
  lat?: number;
  lng?: number;
  address?: string;
}

export interface ServerConnectionInfo {
  online: boolean;
  latencyMs: number;
  url: string;
  type: 'lan' | 'cloud' | 'localhost';
  sseConnected: boolean;
  uptime: number;
  lastChecked: number;
  activeRealtimeClients?: number;
}

export interface TunnelConnectionInfo {
  online: boolean;
  url: string;
  githubSynced: boolean;
  latencyMs: number;
}

export interface GlobalConnectionStatus {
  server: ServerConnectionInfo;
  tunnel: TunnelConnectionInfo;
  children: ChildConnectionSummary[];
  parentNetwork: {
    online: boolean;
    type: string;
  };
  lastRefreshedAt: number;
  isRefreshing: boolean;
}

type Listener = (status: GlobalConnectionStatus) => void;

class ConnectionMonitorService {
  private static instance: ConnectionMonitorService;
  private listeners: Set<Listener> = new Set();
  private pollInterval: any = null;
  private isRefreshing: boolean = false;

  private currentStatus: GlobalConnectionStatus = {
    server: {
      online: false,
      latencyMs: 0,
      url: '',
      type: 'lan',
      sseConnected: false,
      uptime: 0,
      lastChecked: 0,
      activeRealtimeClients: 0,
    },
    tunnel: {
      online: false,
      url: '',
      githubSynced: true,
      latencyMs: 0,
    },
    children: [],
    parentNetwork: {
      online: typeof navigator !== 'undefined' ? navigator.onLine : true,
      type: 'unknown',
    },
    lastRefreshedAt: 0,
    isRefreshing: false,
  };

  private constructor() {
    if (typeof window !== 'undefined') {
      // Listen to window online/offline
      window.addEventListener('online', () => this.handleNetworkChange(true));
      window.addEventListener('offline', () => this.handleNetworkChange(false));

      // Initial check
      setTimeout(() => {
        this.checkAllConnections();
      }, 500);

      // Auto poll every 10 seconds
      this.pollInterval = setInterval(() => {
        if (!document.hidden) {
          this.checkAllConnections();
        }
      }, 10000);
    }
  }

  public static getInstance(): ConnectionMonitorService {
    if (!ConnectionMonitorService.instance) {
      ConnectionMonitorService.instance = new ConnectionMonitorService();
    }
    return ConnectionMonitorService.instance;
  }

  public getStatus(): GlobalConnectionStatus {
    return this.currentStatus;
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.currentStatus);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    for (const listener of this.listeners) {
      try {
        listener({ ...this.currentStatus });
      } catch (_) {}
    }
  }

  private handleNetworkChange(isOnline: boolean) {
    this.currentStatus.parentNetwork.online = isOnline;
    this.notify();
    if (isOnline) {
      this.checkAllConnections();
    }
  }

  /**
   * Format friendly relative time (e.g. "Vừa xong", "15 giây trước", "3 phút trước")
   */
  public formatTimeAgo(timestampMs: number): string {
    if (!timestampMs || timestampMs <= 0) return 'Chưa có tín hiệu';
    const diffSec = Math.max(0, Math.floor((Date.now() - timestampMs) / 1000));
    if (diffSec < 15) return 'Vừa xong (Trực tiếp)';
    if (diffSec < 60) return `${diffSec} giây trước`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} phút trước`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours} giờ trước`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} ngày trước`;
  }

  /**
   * Perform comprehensive check across Server, Tunnel, and Child devices
   */
  public async checkAllConnections(): Promise<GlobalConnectionStatus> {
    if (this.isRefreshing) return this.currentStatus;
    this.isRefreshing = true;
    this.currentStatus.isRefreshing = true;
    this.notify();

    const client = ServerApiClient.getInstance();
    const serverUrl = client.getServerUrl() || 'http://localhost:3000';
    let urlType: 'lan' | 'cloud' | 'localhost' = 'cloud';
    if (serverUrl.includes('localhost') || serverUrl.includes('127.0.0.1')) {
      urlType = 'localhost';
    } else if (serverUrl.includes('192.168.') || serverUrl.includes('10.') || serverUrl.includes('172.')) {
      urlType = 'lan';
    }

    // 1. Check Server Stats & Health
    let isServerOnline = false;
    let serverLatency = 0;
    let serverUptime = 0;
    let serverClientsCount = 0;
    let tunnelPublicUrl = '';
    let serverKidsData: any[] = [];
    let recentTelemetry: any[] = [];

    try {
      const startPing = Date.now();
      const ctrl = new AbortController();
      const timeoutId = setTimeout(() => ctrl.abort(), 4500);

      const res = await fetch(`${serverUrl}/api/server-stats?_t=${Date.now()}`, {
        signal: ctrl.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const stats = await res.json().catch(() => null);
        if (stats && stats.status === 'online') {
          isServerOnline = true;
          serverLatency = Date.now() - startPing;
          serverUptime = stats.uptime || 0;
          serverClientsCount = stats.network?.sseClientsCount || 0;
          tunnelPublicUrl = stats.tunnelUrl || '';
          if (Array.isArray(stats.children)) {
            serverKidsData = stats.children;
          }
          if (Array.isArray(stats.recent?.telemetry)) {
            recentTelemetry = stats.recent.telemetry;
          }
        }
      }
    } catch (_) {
      // Fallback simple health ping
      try {
        const health = await client.checkHealth(serverUrl);
        isServerOnline = health.ok;
        serverLatency = health.latencyMs || 0;
      } catch (__) {
        isServerOnline = false;
      }
    }

    // 2. Check Cloudflare Tunnel URL if different from current serverUrl
    let isTunnelOnline = false;
    let tunnelLatency = 0;
    if (tunnelPublicUrl && tunnelPublicUrl.startsWith('http')) {
      try {
        const tStart = Date.now();
        const tCtrl = new AbortController();
        const tTimer = setTimeout(() => tCtrl.abort(), 4000);
        const tRes = await fetch(`${tunnelPublicUrl}/api/health?_t=${Date.now()}`, {
          signal: tCtrl.signal,
        });
        clearTimeout(tTimer);
        if (tRes.ok) {
          const tInfo = await tRes.json().catch(() => null);
          if (tInfo && tInfo.status === 'ok') {
            isTunnelOnline = true;
            tunnelLatency = Date.now() - tStart;
          }
        }
      } catch (_) {
        isTunnelOnline = false;
      }
    } else if (urlType === 'cloud' && isServerOnline) {
      isTunnelOnline = true;
      tunnelLatency = serverLatency;
      tunnelPublicUrl = serverUrl;
    }

    // 3. Compute Child Device Summaries
    const computedChildren: ChildConnectionSummary[] = [];

    // Map through children found on server
    for (const k of serverKidsData) {
      const kidId = k.id || k.childId;
      if (!kidId) continue;

      // Find newest telemetry for this child
      const tele = recentTelemetry.find(t => t.childId === kidId) || {};
      const lastUpdatedMs = tele.lastUpdated || tele.timestamp || (k.lastUpdated ? new Date(k.lastUpdated).getTime() : 0);
      const isLive = Boolean(lastUpdatedMs && (Date.now() - lastUpdatedMs < 60000)); // Online if telemetry < 60s

      const batteryLevel = typeof tele.battery === 'number' ? tele.battery : (typeof k.battery === 'number' ? k.battery : 100);
      const isCharging = Boolean(tele.isCharging);
      const isLocked = Boolean(k.isLocked || tele.isLocked);
      const screenOn = tele.isScreenOn !== undefined ? Boolean(tele.isScreenOn) : true;

      let screenState: 'active' | 'screen_off' | 'locked' = 'active';
      if (isLocked) {
        screenState = 'locked';
      } else if (!screenOn || tele.screenState === 'screen_off') {
        screenState = 'screen_off';
      }

      let netType: 'wifi' | 'cellular' | 'unknown' = 'unknown';
      let wifiName = '';
      if (tele.network?.connectionType === 'wifi' || tele.network?.wifiSSID) {
        netType = 'wifi';
        wifiName = tele.network?.wifiSSID || 'Wi-Fi Gia Đình';
      } else if (tele.network?.connectionType === '4g' || tele.network?.connectionType === 'cellular') {
        netType = 'cellular';
      }

      computedChildren.push({
        childId: kidId,
        childName: k.name || k.childName || tele.childName || 'Bé yêu',
        avatar: k.avatar || tele.avatar,
        deviceName: tele.deviceName || k.deviceName || tele.model || k.model || 'Điện thoại con',
        model: tele.model || k.model || 'Android',
        isOnline: isLive,
        lastSeenMs: lastUpdatedMs,
        lastSeenText: this.formatTimeAgo(lastUpdatedMs),
        battery: batteryLevel,
        isCharging,
        networkType: netType,
        wifiSSID: wifiName,
        screenState,
        currentApp: tele.activeOpenedApp || '',
        lat: tele.lat || k.lat,
        lng: tele.lng || k.lng,
        address: tele.currentAddress || k.currentAddress || '',
      });
    }

    // 4. Update Current Status
    this.currentStatus = {
      server: {
        online: isServerOnline,
        latencyMs: serverLatency,
        url: serverUrl,
        type: urlType,
        sseConnected: isServerOnline,
        uptime: serverUptime,
        lastChecked: Date.now(),
        activeRealtimeClients: serverClientsCount,
      },
      tunnel: {
        online: isTunnelOnline,
        url: tunnelPublicUrl || serverUrl,
        githubSynced: true,
        latencyMs: tunnelLatency,
      },
      children: computedChildren,
      parentNetwork: {
        online: typeof navigator !== 'undefined' ? navigator.onLine : true,
        type: (navigator as any)?.connection?.effectiveType || 'wifi',
      },
      lastRefreshedAt: Date.now(),
      isRefreshing: false,
    };

    this.isRefreshing = false;
    this.notify();
    return this.currentStatus;
  }
}

export const connectionMonitor = ConnectionMonitorService.getInstance();

export function useConnectionStatus() {
  const [status, setStatus] = useState<GlobalConnectionStatus>(() => connectionMonitor.getStatus());

  useEffect(() => {
    return connectionMonitor.subscribe((s) => {
      setStatus(s);
    });
  }, []);

  return {
    ...status,
    refresh: () => connectionMonitor.checkAllConnections(),
    formatTimeAgo: (ts: number) => connectionMonitor.formatTimeAgo(ts),
  };
}

