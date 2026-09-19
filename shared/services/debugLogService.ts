// Debug Log Service for Real-time Data Streaming & Sync Diagnostics
// Tracks all bidirectional events: Kid -> Cloud, Parent -> Cloud, Cloud -> Kid, Cloud -> Parent

export type DebugDirection = 'kid->cloud' | 'parent->cloud' | 'cloud->kid' | 'cloud->parent' | 'local->store';
export type DebugCategory = 'screentime' | 'telemetry' | 'settings' | 'command' | 'sos' | 'time_request' | 'chat' | 'network' | 'stars';
export type DebugStatus = 'success' | 'error' | 'warning' | 'info';

export interface DebugLogEntry {
  id: string;
  timestamp: number;
  timeString: string;
  direction: DebugDirection;
  category: DebugCategory;
  action: string;
  childId?: string;
  childName?: string;
  status: DebugStatus;
  summary: string;
  payload?: any;
  error?: {
    message: string;
    code?: string;
    stack?: string;
  };
}

type DebugListener = (logs: DebugLogEntry[], latestEntry: DebugLogEntry) => void;

const MAX_LOGS_RAM = 250;
const MAX_LOGS_STORAGE = 100;
const STORAGE_KEY = 'parentpro_debug_logs';

class DebugLogService {
  private logs: DebugLogEntry[] = [];
  private listeners: Set<DebugListener> = new Set();
  private isStorageAvailable: boolean;

  constructor() {
    this.isStorageAvailable = typeof window !== 'undefined' && typeof localStorage !== 'undefined';
    this.loadFromStorage();
  }

  private loadFromStorage() {
    if (!this.isStorageAvailable) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.logs = parsed.slice(0, MAX_LOGS_RAM);
        }
      }
    } catch (e) {
      this.logs = [];
    }
  }

  private persistToStorage() {
    if (!this.isStorageAvailable) return;
    try {
      const subset = this.logs.slice(0, MAX_LOGS_STORAGE);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(subset));
    } catch (e) {
      // Storage quota exceeded or disabled
    }
  }

  /**
   * Record a debug log event
   */
  public log(params: {
    direction: DebugDirection;
    category: DebugCategory;
    action: string;
    status: DebugStatus;
    summary: string;
    childId?: string;
    childName?: string;
    payload?: any;
    error?: any;
  }): DebugLogEntry {
    const now = Date.now();
    const timeString =
      new Date(now).toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }) + '.' + String(now % 1000).padStart(3, '0');

    let formattedError: DebugLogEntry['error'] = undefined;
    if (params.error) {
      if (typeof params.error === 'string') {
        formattedError = { message: params.error };
      } else if (params.error instanceof Error) {
        formattedError = {
          message: params.error.message,
          stack: params.error.stack,
          code: (params.error as any).code,
        };
      } else {
        formattedError = {
          message: params.error.message || JSON.stringify(params.error),
          code: params.error.code,
        };
      }
    }

    const entry: DebugLogEntry = {
      id: `dbg_${now}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: now,
      timeString,
      direction: params.direction,
      category: params.category,
      action: params.action,
      childId: params.childId,
      childName: params.childName,
      status: params.status,
      summary: params.summary,
      payload: params.payload ? this.sanitizePayload(params.payload) : undefined,
      error: formattedError,
    };

    // Prepend new entry
    this.logs.unshift(entry);
    if (this.logs.length > MAX_LOGS_RAM) {
      this.logs = this.logs.slice(0, MAX_LOGS_RAM);
    }

    this.persistToStorage();
    this.notifyListeners(entry);

    // Console output for developer inspection
    const prefix = `[DEBUG:${params.direction.toUpperCase()}][${params.category.toUpperCase()}] ${params.action}: ${params.summary}`;
    if (params.status === 'error') {
      console.error(prefix, params.error, params.payload);
    } else if (params.status === 'warning') {
      console.warn(prefix, params.payload);
    } else {
      console.log(prefix);
    }

    return entry;
  }

  private sanitizePayload(data: any): any {
    try {
      const str = JSON.stringify(data, (key, value) => {
        // Strip large binary/base64 avatars from debug logs to prevent RAM bloat
        if ((key === 'avatar' || key === 'icon') && typeof value === 'string' && value.length > 200) {
          return value.substring(0, 50) + '...[truncated]';
        }
        return value;
      });
      return JSON.parse(str);
    } catch (e) {
      return String(data);
    }
  }

  public getLogs(): DebugLogEntry[] {
    return [...this.logs];
  }

  public getErrorLogs(): DebugLogEntry[] {
    return this.logs.filter((l) => l.status === 'error');
  }

  public getErrorCount(childId?: string): number {
    return this.logs.filter((l) => l.status === 'error' && (!childId || l.childId === childId)).length;
  }

  public clearLogs() {
    this.logs = [];
    if (this.isStorageAvailable) {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (e) {}
    }
    this.notifyListeners({
      id: `dbg_${Date.now()}_cleared`,
      timestamp: Date.now(),
      timeString: new Date().toLocaleTimeString('vi-VN'),
      direction: 'local->store',
      category: 'settings',
      action: 'clearLogs',
      status: 'info',
      summary: 'Nhật ký debug đã được xóa sạch',
    });
  }

  public subscribe(listener: DebugListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(latestEntry: DebugLogEntry) {
    const currentLogs = [...this.logs];
    this.listeners.forEach((fn) => {
      try {
        fn(currentLogs, latestEntry);
      } catch (e) {
        console.error('DebugLog listener error:', e);
      }
    });
  }

  /**
   * Export all logs formatted as readable plain text report
   */
  public exportAsText(): string {
    const lines = [
      `=============================================================`,
      `PARENTPRO & KIDCARE - BÁO CÁO NHẬT KÝ SỬA LỖI & ĐỒNG BỘ DỮ LIỆU`,
      `Thời gian xuất: ${new Date().toLocaleString('vi-VN')}`,
      `Tổng số sự kiện: ${this.logs.length} (Lỗi: ${this.getErrorLogs().length})`,
      `=============================================================`,
      '',
    ];

    this.logs.forEach((l, idx) => {
      lines.push(
        `#${this.logs.length - idx} [${l.timeString}] [${l.status.toUpperCase()}] [${l.direction}] [${l.category.toUpperCase()}]`
      );
      lines.push(`Hành động: ${l.action} | Bé: ${l.childName || l.childId || 'N/A'}`);
      lines.push(`Mô tả: ${l.summary}`);
      if (l.error) {
        lines.push(`⚠️ CHI TIẾT LỖI: ${l.error.message}`);
        if (l.error.code) lines.push(`Mã lỗi: ${l.error.code}`);
        if (l.error.stack) lines.push(`Stack: ${l.error.stack.split('\n').slice(0, 3).join(' | ')}`);
      }
      if (l.payload) {
        lines.push(`Dữ liệu: ${JSON.stringify(l.payload).substring(0, 300)}`);
      }
      lines.push('-------------------------------------------------------------');
    });

    return lines.join('\n');
  }
}

export const debugLogService = new DebugLogService();
