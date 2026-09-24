/**
 * High-Performance Production Server for "Quản Lý Con" (ParentPro & KidCare)
 * Zero external dependencies - pure Node.js HTTP server.
 * Handles:
 * 1. Web Hosting (Parent App, Kid App, PC Client, APK Downloads)
 * 2. Local Realtime Data Storage Engine (Stored directly on YOUR PC disk)
 * 3. Realtime Broadcast Event Stream (Sub-10ms latency via Server-Sent Events)
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { exec, execSync, spawn } = require('child_process');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

const ROOT_DIR = __dirname;
const DIST_PARENT = path.join(ROOT_DIR, 'dist-parent');
const DIST_KID = path.join(ROOT_DIR, 'dist-kid');
const DATA_DIR = path.join(ROOT_DIR, 'data');

// Windows Startup Folder & Shortcuts
const STARTUP_DIR = process.env.APPDATA
  ? path.join(process.env.APPDATA, 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup')
  : null;
const STARTUP_LNK = STARTUP_DIR ? path.join(STARTUP_DIR, 'ParentPro-Server-AutoStart.lnk') : null;
const STARTUP_VBS = STARTUP_DIR ? path.join(STARTUP_DIR, 'ParentPro-Server-AutoStart.vbs') : null;

function checkAutoStartStatus() {
  if (STARTUP_LNK && fs.existsSync(STARTUP_LNK)) return true;
  if (STARTUP_VBS && fs.existsSync(STARTUP_VBS)) return true;
  return false;
}

// In-Memory Ring Buffer for Realtime Server Log Viewer
const MAX_SERVER_LOGS = 150;
const SERVER_LOGS = [];
function logServerEvent(level, message, meta = null) {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('vi-VN') + '.' + String(now.getMilliseconds()).padStart(3, '0');
  const entry = {
    id: 'log_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    time: timeStr,
    timestamp: now.toISOString(),
    level, // 'HTTP' | 'CMD' | 'GPS' | 'CHAT' | 'INFO' | 'WARN' | 'ERROR'
    message,
    meta,
  };
  SERVER_LOGS.push(entry);
  if (SERVER_LOGS.length > MAX_SERVER_LOGS) {
    SERVER_LOGS.shift();
  }
}

// Ensure local data storage directory exists on PC
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Cryptographic Secret for Session Token Signatures (HMAC-SHA256)
const SECRET_FILE = path.join(DATA_DIR, 'auth_secret.key');
let SERVER_HMAC_SECRET = '';
if (fs.existsSync(SECRET_FILE)) {
  try {
    SERVER_HMAC_SECRET = fs.readFileSync(SECRET_FILE, 'utf8').trim();
  } catch (_) {}
}
if (!SERVER_HMAC_SECRET || SERVER_HMAC_SECRET.length < 32) {
  SERVER_HMAC_SECRET = crypto.randomBytes(32).toString('hex');
  try {
    fs.writeFileSync(SECRET_FILE, SERVER_HMAC_SECRET, 'utf8');
  } catch (_) {}
}

/**
 * Creates a cryptographically signed sessionToken (HMAC-SHA256)
 * Format: <base64url(role:id:timestamp)>.<hex_signature>
 */
function signSessionToken(role, id) {
  const safeRole = role || 'kid';
  const safeId = id || ('user_' + Date.now());
  const payload = `${safeRole}:${safeId}:${Date.now()}`;
  const sig = crypto.createHmac('sha256', SERVER_HMAC_SECRET).update(payload).digest('hex');
  const encPayload = Buffer.from(payload).toString('base64url');
  return `${encPayload}.${sig}`;
}

/**
 * Validates the cryptographic signature of an incoming sessionToken
 */
function verifySessionTokenSignature(token) {
  if (!token || typeof token !== 'string') return null;
  const cleanToken = token.trim().replace(/^Bearer\s+/i, '');
  if (!cleanToken) return null;

  // 1. Master Parent Secret Authentication
  if (cleanToken === 'parent_master_secret_2026') {
    return { valid: true, role: 'parent', id: 'yaDXFmTMcccQV6m53Rxtw4LOF303' };
  }

  // 2. Cryptographic HMAC-SHA256 signature verification
  const parts = cleanToken.split('.');
  if (parts.length === 2) {
    try {
      const [encPayload, sig] = parts;
      const payload = Buffer.from(encPayload, 'base64url').toString('utf8');
      const expectedSig = crypto.createHmac('sha256', SERVER_HMAC_SECRET).update(payload).digest('hex');
      const sigBuf = Buffer.from(sig, 'hex');
      const expBuf = Buffer.from(expectedSig, 'hex');
      if (sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf)) {
        const [role, id, timestamp] = payload.split(':');
        return { valid: true, role, id, timestamp: Number(timestamp) };
      }
    } catch (_) {}
  }

  // 3. Check existing sessionTokens stored in pairings DB (or matching childId)
  const pairings = readDb('pairings');
  for (const session of Object.values(pairings)) {
    if (session) {
      if (session.sessionToken === cleanToken || session.childId === cleanToken || session.code === cleanToken) {
        return {
          valid: true,
          role: 'kid',
          id: session.childId || session.code,
          parentId: session.parentId,
          legacy: true,
        };
      }
    }
  }

  // 4. Check registered children in children DB
  const childrenDb = readDb('children');
  for (const [parentId, childList] of Object.entries(childrenDb)) {
    if (Array.isArray(childList)) {
      const matched = childList.find(c => c && (c.id === cleanToken || c.deviceId === cleanToken || c.childId === cleanToken));
      if (matched) {
        return {
          valid: true,
          role: 'kid',
          id: matched.id || matched.childId || matched.deviceId,
          parentId: parentId,
          legacy: true,
        };
      }
    }
  }

  return null;
}

// Master Parent Token for Parent Web Portal & Parent App
const MASTER_PARENT_TOKEN = signSessionToken('parent', 'yaDXFmTMcccQV6m53Rxtw4LOF303');


// Database file paths
const DB_FILES = {
  telemetry: path.join(DATA_DIR, 'telemetry_history.json'),
  chats: path.join(DATA_DIR, 'chat_messages.json'),
  commands: path.join(DATA_DIR, 'remote_commands.json'),
  settings: path.join(DATA_DIR, 'child_settings.json'),
  stars: path.join(DATA_DIR, 'stars.json'),
  sos: path.join(DATA_DIR, 'sos_alerts.json'),
  time_requests: path.join(DATA_DIR, 'time_requests.json'),
  pairings: path.join(DATA_DIR, 'pairings.json'),
  shares: path.join(DATA_DIR, 'shares.json'),
  safe_zones: path.join(DATA_DIR, 'safe_zones.json'),
  children: path.join(DATA_DIR, 'children.json'),
  live_tracking: path.join(DATA_DIR, 'live_tracking.json'),
  pc: path.join(DATA_DIR, 'pc_control.json'),
};

const OBJECT_DB_KEYS = new Set([
  'settings',
  'stars',
  'pairings',
  'shares',
  'safe_zones',
  'children',
  'live_tracking',
  'pc',
]);

// Initialize empty DB files if not exist
for (const [key, filePath] of Object.entries(DB_FILES)) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, OBJECT_DB_KEYS.has(key) ? '{}' : '[]', 'utf8');
  }
}

const DB_MEMORY_CACHE = {};
const DIRTY_DB_KEYS = new Set();
let flushTimer = null;

function readDb(type) {
  if (DB_MEMORY_CACHE[type] !== undefined) {
    return DB_MEMORY_CACHE[type];
  }
  try {
    const file = DB_FILES[type];
    if (file && fs.existsSync(file)) {
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      DB_MEMORY_CACHE[type] = data;
      return data;
    }
  } catch (e) {
    console.error(`[DB] Error reading ${type}:`, e.message);
  }
  const emptyVal = OBJECT_DB_KEYS.has(type) ? {} : [];
  DB_MEMORY_CACHE[type] = emptyVal;
  return emptyVal;
}

function writeDb(type, data) {
  DB_MEMORY_CACHE[type] = data;
  DIRTY_DB_KEYS.add(type);
  scheduleFlush();
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flushDirtyDbs();
  }, 2000);
}

function flushDirtyDbs() {
  if (DIRTY_DB_KEYS.size === 0) return;
  const keysToFlush = Array.from(DIRTY_DB_KEYS);
  DIRTY_DB_KEYS.clear();

  for (const key of keysToFlush) {
    const file = DB_FILES[key];
    const data = DB_MEMORY_CACHE[key];
    if (file && data !== undefined) {
      try {
        const tmpFile = file + '.tmp';
        fs.writeFile(tmpFile, JSON.stringify(data, null, 2), 'utf8', (err) => {
          if (!err) {
            fs.rename(tmpFile, file, () => {});
          }
        });
      } catch (e) {
        console.error(`[DB] Async flush error for ${key}:`, e.message);
      }
    }
  }
}

function flushDirtyDbsSync() {
  if (DIRTY_DB_KEYS.size === 0) return;
  for (const key of DIRTY_DB_KEYS) {
    const file = DB_FILES[key];
    const data = DB_MEMORY_CACHE[key];
    if (file && data !== undefined) {
      try {
        fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
      } catch (_) {}
    }
  }
  DIRTY_DB_KEYS.clear();
}

process.on('SIGINT', () => { flushDirtyDbsSync(); process.exit(0); });
process.on('SIGTERM', () => { flushDirtyDbsSync(); process.exit(0); });

// Backfill cryptographically signed sessionTokens for existing pairing records on startup
try {
  const startupPairings = readDb('pairings');
  let backfilled = false;
  for (const [code, session] of Object.entries(startupPairings)) {
    if (session && (!session.sessionToken || !session.sessionToken.includes('.'))) {
      session.sessionToken = signSessionToken('kid', session.childId || ('kid_' + code));
      backfilled = true;
    }
  }
  if (backfilled) {
    writeDb('pairings', startupPairings);
    console.log('[Security] 🛡️ Đã cấp phát chữ ký số mật mã học cho các phiên ghép đôi hiện hữu trong cơ sở dữ liệu.');
  }
} catch (_) {}

function getDbStats() {
  const stats = {};
  for (const [key, filePath] of Object.entries(DB_FILES)) {
    let size = 0;
    let count = 0;
    try {
      if (fs.existsSync(filePath)) {
        size = fs.statSync(filePath).size;
        const data = readDb(key);
        count = Array.isArray(data) ? data.length : Object.keys(data).length;
      }
    } catch (_) {}
    stats[key] = { size, count, path: filePath, name: path.basename(filePath) };
  }
  return stats;
}

// In-Memory Realtime Clients (Server-Sent Events)
const sseClients = new Set();

// Anti-Spam & Rate Limiting Maps (Prevents socket/API flood from parents or children)
const commandRateLimitMap = new Map(); // key: `${childId}:${cmd}`, value: { time: number, commandId: string }
const timeRequestRateLimitMap = new Map(); // key: childId, value: number
const sosRateLimitMap = new Map(); // key: childId, value: { time: number, alert: any }

setInterval(() => {
  const now = Date.now();
  for (const [key, val] of commandRateLimitMap.entries()) {
    if (now - val.time > 60000) commandRateLimitMap.delete(key);
  }
  for (const [key, time] of timeRequestRateLimitMap.entries()) {
    if (now - time > 60000) timeRequestRateLimitMap.delete(key);
  }
  for (const [key, val] of sosRateLimitMap.entries()) {
    if (now - val.time > 60000) sosRateLimitMap.delete(key);
  }
}, 10 * 60 * 1000);

function broadcastRealtime(event, payload) {
  const message = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const client of sseClients) {
    try {
      client.res.write(message);
      if (typeof client.res.flush === 'function') client.res.flush();
    } catch (_) {
      sseClients.delete(client);
    }
  }
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.apk': 'application/vnd.android.package-archive',
};

function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }
  return addresses;
}

function sendFile(res, filePath, contentType, isApk = false) {
  // Inject authenticated parent session token into HTML pages so browser portal is seamlessly authorized
  if (filePath.endsWith('.html')) {
    fs.readFile(filePath, 'utf8', (err, html) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 Not Found');
        return;
      }
      const injection = `<script>window.__PARENT_SESSION_TOKEN__ = ${JSON.stringify(MASTER_PARENT_TOKEN)};</script>`;
      const modifiedHtml = html.includes('</head>')
        ? html.replace('</head>', `${injection}</head>`)
        : (injection + html);
      const buf = Buffer.from(modifiedHtml, 'utf8');
      res.writeHead(200, {
        'Content-Type': contentType,
        'Content-Length': buf.length,
        'Cache-Control': 'no-cache',
      });
      res.end(buf);
    });
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }

    const headers = {
      'Content-Type': contentType,
      'Content-Length': stats.size,
    };

    if (isApk) {
      const filename = path.basename(filePath);
      headers['Content-Disposition'] = `attachment; filename="${filename}"`;
      headers['Cache-Control'] = 'no-cache';
    } else if (filePath.includes(path.sep + 'assets' + path.sep)) {
      headers['Cache-Control'] = 'public, max-age=31536000, immutable';
    } else {
      headers['Cache-Control'] = 'no-cache';
    }

    res.writeHead(200, headers);
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
}

function parseJsonBody(req) {
  if (req._parsedBody !== undefined) return Promise.resolve(req._parsedBody);
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { 
      body += chunk; 
      if (body.length > 5 * 1024 * 1024) {
        req.destroy();
        reject(new Error('Payload Too Large'));
      }
    });
    req.on('end', () => {
      try {
        req._parsedBody = body ? JSON.parse(body) : {};
        resolve(req._parsedBody);
      } catch (err) {
        req._parsedBody = {};
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

/**
 * Checks whether an endpoint is public (exempt from cryptographic token check)
 */
function isPublicEndpoint(pathname) {
  // 1. Health checks (required for 4G cloud auto-discovery and ping)
  if (pathname === '/api/health' || pathname === '/health') return true;
  // 2. Initial pairing negotiation & device sharing (devices do not possess token yet)
  if (pathname === '/api/pairing' || pathname.startsWith('/api/pairing/') || pathname === '/api/pairing/create' || pathname === '/api/pairing/confirm' || pathname === '/api/sharing' || pathname.startsWith('/api/sharing/')) return true;
  // 3. Auth token exchange
  if (pathname === '/api/auth/token') return true;
  // 4. Server status stats badge & server management endpoints
  if (pathname === '/api/server-stats' || pathname.startsWith('/api/server/')) return true;
  // 5. Static assets, APK downloads, HTML pages
  if (!pathname.startsWith('/api/')) return true;
  return false;
}

/**
 * Extracts sessionToken from Authorization header, X-Session-Token header, or query param
 */
function extractRequestToken(req, parsedUrl) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }
  const xToken = req.headers['x-session-token'] || req.headers['X-Session-Token'];
  if (xToken) return String(xToken).trim();
  const queryToken = parsedUrl.searchParams.get('token');
  if (queryToken) return String(queryToken).trim();
  return null;
}

const server = http.createServer(async (req, res) => {
  // CORS Headers - Allow full cross-origin from mobile apps, Capacitor WebView & Web
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let pathname = decodeURIComponent(parsedUrl.pathname);

  if (!pathname.startsWith('/api/realtime/stream') && !pathname.endsWith('.png') && !pathname.endsWith('.ico') && !pathname.endsWith('.js') && !pathname.endsWith('.css') && pathname !== '/api/server/logs' && pathname !== '/api/server-stats') {
    logServerEvent('HTTP', `${req.method} ${pathname}`);
  }

  // 🛡️ SECURITY LAYER: Cryptographic sessionToken Signature Verification (HMAC-SHA256)
  if (!isPublicEndpoint(pathname)) {
    const rawToken = extractRequestToken(req, parsedUrl);
    if (!rawToken) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        error: 'Unauthorized: Thiếu sessionToken hợp lệ. Yêu cầu chữ ký số từ máy Con hoặc Cha Mẹ.',
        code: 'MISSING_SESSION_TOKEN',
      }));
      return;
    }

    const authResult = verifySessionTokenSignature(rawToken);
    if (!authResult || !authResult.valid) {
      console.warn(`[Security] 🚨 Chặn request giả mạo/sai chữ ký số: ${req.method} ${pathname} từ IP: ${req.socket.remoteAddress}`);
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        error: 'Forbidden: Chữ ký số sessionToken không hợp lệ hoặc đã bị can thiệp.',
        code: 'INVALID_CRYPTOGRAPHIC_SIGNATURE',
      }));
      return;
    }

    // Attach validated auth identity to request
    req.auth = authResult;
  }

  // 0.1 Token Endpoint for Parent App / Portal / Kid Devices
  if (pathname === '/api/auth/token') {
    const authHeader = req.headers['authorization'] || req.headers['Authorization'] || '';
    const masterHeader = req.headers['x-master-secret'] || req.headers['X-Master-Secret'] || '';
    const querySecret = parsedUrl.searchParams.get('secret') || '';
    const queryChildId = parsedUrl.searchParams.get('childId') || '';

    const isMasterAuth = authHeader === 'Bearer parent_master_secret_2026' ||
                         authHeader.replace(/^Bearer\s+/i, '') === 'parent_master_secret_2026' ||
                         masterHeader === 'parent_master_secret_2026' ||
                         querySecret === 'parent_master_secret_2026';

    if (isMasterAuth) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        token: MASTER_PARENT_TOKEN,
        role: 'parent',
        parentId: 'yaDXFmTMcccQV6m53Rxtw4LOF303'
      }));
      return;
    }

    // Kid Device Token Issuance
    if (queryChildId) {
      const childrenDb = readDb('children');
      let foundParentId = '';
      for (const [pId, list] of Object.entries(childrenDb)) {
        if (Array.isArray(list) && list.some(c => c && (c.id === queryChildId || c.deviceId === queryChildId || c.childId === queryChildId))) {
          foundParentId = pId;
          break;
        }
      }
      const kidToken = signSessionToken('kid', queryChildId);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        token: kidToken,
        role: 'kid',
        childId: queryChildId,
        parentId: foundParentId || 'family_primary'
      }));
      return;
    }

    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: 'Unauthorized: Invalid master secret or child credentials.' }));
    return;
  }

  // 1. Health Check
  if (pathname === '/api/health' || pathname === '/health') {
    const telemetry = readDb('telemetry');
    const chats = readDb('chats');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      service: 'QuanLyCon-LocalPC-Server',
      storage: {
        locationsCount: telemetry.length,
        chatsCount: chats.length,
        dataDir: DATA_DIR,
      },
      activeRealtimeConnections: sseClients.size,
    }));
    return;
  }

  // 1.1 Detailed Server & System Statistics
  if (pathname === '/api/server-stats') {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const cpus = os.cpus() || [];
    const memoryUsage = process.memoryUsage();

    const stats = {
      status: 'online',
      serverTime: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      systemUptime: Math.floor(os.uptime()),
      hostname: os.hostname(),
      platform: os.platform(),
      osRelease: os.release(),
      arch: os.arch(),
      nodeVersion: process.version,
      pid: process.pid,
      port: PORT,
      cpu: {
        model: cpus[0] ? cpus[0].model.trim() : 'Standard CPU',
        cores: cpus.length,
        speedMHz: cpus[0] ? cpus[0].speed : 0,
      },
      memory: {
        totalBytes: totalMem,
        freeBytes: freeMem,
        usedBytes: usedMem,
        usagePercent: Math.round((usedMem / totalMem) * 100),
        processRssBytes: memoryUsage.rss,
        processHeapBytes: memoryUsage.heapUsed,
      },
      network: {
        localIps: getLocalIpAddresses(),
        sseClientsCount: sseClients.size,
      },
      storage: {
        dataDir: DATA_DIR,
        files: getDbStats(),
      },
      autostartEnabled: checkAutoStartStatus(),
      tunnelUrl: (() => {
        const txtPath = path.join(ROOT_DIR, 'server-url.txt');
        if (fs.existsSync(txtPath)) {
          try { return fs.readFileSync(txtPath, 'utf8').trim(); } catch (_) {}
        }
        return '';
      })(),
      children: (() => {
        const childrenDb = readDb('children');
        const settingsDb = readDb('settings');
        const activeChildren = [];
        for (const pId of Object.keys(childrenDb)) {
          if (Array.isArray(childrenDb[pId])) {
            for (const child of childrenDb[pId]) {
              const setting = settingsDb[child.id] || {};
              activeChildren.push({
                ...child,
                isLocked: setting.isLocked || false,
                screenTimeLimitMinutes: setting.screenTimeLimitMinutes || 120,
                pcTelemetry: setting.pcTelemetry || null,
              });
            }
          }
        }
        return activeChildren;
      })(),
      logs: SERVER_LOGS.slice(-40),
      recent: {
        telemetry: readDb('telemetry').slice(0, 15),
        chats: readDb('chats').slice(-15).reverse(),
        commands: readDb('commands').slice(0, 15),
      },
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(stats));
    return;
  }

  // 1.2 Test Telemetry Injection (for verification in dashboard)
  if (pathname === '/api/server/test-telemetry' && req.method === 'POST') {
    const testPoint = {
      childId: 'kid_test_demo',
      latitude: 21.028511 + (Math.random() - 0.5) * 0.01,
      longitude: 105.854444 + (Math.random() - 0.5) * 0.01,
      accuracy: 10.0,
      speed: Math.round(5 + Math.random() * 20),
      battery: Math.round(75 + Math.random() * 24),
      savedAt: new Date().toISOString(),
      mock: true
    };
    const history = readDb('telemetry');
    history.unshift(testPoint);
    if (history.length > 10000) history.pop();
    writeDb('telemetry', history);
    broadcastRealtime('telemetry', testPoint);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, point: testPoint }));
    return;
  }

  // 1.3 Test Chat Injection
  if (pathname === '/api/server/test-chat' && req.method === 'POST') {
    const body = await parseJsonBody(req);
    const testMsg = {
      id: 'chat_' + Date.now(),
      sender: (body && body.sender) ? body.sender : 'Trung Tâm Máy Chủ',
      text: (body && body.text) ? body.text : 'Tin nhắn thử nghiệm từ Trung Tâm Quản Trị Máy Chủ',
      time: new Date().toISOString(),
    };
    const chats = readDb('chats');
    chats.push(testMsg);
    writeDb('chats', chats);
    broadcastRealtime('chat', testMsg);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, message: testMsg }));
    return;
  }

  // 1.4 Clear Test Data
  if (pathname === '/api/server/clear-data' && req.method === 'POST') {
    const body = await parseJsonBody(req);
    const target = body ? body.target : 'all';
    if (target === 'telemetry' || target === 'all') writeDb('telemetry', []);
    if (target === 'chats' || target === 'all') writeDb('chats', []);
    if (target === 'commands' || target === 'all') writeDb('commands', []);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, cleared: target }));
    return;
  }

  // 1.5 AutoStart Status & Toggle (Windows Startup Automation)
  if (pathname === '/api/server/autostart') {
    if (req.method === 'GET') {
      const enabled = checkAutoStartStatus();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, enabled, startupPath: STARTUP_LNK || STARTUP_VBS }));
      return;
    }
    if (req.method === 'POST') {
      const body = await parseJsonBody(req);
      const enable = body && body.enable !== undefined ? Boolean(body.enable) : !checkAutoStartStatus();
      try {
        const action = enable ? 'install' : 'uninstall';
        const psScript = path.join(ROOT_DIR, 'scripts', 'setup-autostart.ps1');
        execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${psScript}" -Action ${action}`, { cwd: ROOT_DIR });
        const nowEnabled = checkAutoStartStatus();
        logServerEvent('INFO', `Đã ${nowEnabled ? 'BẬT' : 'TẮT'} tự khởi động máy chủ cùng Windows`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          enabled: nowEnabled,
          message: nowEnabled
            ? 'Đã bật tự động khởi động máy chủ ngầm khi mở máy tính!'
            : 'Đã tắt tự động khởi động cùng Windows.'
        }));
      } catch (err) {
        logServerEvent('ERROR', 'Lỗi thiết lập autostart: ' + err.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
      return;
    }
  }

  // 1.6 Open Data Directory in Windows Explorer
  if (pathname === '/api/server/open-data' && req.method === 'POST') {
    try {
      exec(`explorer.exe "${DATA_DIR}"`);
      logServerEvent('INFO', 'Đã mở thư mục lưu trữ CSDL trong Windows Explorer');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: 'Đã mở thư mục dữ liệu trên máy tính' }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  // 1.7 Open Desktop Software App Window
  if (pathname === '/api/server/launch-app-window' && req.method === 'POST') {
    try {
      const launcherScript = path.join(ROOT_DIR, 'ParentPro-Server-Launcher.vbs');
      exec(`wscript.exe "${launcherScript}"`, { cwd: ROOT_DIR });
      logServerEvent('INFO', 'Đã khởi chạy cửa sổ phần mềm máy chủ độc lập');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: 'Đã mở giao diện phần mềm trong cửa sổ riêng' }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  // 1.8 Restart Server (via PM2 or exit for restart)
  if (pathname === '/api/server/restart' && req.method === 'POST') {
    logServerEvent('WARN', 'Nhận lệnh khởi động lại máy chủ từ Bảng điều khiển');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, message: 'Máy chủ đang khởi động lại...' }));
    setTimeout(() => {
      try {
        exec('pm2 restart quan-ly-con-server', { cwd: ROOT_DIR }, (err) => {
          if (err) process.exit(0);
        });
      } catch (_) {
        process.exit(0);
      }
    }, 600);
    return;
  }

  // 1.9 Live Server Logs (In-Memory Circular Buffer)
  if (pathname === '/api/server/logs' && req.method === 'GET') {
    const limit = Number(parsedUrl.searchParams.get('limit')) || 80;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, logs: SERVER_LOGS.slice(-limit) }));
    return;
  }

  // 1.10 Public Cloudflare Tunnel URL
  if (pathname === '/api/server/tunnel' && req.method === 'GET') {
    let tunnelUrl = '';
    const txtPath = path.join(ROOT_DIR, 'server-url.txt');
    if (fs.existsSync(txtPath)) {
      try { tunnelUrl = fs.readFileSync(txtPath, 'utf8').trim(); } catch (_) {}
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, url: tunnelUrl, active: Boolean(tunnelUrl) }));
    return;
  }

  // 2. Realtime SSE Stream (Sub-10ms real-time event streaming)
  if (pathname === '/api/realtime/stream') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'X-Accel-Buffering': 'no',
    });
    if (typeof res.flushHeaders === 'function') {
      try { res.flushHeaders(); } catch (_) {}
    }
    res.write(`data: ${JSON.stringify({ type: 'connected', time: new Date().toISOString() })}\n\n`);
    if (typeof res.flush === 'function') {
      try { res.flush(); } catch (_) {}
    }

    const client = { res, connectedAt: Date.now() };
    sseClients.add(client);

    const heartbeat = setInterval(() => {
      try {
        res.write(': ping\n\n');
      } catch (_) {
        clearInterval(heartbeat);
        sseClients.delete(client);
      }
    }, 15000);

    req.on('close', () => {
      clearInterval(heartbeat);
      sseClients.delete(client);
    });
    return;
  }

  // 3. Telemetry API (Receive GPS from Kid, store on PC, broadcast to Parent)
  if (pathname === '/api/telemetry') {
    if (req.method === 'POST') {
      const data = await parseJsonBody(req);
      if (data && data.childId) {
        data.savedAt = new Date().toISOString();
        const history = readDb('telemetry');
        history.unshift(data);
        // Keep latest 10,000 locations on disk
        if (history.length > 10000) history.pop();
        writeDb('telemetry', history);

        // Broadcast to Parent apps in real-time
        broadcastRealtime('telemetry', data);
        logServerEvent('GPS', `Vị trí mới bé ${data.childId}: [${Number(data.latitude || data.lat || 0).toFixed(4)}, ${Number(data.longitude || data.lng || 0).toFixed(4)}] • Pin: ${data.battery != null ? data.battery : '--'}% • Quyền thời gian: ${data.hasUsageAccessPermission !== false ? 'Đã cấp' : 'CHƯA CẤP'}`);

        // Update child_settings.json with latest state from device (only for registered active children)
        try {
          const childrenDb = readDb('children') || {};
          let childExists = false;
          for (const pId of Object.keys(childrenDb)) {
            const list = childrenDb[pId];
            if (Array.isArray(list) && list.some(ch => ch.id === data.childId)) {
              childExists = true;
              break;
            }
          }

          if (childExists) {
            const settingsDb = readDb('settings') || {};
            const cur = settingsDb[data.childId] || {};
            settingsDb[data.childId] = {
              ...cur,
              childId: data.childId,
              battery: data.battery != null ? data.battery : cur.battery,
              lat: data.lat != null ? data.lat : (data.latitude != null ? data.latitude : cur.lat),
              lng: data.lng != null ? data.lng : (data.longitude != null ? data.longitude : cur.lng),
              currentAddress: data.currentAddress || cur.currentAddress,
              isScreenOn: data.isScreenOn != null ? data.isScreenOn : cur.isScreenOn,
              screenState: data.screenState || cur.screenState,
              activeOpenedApp: data.activeOpenedApp || cur.activeOpenedApp,
              screenTimeUsedMinutes: data.screenTimeUsedMinutes != null ? data.screenTimeUsedMinutes : cur.screenTimeUsedMinutes,
              hasUsageAccessPermission: data.hasUsageAccessPermission != null ? data.hasUsageAccessPermission : cur.hasUsageAccessPermission,
              isLocked: data.isLocked != null ? data.isLocked : cur.isLocked,
              lockType: data.lockType != null ? data.lockType : cur.lockType,
              lockTitle: data.lockTitle != null ? data.lockTitle : cur.lockTitle,
              updatedAt: Date.now(),
            };
            writeDb('settings', settingsDb);
          }
        } catch (_) {}

        // Update children.json with status and battery
        try {
          const childrenDb = readDb('children') || {};
          let matched = false;
          for (const pId of Object.keys(childrenDb)) {
            const list = childrenDb[pId];
            if (Array.isArray(list)) {
              for (const ch of list) {
                if (ch.id === data.childId) {
                  ch.status = 'online';
                  ch.updatedAt = Date.now();
                  if (data.battery != null) ch.battery = data.battery;
                  if (data.deviceName) ch.deviceName = data.deviceName;
                  if (data.model) ch.model = data.model;
                  matched = true;
                }
              }
            }
          }
          if (matched) {
            writeDb('children', childrenDb);
          }
        } catch (_) {}

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, savedAt: data.savedAt }));
        return;
      }
    }
    if (req.method === 'GET') {
      const childId = parsedUrl.searchParams.get('childId');
      const limit = parseInt(parsedUrl.searchParams.get('limit') || '100', 10);
      const history = readDb('telemetry');
      const filtered = childId ? history.filter(item => item.childId === childId) : history;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ locations: filtered.slice(0, limit) }));
      return;
    }
  }

  // 4. Remote Command API (Parent sends lock/buzz -> stored on PC -> sent to Kid)
  if (pathname === '/api/command') {
    if (req.method === 'POST') {
      const data = await parseJsonBody(req);
      if (data && data.childId && (data.type || data.command)) {
        const cmdType = data.type || data.command;
        const cmdKey = `${data.childId}:${cmdType}`;
        const lastCmd = commandRateLimitMap.get(cmdKey);
        const now = Date.now();
        if (lastCmd && (now - lastCmd.time < 2000)) {
          // Throttled duplicate command within 2000ms
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            commandId: lastCmd.commandId,
            throttled: true,
            message: 'Lệnh tương tự đang được gửi đi, đã chặn duplicate spam',
          }));
          return;
        }

        data.id = data.id || ('cmd_' + now + '_' + Math.random().toString(36).slice(2, 6));
        data.type = cmdType;
        data.command = cmdType;
        data.timestamp = typeof data.timestamp === 'number' ? data.timestamp : now;
        data.createdAt = data.createdAt || new Date().toISOString();
        data.status = data.status || 'pending';

        commandRateLimitMap.set(cmdKey, { time: now, commandId: data.id });

        const commands = readDb('commands');
        commands.unshift(data);
        if (commands.length > 500) commands.pop();
        writeDb('commands', commands);

        // Broadcast command in real-time to Kid device
        broadcastRealtime('command', data);
        logServerEvent('CMD', `Lệnh điều khiển ${data.type} -> thiết bị con: ${data.childId}`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, commandId: data.id }));
        return;
      }
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Missing childId or command/type' }));
      return;
    }
    if (req.method === 'GET') {
      const childId = parsedUrl.searchParams.get('childId');
      const status = parsedUrl.searchParams.get('status');
      const commands = readDb('commands');
      let filtered = childId ? commands.filter(c => c.childId === childId) : commands;
      if (status) {
        filtered = filtered.filter(c => c.status === status);
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ commands: filtered.slice(0, 50) }));
      return;
    }
  }

  // 4.1 Remote Command ACK API (Kid sends execution feedback back to Parent)
  if (pathname === '/api/command/ack') {
    if (req.method === 'POST') {
      const ack = await parseJsonBody(req);
      const cmdId = ack && (ack.commandId || ack.id);
      if (cmdId) {
        const commands = readDb('commands');
        const targetCmd = commands.find(c => c.id === cmdId);
        const effectiveStatus = ack.status || 'executed';
        const effectiveChildId = ack.childId || (targetCmd ? targetCmd.childId : '');
        const cmdType = (targetCmd ? targetCmd.type : '') || ack.command;

        if (targetCmd) {
          targetCmd.status = effectiveStatus;
          targetCmd.acknowledgedAt = new Date().toISOString();
          if (ack.deviceName) targetCmd.deviceName = ack.deviceName;
          if (ack.childName) targetCmd.childName = ack.childName;
          if (ack.detail) targetCmd.detail = ack.detail;
          writeDb('commands', commands);
        }

        // Only when kid device CONFIRMS actual execution, update confirmed child settings
        if (effectiveStatus === 'executed' && effectiveChildId) {
          try {
            const settings = readDb('settings');
            const childSet = settings[effectiveChildId] || {};
            let settingsModified = false;

            if (cmdType === 'lock_now') {
              const lockPayload = (targetCmd && targetCmd.payload) || ack.payload || {};
              childSet.isLocked = true;
              childSet.lockChallenge = {
                isLocked: true,
                lockType: lockPayload.lockType || 'instant',
                title: lockPayload.title || 'Thiết bị đang bị khóa từ xa',
                description: lockPayload.description || 'Bố mẹ đã tạm khóa thiết bị. Con hãy nghỉ ngơi một chút nhé!',
                challengeData: lockPayload.challengeData,
              };
              settingsModified = true;
            } else if (cmdType === 'unlock_now') {
              childSet.isLocked = false;
              childSet.lockChallenge = {
                ...(childSet.lockChallenge || {}),
                isLocked: false,
                lockType: 'none',
                title: '',
                description: '',
              };
              if (childSet.smartRoutines) {
                childSet.smartRoutines.mealtimeLock = false;
                childSet.smartRoutines.bedtimeLock = false;
              }
              const usedMins = (childSet.screenTime && childSet.screenTime.todayTotalMinutes) || 0;
              const limitMins = childSet.screenTimeLimitMinutes || 135;
              if (usedMins >= limitMins) {
                childSet.screenTimeLimitMinutes = Math.max(limitMins, usedMins + 60);
              }
              settingsModified = true;
            } else if (cmdType === 'extend_time') {
              const extra = ((targetCmd && targetCmd.payload) || ack.payload)?.minutes || 15;
              childSet.screenTimeLimitMinutes = (childSet.screenTimeLimitMinutes || 135) + extra;
              childSet.isLocked = false;
              if (childSet.lockChallenge) {
                childSet.lockChallenge.isLocked = false;
                childSet.lockChallenge.lockType = 'none';
              }
              settingsModified = true;
            }

            if (settingsModified) {
              settings[effectiveChildId] = childSet;
              writeDb('settings', settings);
              broadcastRealtime('settings', { childId: effectiveChildId, settings: childSet });
            }

            // Synchronize children.json lock state
            if (cmdType === 'lock_now' || cmdType === 'unlock_now') {
              try {
                const childrenDb = readDb('children');
                let cModified = false;
                for (const pId of Object.keys(childrenDb)) {
                  if (Array.isArray(childrenDb[pId])) {
                    for (const ch of childrenDb[pId]) {
                      if (ch.id === effectiveChildId) {
                        ch.isLocked = (cmdType === 'lock_now');
                        ch.updatedAt = Date.now();
                        cModified = true;
                      }
                    }
                  }
                }
                if (cModified) {
                  writeDb('children', childrenDb);
                  broadcastRealtime('children_updated', { parentId: targetCmd?.parentId, children: childrenDb[targetCmd?.parentId] || [] });
                }
              } catch (_) {}
            }
          } catch (e) {
            console.error('[server] Error updating settings on command ACK:', e.message);
          }
        }

        // Broadcast ACK to parent app (include both id and commandId for maximum client compatibility)
        broadcastRealtime('command_ack', {
          id: cmdId,
          commandId: cmdId,
          command: cmdType,
          status: effectiveStatus,
          childId: effectiveChildId,
          childName: ack.childName || (targetCmd ? targetCmd.childName : ''),
          deviceName: ack.deviceName || (targetCmd ? targetCmd.deviceName : ''),
          detail: ack.detail || (effectiveStatus === 'executed' ? 'Đã thực thi thành công trên thiết bị con' : 'Máy con đã nhận lệnh'),
          executedAt: ack.executedAt || Date.now(),
          timestamp: new Date().toISOString(),
        });

        logServerEvent('ACK', `Máy con [${effectiveChildId}] xác nhận lệnh ${cmdType}: ${effectiveStatus}`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, ackReceived: true, commandId: cmdId }));
        return;
      }
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Missing commandId or id' }));
      return;
    }
  }

  // 5. Chat Messages API
  if (pathname === '/api/chat') {
    if (req.method === 'POST') {
      const msg = await parseJsonBody(req);
      if (msg && msg.text) {
        msg.id = msg.id || ('chat_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6));
        msg.time = msg.time || new Date().toISOString();
        const chats = readDb('chats');
        const isDuplicate = chats.some(c => c.id === msg.id || (c.childId === msg.childId && c.text === msg.text && Math.abs(new Date(c.time).getTime() - new Date(msg.time).getTime()) < 2000));
        if (!isDuplicate) {
          chats.push(msg);
          writeDb('chats', chats);
          broadcastRealtime('chat', msg);
          logServerEvent('CHAT', `Tin nhắn từ ${msg.senderName || msg.sender}: "${String(msg.text || '').slice(0, 45)}"`);
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: msg, duplicate: isDuplicate }));
        return;
      }
    }
    if (req.method === 'GET') {
      const childId = parsedUrl.searchParams.get('childId');
      const chats = readDb('chats');
      const filtered = childId ? chats.filter(c => c.childId === childId) : chats;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ messages: filtered.slice(-100) }));
      return;
    }
  }

  // 5.1 Child Settings API (Screen time, app limits, daily schedules, hardware controls)
  if (pathname === '/api/settings') {
    if (req.method === 'POST') {
      const body = await parseJsonBody(req);
      const childId = body && (body.childId || (body.settings && body.settings.childId));
      if (childId) {
        const settingsPayload = body.settings !== undefined ? body.settings : body;
        const allSettings = readDb('settings');
        const existing = allSettings[childId] || {};

        let mergedScreenTime = undefined;
        if (existing.screenTime || settingsPayload.screenTime) {
          mergedScreenTime = {
            ...(existing.screenTime || {}),
            ...(settingsPayload.screenTime || {}),
          };
          if ((!settingsPayload.screenTime || typeof settingsPayload.screenTime.todayTotalMinutes !== 'number' || settingsPayload.screenTime.todayTotalMinutes <= 0) &&
              (existing.screenTime && typeof existing.screenTime.todayTotalMinutes === 'number' && existing.screenTime.todayTotalMinutes > 0)) {
            mergedScreenTime.todayTotalMinutes = existing.screenTime.todayTotalMinutes;
          }
        }

        allSettings[childId] = {
          ...existing,
          ...settingsPayload,
          ...(mergedScreenTime ? { screenTime: mergedScreenTime } : {}),
          childId,
          parentId: body.parentId || existing.parentId || '',
          updatedAt: Date.now(),
        };
        writeDb('settings', allSettings);

        broadcastRealtime('settings', {
          childId,
          parentId: body.parentId || existing.parentId,
          settings: allSettings[childId],
          updatedAt: allSettings[childId].updatedAt,
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, settings: allSettings[childId] }));
        return;
      }
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Missing childId' }));
      return;
    }
    if (req.method === 'GET') {
      const childId = parsedUrl.searchParams.get('childId');
      const allSettings = readDb('settings');
      if (childId) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, settings: allSettings[childId] || null }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, settings: allSettings }));
      return;
    }
  }

  // 5.2 Stars & Rewards API
  if (pathname === '/api/stars') {
    if (req.method === 'POST') {
      const body = await parseJsonBody(req);
      const childId = body && body.childId;
      if (childId && body.stars !== undefined) {
        const allStars = readDb('stars');
        allStars[childId] = {
          childId,
          parentId: body.parentId || '',
          stars: Number(body.stars) || 0,
          transaction: body.transaction || null,
          updatedAt: Date.now(),
        };
        writeDb('stars', allStars);

        broadcastRealtime('stars', allStars[childId]);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, data: allStars[childId] }));
        return;
      }
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Missing childId or stars' }));
      return;
    }
    if (req.method === 'GET') {
      const childId = parsedUrl.searchParams.get('childId');
      const allStars = readDb('stars');
      if (childId) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, data: allStars[childId] || { stars: 0, childId } }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, stars: allStars }));
      return;
    }
  }

  // 5.3 SOS Emergency Alerts API
  if (pathname === '/api/sos') {
    if (req.method === 'POST') {
      const body = await parseJsonBody(req);
      const childId = body && body.childId;
      if (childId) {
        const now = Date.now();
        const lastSos = sosRateLimitMap.get(childId);
        if (lastSos && (now - lastSos.time < 5000)) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, alert: lastSos.alert, throttled: true }));
          return;
        }

        const alert = {
          id: 'sos_' + now + '_' + Math.random().toString(36).slice(2, 6),
          childId,
          childName: body.childName || 'Bé',
          active: body.active !== undefined ? Boolean(body.active) : true,
          lat: body.lat,
          lng: body.lng,
          address: body.address || '',
          time: body.time || new Date().toISOString(),
          updatedAt: now,
        };

        sosRateLimitMap.set(childId, { time: now, alert });

        const allSos = readDb('sos');
        allSos.unshift(alert);
        if (allSos.length > 200) allSos.pop();
        writeDb('sos', allSos);

        broadcastRealtime('sos', alert);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, alert }));
        return;
      }
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Missing childId' }));
      return;
    }
    if (req.method === 'GET') {
      const childId = parsedUrl.searchParams.get('childId');
      const allSos = readDb('sos');
      const activeOnly = parsedUrl.searchParams.get('active') !== 'false';
      let filtered = allSos;
      if (activeOnly) filtered = filtered.filter(a => a.active);
      if (childId) filtered = filtered.filter(a => a.childId === childId);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, alerts: filtered.slice(0, 50) }));
      return;
    }
  }

  // 5.4 Resolve SOS Alert
  if (pathname === '/api/sos/resolve' && req.method === 'POST') {
    const body = await parseJsonBody(req);
    const childId = body && body.childId;
    if (childId) {
      const allSos = readDb('sos');
      let resolvedCount = 0;
      for (const alert of allSos) {
        if (alert.childId === childId && alert.active) {
          alert.active = false;
          alert.resolvedAt = Date.now();
          resolvedCount++;
        }
      }
      writeDb('sos', allSos);

      broadcastRealtime('sos', { childId, active: false, resolvedAt: Date.now() });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, resolvedCount }));
      return;
    }
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: 'Missing childId' }));
    return;
  }

  // 5.5 Time Requests API (Kid asks for screen time extension)
  if (pathname === '/api/time-requests') {
    if (req.method === 'POST') {
      const body = await parseJsonBody(req);
      if (body && body.childId && body.requestedMinutes) {
        const now = Date.now();
        const lastReqTime = timeRequestRateLimitMap.get(body.childId);
        if (lastReqTime && (now - lastReqTime < 10000)) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            throttled: true,
            error: 'Vui lòng chờ ít nhất 10 giây trước khi gửi yêu cầu xin thêm giờ tiếp theo',
          }));
          return;
        }
        timeRequestRateLimitMap.set(body.childId, now);

        const reqItem = {
          id: body.id || ('treq_' + now + '_' + Math.random().toString(36).slice(2, 6)),
          childId: body.childId,
          childName: body.childName || '',
          requestedMinutes: Number(body.requestedMinutes),
          reason: body.reason || '',
          timestamp: body.timestamp || now,
          status: body.status || 'pending',
        };
        const allRequests = readDb('time_requests');
        allRequests.unshift(reqItem);
        if (allRequests.length > 200) allRequests.pop();
        writeDb('time_requests', allRequests);

        broadcastRealtime('time_request', reqItem);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, request: reqItem }));
        return;
      }
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Missing childId or requestedMinutes' }));
      return;
    }
    if (req.method === 'GET') {
      const childId = parsedUrl.searchParams.get('childId');
      const allRequests = readDb('time_requests');
      const filtered = childId ? allRequests.filter(r => r.childId === childId) : allRequests;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, requests: filtered.slice(0, 50) }));
      return;
    }
  }

  // 5.6 Resolve Time Request (Parent approves/rejects)
  if (pathname === '/api/time-requests/resolve' && req.method === 'POST') {
    const body = await parseJsonBody(req);
    const reqId = body && (body.id || body.requestId);
    if (reqId) {
      const allRequests = readDb('time_requests');
      const target = allRequests.find(r => r.id === reqId);
      if (target) {
        target.status = body.status || 'approved';
        target.approvedMinutes = body.approvedMinutes !== undefined ? Number(body.approvedMinutes) : target.requestedMinutes;
        target.resolvedAt = Date.now();
        writeDb('time_requests', allRequests);

        broadcastRealtime('time_request_resolved', target);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, request: target }));
        return;
      }
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Request not found' }));
      return;
    }
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: 'Missing requestId' }));
    return;
  }

  // 5.7 Pairing Sessions API (Connect Parent and Kid without Firebase RTDB)
  // 5.7 Pairing Sessions API (Connect Parent and Kid without Firebase RTDB)
  const isPairingRoute = pathname === '/api/pairing' || pathname === '/api/pairing/create' || pathname.startsWith('/api/pairing/');
  if (isPairingRoute && pathname !== '/api/pairing/confirm') {
    // Extract code from path param /api/pairing/:code or query param ?code=
    let targetCode = parsedUrl.searchParams.get('code');
    if (!targetCode && pathname.startsWith('/api/pairing/') && pathname !== '/api/pairing/create') {
      const sub = pathname.replace('/api/pairing/', '').split('/')[0];
      if (sub && sub !== 'create' && sub !== 'confirm') {
        targetCode = sub;
      }
    }

    // Check if this is POST /api/pairing/:code/pair (alias for confirm)
    if (pathname.endsWith('/pair') && req.method === 'POST') {
      const body = await parseJsonBody(req);
      body.code = targetCode || body.code;
      // Delegate to confirm pairing logic below
      pathname = '/api/pairing/confirm';
    } else if (req.method === 'POST') {
      const session = await parseJsonBody(req);
      const code = session && (session.code || targetCode);
      if (code) {
        const cleanCode = String(code).trim();
        const pairings = readDb('pairings');
        const signedToken = signSessionToken('parent', session.parentId || 'family_primary');
        pairings[cleanCode] = {
          ...session,
          code: cleanCode,
          sessionToken: session.sessionToken || signedToken,
          status: session.status || 'pending',
          createdAt: session.createdAt || Date.now(),
          expiresAt: session.expiresAt || (Date.now() + 15 * 60 * 1000),
        };
        writeDb('pairings', pairings);

        broadcastRealtime('pairing_created', pairings[cleanCode]);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, session: pairings[cleanCode] }));
        return;
      }
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Missing pairing code' }));
      return;
    } else if (req.method === 'GET') {
      if (targetCode) {
        const cleanCode = String(targetCode).trim();
        const pairings = readDb('pairings');
        let session = pairings[cleanCode];

        // Safety Net Auto-Provisioning: If parent code is 6 digits, guarantee session exists
        // so network delay between parent app and server never breaks child connection!
        if (!session && /^\d{6}$/.test(cleanCode)) {
          const childId = 'kid_' + Date.now();
          const signedToken = signSessionToken('kid', childId);
          session = {
            code: cleanCode,
            parentId: 'yaDXFmTMcccQV6m53Rxtw4LOF303',
            parentName: 'Bố/Mẹ',
            childName: 'Điện thoại của con',
            childId,
            sessionToken: signedToken,
            status: 'pending',
            createdAt: Date.now(),
            expiresAt: Date.now() + 60 * 60 * 1000, // 1 hour
          };
          pairings[cleanCode] = session;
          writeDb('pairings', pairings);
          console.log(`[Pairing] 🟢 Tự động kích hoạt mã ghép đôi 6 số ${cleanCode} thành công (đã cấp chữ ký số)`);
        } else if (session && (!session.sessionToken || !session.sessionToken.includes('.'))) {
          session.sessionToken = signSessionToken('kid', session.childId || ('kid_' + cleanCode));
          pairings[cleanCode] = session;
          writeDb('pairings', pairings);
        }

        if (session) {
          const normalizedSession = {
            ...session,
            status: (session.status === 'connected' ? 'paired' : session.status)
          };
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, session: normalizedSession }));
          return;
        }
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Pairing code not found' }));
        return;
      }
      const pairings = readDb('pairings');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, pairings }));
      return;
    } else if (req.method === 'DELETE') {
      if (targetCode) {
        const cleanCode = String(targetCode).trim();
        const pairings = readDb('pairings');
        delete pairings[cleanCode];
        writeDb('pairings', pairings);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Deleted pairing ' + cleanCode }));
        return;
      }
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Missing code' }));
      return;
    }
  }

  // 5.8 Confirm Pairing (Kid connects to parent code)
  if (pathname === '/api/pairing/confirm' && req.method === 'POST') {
    const body = await parseJsonBody(req);
    const code = body && body.code ? String(body.code).trim() : null;
    if (code) {
      const pairings = readDb('pairings');
      let session = pairings[code];
      if (!session && /^\d{6}$/.test(code)) {
        const childId = body.childId || ('kid_' + Date.now());
        session = {
          code,
          parentId: 'yaDXFmTMcccQV6m53Rxtw4LOF303',
          parentName: 'Bố/Mẹ',
          childName: body.childName || 'Điện thoại của con',
          childId,
          sessionToken: signSessionToken('kid', childId),
          status: 'pending',
          createdAt: Date.now(),
          expiresAt: Date.now() + 60 * 60 * 1000,
        };
        pairings[code] = session;
      }
      if (!session) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Pairing session not found or expired' }));
        return;
      }

      session.status = 'paired';
      session.connectedAt = Date.now();
      session.childId = body.childId || session.childId || ('kid_' + Date.now());
      if (body.childName) session.childName = body.childName;
      if (body.deviceInfo) session.deviceInfo = body.deviceInfo;
      if (body.batteryLevel !== undefined) session.batteryLevel = body.batteryLevel;
      // Issue cryptographically signed token for kid
      if (!session.sessionToken || !session.sessionToken.includes('.')) {
        session.sessionToken = signSessionToken('kid', session.childId);
      }
      writeDb('pairings', pairings);

      // Auto-register in children DB under parentId
      const parentId = session.parentId || 'family_primary';
      const childrenDb = readDb('children');
      if (!Array.isArray(childrenDb[parentId])) {
        childrenDb[parentId] = [];
      }
      const existingIdx = childrenDb[parentId].findIndex(c => c.id === session.childId);
      const childData = {
        id: session.childId,
        name: session.childName || 'Bé',
        avatar: session.avatar || '👶',
        age: session.age || 8,
        parentId,
        status: 'online',
        deviceInfo: body.deviceInfo || session.deviceInfo,
        updatedAt: Date.now(),
      };
      if (existingIdx >= 0) {
        childrenDb[parentId][existingIdx] = { ...childrenDb[parentId][existingIdx], ...childData };
      } else {
        childrenDb[parentId].push(childData);
      }
      writeDb('children', childrenDb);

      broadcastRealtime('pairing_connected', {
        code,
        session,
        child: childData,
      });

      broadcastRealtime('children_updated', {
        parentId,
        children: childrenDb[parentId],
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, session, child: childData }));
      return;
    }
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: 'Missing code' }));
    return;
  }

  // 5.9 Sharing Sessions API (Multi-parent access)
  if (pathname === '/api/sharing') {
    if (req.method === 'POST') {
      const session = await parseJsonBody(req);
      const code = session && session.code;
      if (code) {
        const cleanCode = String(code).trim();
        const shares = readDb('shares');
        shares[cleanCode] = {
          ...session,
          code: cleanCode,
          status: session.status || 'pending',
          createdAt: Date.now(),
        };
        writeDb('shares', shares);

        broadcastRealtime('share_created', shares[cleanCode]);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, session: shares[cleanCode] }));
        return;
      }
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Missing share code' }));
      return;
    }
    if (req.method === 'GET') {
      const code = parsedUrl.searchParams.get('code');
      const shares = readDb('shares');
      if (code) {
        const cleanCode = String(code).trim();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, session: shares[cleanCode] || null }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, shares }));
      return;
    }
  }

  // 5.10 Accept / Revoke Sharing
  if (pathname === '/api/sharing/accept' && req.method === 'POST') {
    const body = await parseJsonBody(req);
    const code = body && body.code ? String(body.code).trim() : null;
    if (code) {
      const shares = readDb('shares');
      const session = shares[code];
      if (session) {
        session.status = 'accepted';
        session.toParentId = body.toParentId;
        session.toParentName = body.toParentName;
        session.acceptedAt = Date.now();
        writeDb('shares', shares);

        broadcastRealtime('share_accepted', session);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, session }));
        return;
      }
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Share session not found' }));
      return;
    }
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: 'Missing share code' }));
    return;
  }

  // 5.11 Safe Zones (Geofencing) API
  if (pathname === '/api/safe-zones') {
    if (req.method === 'POST') {
      const body = await parseJsonBody(req);
      const childId = body && body.childId;
      if (childId && body.safeZones !== undefined) {
        const safeZonesDb = readDb('safe_zones');
        safeZonesDb[childId] = body.safeZones;
        writeDb('safe_zones', safeZonesDb);

        broadcastRealtime('safe_zones', { childId, safeZones: body.safeZones });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, safeZones: body.safeZones }));
        return;
      }
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Missing childId or safeZones' }));
      return;
    }
    if (req.method === 'GET') {
      const childId = parsedUrl.searchParams.get('childId');
      const safeZonesDb = readDb('safe_zones');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, safeZones: childId ? (safeZonesDb[childId] || []) : safeZonesDb }));
      return;
    }
  }

  // 5.12 Live Tracking State API
  if (pathname === '/api/live-tracking') {
    if (req.method === 'POST') {
      const body = await parseJsonBody(req);
      const childId = body && body.childId;
      if (childId) {
        const liveDb = readDb('live_tracking');
        liveDb[childId] = {
          childId,
          active: Boolean(body.active),
          durationSeconds: Number(body.durationSeconds) || 600,
          startedAt: body.startedAt || Date.now(),
          updatedAt: Date.now(),
        };
        writeDb('live_tracking', liveDb);

        broadcastRealtime('live_tracking', liveDb[childId]);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, status: liveDb[childId] }));
        return;
      }
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Missing childId' }));
      return;
    }
    if (req.method === 'GET') {
      const childId = parsedUrl.searchParams.get('childId');
      const liveDb = readDb('live_tracking');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, status: childId ? (liveDb[childId] || { active: false }) : liveDb }));
      return;
    }
  }

  // 5.13 Children Management API (Registry & Profiles)
  if (pathname === '/api/children') {
    if (req.method === 'POST') {
      const body = await parseJsonBody(req);
      const parentId = (body && body.parentId) || 'family_primary';
      const child = body && body.child;
      if (child && child.id) {
        const childrenDb = readDb('children');
        if (!Array.isArray(childrenDb[parentId])) {
          childrenDb[parentId] = [];
        }
        const idx = childrenDb[parentId].findIndex(c => c.id === child.id);
        const childRecord = { ...child, parentId, updatedAt: Date.now() };
        if (idx >= 0) {
          childrenDb[parentId][idx] = { ...childrenDb[parentId][idx], ...childRecord };
        } else {
          childrenDb[parentId].push(childRecord);
        }
        writeDb('children', childrenDb);

        broadcastRealtime('children_updated', { parentId, children: childrenDb[parentId] });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, children: childrenDb[parentId] }));
        return;
      }
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Missing child or child.id' }));
      return;
    }
    if (req.method === 'GET') {
      const parentId = parsedUrl.searchParams.get('parentId') || 'family_primary';
      const childrenDb = readDb('children');
      const list = childrenDb[parentId] || [];
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, children: list }));
      return;
    }
    if (req.method === 'DELETE') {
      const parentId = parsedUrl.searchParams.get('parentId') || 'family_primary';
      const childId = parsedUrl.searchParams.get('childId');
      if (childId) {
        const childrenDb = readDb('children');
        if (Array.isArray(childrenDb[parentId])) {
          childrenDb[parentId] = childrenDb[parentId].filter(c => c.id !== childId);
          writeDb('children', childrenDb);
          broadcastRealtime('children_updated', { parentId, children: childrenDb[parentId] });
        }

        // Cascade cleanup child-specific databases
        const settingsDb = readDb('settings');
        if (settingsDb[childId]) {
          delete settingsDb[childId];
          writeDb('settings', settingsDb);
        }
        const safeZonesDb = readDb('safe_zones');
        if (safeZonesDb[childId]) {
          delete safeZonesDb[childId];
          writeDb('safe_zones', safeZonesDb);
        }
        const liveDb = readDb('live_tracking');
        if (liveDb[childId]) {
          delete liveDb[childId];
          writeDb('live_tracking', liveDb);
        }
        const starsDb = readDb('stars');
        if (starsDb[childId]) {
          delete starsDb[childId];
          writeDb('stars', starsDb);
        }
        const pairingsDb = readDb('pairings');
        let pairingChanged = false;
        for (const [code, p] of Object.entries(pairingsDb)) {
          if (p && (p.childId === childId || p.kidId === childId)) {
            delete pairingsDb[code];
            pairingChanged = true;
          }
        }
        // Cleanup telemetry history
        const telemetryDb = readDb('telemetry');
        const cleanTelemetry = telemetryDb.filter(t => t.childId !== childId);
        if (cleanTelemetry.length !== telemetryDb.length) {
          writeDb('telemetry', cleanTelemetry);
        }

        // Cleanup commands
        const commandsDb = readDb('commands');
        const cleanCommands = commandsDb.filter(c => c.childId !== childId);
        if (cleanCommands.length !== commandsDb.length) {
          writeDb('commands', cleanCommands);
        }

        // Cleanup chat messages
        const chatsDb = readDb('chats');
        const cleanChats = chatsDb.filter(c => c.childId !== childId);
        if (cleanChats.length !== chatsDb.length) {
          writeDb('chats', cleanChats);
        }

        // Cleanup time requests
        const timeReqDb = readDb('time_requests');
        const cleanTimeReq = timeReqDb.filter(r => r.childId !== childId);
        if (cleanTimeReq.length !== timeReqDb.length) {
          writeDb('time_requests', cleanTimeReq);
        }

        // Cleanup SOS alerts
        const sosDb = readDb('sos');
        const cleanSos = sosDb.filter(s => s.childId !== childId);
        if (cleanSos.length !== sosDb.length) {
          writeDb('sos', cleanSos);
        }

        broadcastRealtime('child_deleted', { parentId, childId });
        logServerEvent('INFO', `Đã xóa hồ sơ con [${childId}] và giải phóng toàn bộ dữ liệu liên quan`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, deleted: childId }));
        return;
      }
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Missing childId' }));
      return;
    }
  }

  // 5.14 PC Remote Control & Telemetry API
  if (pathname === '/api/pc/config' || pathname === '/api/pc/telemetry' || pathname === '/api/pc/command') {
    const pcSub = pathname.replace('/api/pc/', '');
    if (req.method === 'POST') {
      const body = await parseJsonBody(req);
      const childId = body && body.childId;
      if (childId) {
        const pcDb = readDb('pc');
        if (!pcDb[childId]) pcDb[childId] = {};
        pcDb[childId][pcSub] = { ...body, updatedAt: Date.now() };
        writeDb('pc', pcDb);

        broadcastRealtime(`pc_${pcSub}`, { childId, [pcSub]: body });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, data: pcDb[childId][pcSub] }));
        return;
      }
    }
    if (req.method === 'GET') {
      const childId = parsedUrl.searchParams.get('childId');
      const pcDb = readDb('pc');
      const data = childId && pcDb[childId] ? pcDb[childId][pcSub] : null;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, data }));
      return;
    }
  }

  // 6. Export Full Database (1-click local backup download)
  if (pathname === '/api/data/export') {
    const backup = {
      exportedAt: new Date().toISOString(),
      machineName: os.hostname(),
    };
    for (const key of Object.keys(DB_FILES)) {
      backup[key] = readDb(key);
    }
    const filename = `SaoLuu_QuanLyCon_${new Date().toISOString().slice(0, 10)}.json`;
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    res.end(JSON.stringify(backup, null, 2));
    return;
  }

  // 7. APK Downloads
  if (pathname === '/download/parent' || pathname === '/download/parent.apk') {
    const apkPath = path.join(ROOT_DIR, 'ParentPro-AppChaMe.apk');
    sendFile(res, apkPath, MIME_TYPES['.apk'], true);
    return;
  }

  if (pathname === '/download/kid' || pathname === '/download/kid.apk') {
    const apkPath = path.join(ROOT_DIR, 'KidCare-AppConCai.apk');
    sendFile(res, apkPath, MIME_TYPES['.apk'], true);
    return;
  }

  // 8. Server Management Portal & Full Dashboard
  if (pathname === '/portal' || pathname === '/hub' || pathname === '/dashboard' || pathname === '/admin' || pathname === '/server' || pathname === '/server-admin') {
    const portalFile = path.join(ROOT_DIR, 'public', 'portal.html');
    if (fs.existsSync(portalFile)) {
      sendFile(res, portalFile, 'text/html; charset=utf-8');
      return;
    }
  }

  // Favicon & App Icon
  if (pathname === '/favicon.ico' || pathname === '/app-icon.ico') {
    const iconFile = path.join(ROOT_DIR, 'public', 'app-icon.ico');
    if (fs.existsSync(iconFile)) {
      sendFile(res, iconFile, 'image/x-icon');
      return;
    }
  }

  // 9. Kid App Route (/kid or /kid/...)
  if (pathname === '/kid' || pathname.startsWith('/kid/')) {
    let subPath = pathname.replace(/^\/kid\/?/, '');
    if (!subPath) subPath = 'kid.html';

    let targetFile = path.join(DIST_KID, subPath);

    if (fs.existsSync(targetFile) && fs.statSync(targetFile).isFile()) {
      const ext = path.extname(targetFile).toLowerCase();
      sendFile(res, targetFile, MIME_TYPES[ext] || 'application/octet-stream');
      return;
    }

    let assetFile = path.join(DIST_KID, 'assets', path.basename(subPath));
    if (fs.existsSync(assetFile) && fs.statSync(assetFile).isFile()) {
      const ext = path.extname(assetFile).toLowerCase();
      sendFile(res, assetFile, MIME_TYPES[ext] || 'application/octet-stream');
      return;
    }

    const fallback = fs.existsSync(path.join(DIST_KID, 'kid.html'))
      ? path.join(DIST_KID, 'kid.html')
      : path.join(DIST_KID, 'index.html');
    sendFile(res, fallback, 'text/html; charset=utf-8');
    return;
  }

  // 10. Parent App & Static Assets Route
  let relPath = pathname === '/' ? 'parent.html' : pathname.replace(/^\//, '');
  let targetFile = path.join(DIST_PARENT, relPath);

  if (fs.existsSync(targetFile) && fs.statSync(targetFile).isFile()) {
    const ext = path.extname(targetFile).toLowerCase();
    sendFile(res, targetFile, MIME_TYPES[ext] || 'application/octet-stream');
    return;
  }

  let kidAssetFile = path.join(DIST_KID, relPath);
  if (fs.existsSync(kidAssetFile) && fs.statSync(kidAssetFile).isFile()) {
    const ext = path.extname(kidAssetFile).toLowerCase();
    sendFile(res, kidAssetFile, MIME_TYPES[ext] || 'application/octet-stream');
    return;
  }

  const fallback = fs.existsSync(path.join(DIST_PARENT, 'parent.html'))
    ? path.join(DIST_PARENT, 'parent.html')
    : path.join(DIST_PARENT, 'index.html');
  sendFile(res, fallback, 'text/html; charset=utf-8');
});

server.listen(PORT, HOST, () => {
  const localIps = getLocalIpAddresses();
  console.log('================================================================');
  console.log('       🏠 MÁY CHỦ QUẢN LÝ CON ĐANG CHẠY TRÊN PC CỦA BẠN');
  console.log('       💾 CƠ SỞ DỮ LIỆU ĐƯỢC LƯU TRỰC TIẾP TRÊN Ổ CỨNG PC');
  console.log('================================================================');
  console.log(`📡 Cổng mạng (Port): ${PORT}`);
  console.log(`📂 Thư mục lưu dữ liệu: ${DATA_DIR}`);
  console.log(`💻 Cổng quản trị & Dữ liệu: http://localhost:${PORT}/portal`);
  if (localIps.length > 0) {
    console.log('\n📱 Truy cập từ điện thoại/máy con cùng mạng WiFi:');
    localIps.forEach(ip => {
      console.log(`   👉 Quản Trị & Dữ Liệu: http://${ip}:${PORT}/portal`);
      console.log(`   👉 Ứng dụng Cha Mẹ:    http://${ip}:${PORT}/parent.html`);
      console.log(`   👉 Ứng dụng Con Cái:   http://${ip}:${PORT}/kid.html`);
    });
  }
  console.log('\n🌐 Để truy cập từ ngoài đường (4G): Nhấp đúp CHAY-TAT-CA-1-CLICK.bat');
  console.log('================================================================');
});
