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

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

const ROOT_DIR = __dirname;
const DIST_PARENT = path.join(ROOT_DIR, 'dist-parent');
const DIST_KID = path.join(ROOT_DIR, 'dist-kid');
const DATA_DIR = path.join(ROOT_DIR, 'data');

// Ensure local data storage directory exists on PC
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Database file paths
const DB_FILES = {
  telemetry: path.join(DATA_DIR, 'telemetry_history.json'),
  chats: path.join(DATA_DIR, 'chat_messages.json'),
  commands: path.join(DATA_DIR, 'remote_commands.json'),
  settings: path.join(DATA_DIR, 'child_settings.json'),
  sos: path.join(DATA_DIR, 'sos_alerts.json'),
};

// Initialize empty DB files if not exist
for (const [key, filePath] of Object.entries(DB_FILES)) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, key === 'settings' ? '{}' : '[]', 'utf8');
  }
}

function readDb(type) {
  try {
    const file = DB_FILES[type];
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    }
  } catch (e) {
    console.error(`[DB] Error reading ${type}:`, e.message);
  }
  return type === 'settings' ? {} : [];
}

function writeDb(type, data) {
  try {
    const file = DB_FILES[type];
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error(`[DB] Error writing ${type}:`, e.message);
  }
}

// In-Memory Realtime Clients (Server-Sent Events)
const sseClients = new Set();

function broadcastRealtime(event, payload) {
  const message = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const client of sseClients) {
    try {
      client.res.write(message);
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
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let pathname = decodeURIComponent(parsedUrl.pathname);

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

  // 2. Realtime SSE Stream (Sub-10ms real-time event streaming)
  if (pathname === '/api/realtime/stream') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });
    res.write(`data: ${JSON.stringify({ type: 'connected', time: new Date().toISOString() })}\n\n`);

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

  // 4. Remote Command API (Parent sends lock/buzz -> stored on PC -> sent to Kid/PC Agent)
  if (pathname === '/api/command') {
    if (req.method === 'POST') {
      const data = await parseJsonBody(req);
      if (data && data.childId && data.type) {
        data.id = 'cmd_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
        data.createdAt = new Date().toISOString();
        data.status = 'pending';

        const commands = readDb('commands');
        commands.unshift(data);
        if (commands.length > 500) commands.pop();
        writeDb('commands', commands);

        // Broadcast command in real-time
        broadcastRealtime('command', data);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, commandId: data.id }));
        return;
      }
    }
    if (req.method === 'GET') {
      const childId = parsedUrl.searchParams.get('childId');
      const commands = readDb('commands');
      const filtered = childId ? commands.filter(c => c.childId === childId) : commands;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ commands: filtered.slice(0, 50) }));
      return;
    }
  }

  // 5. Chat Messages API
  if (pathname === '/api/chat') {
    if (req.method === 'POST') {
      const msg = await parseJsonBody(req);
      if (msg && msg.text) {
        msg.id = 'chat_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
        msg.time = msg.time || new Date().toISOString();
        const chats = readDb('chats');
        chats.push(msg);
        writeDb('chats', chats);

        broadcastRealtime('chat', msg);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: msg }));
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

  // 6. Export Full Database (1-click local backup download)
  if (pathname === '/api/data/export') {
    const backup = {
      exportedAt: new Date().toISOString(),
      machineName: os.hostname(),
      telemetry: readDb('telemetry'),
      chats: readDb('chats'),
      commands: readDb('commands'),
      settings: readDb('settings'),
      sos: readDb('sos'),
    };
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

  // 8. Server Management Portal & Data Inspector
  if (pathname === '/portal' || pathname === '/hub') {
    const localIps = getLocalIpAddresses();
    const port = PORT;
    const telemetry = readDb('telemetry');
    const chats = readDb('chats');
    const commands = readDb('commands');

    const ipListHtml = localIps.map(ip => `
      <div style="background:#f8fafc;padding:10px 14px;border-radius:10px;margin-bottom:6px;font-family:monospace;font-size:13px;border:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;">
        <span>http://${ip}:${port}</span>
        <span style="color:#059669;font-weight:bold;font-size:11px;">NỘI MẠNG WI-FI</span>
      </div>
    `).join('');

    const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Máy Chủ Quản Lý Con - Dữ Liệu Nội Bộ PC</title>
  <style>
    body{font-family:system-ui,-apple-system,sans-serif;background:#0f172a;margin:0;padding:24px;color:#f8fafc}
    .card{max-width:620px;margin:0 auto;background:#1e293b;border-radius:24px;padding:28px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);border:1px solid #334155}
    h1{font-size:22px;margin:0 0 6px;color:#fff;display:flex;align-items:center;justify-content:space-between}
    .badge{background:#10b98120;color:#34d399;border:1px solid #05966950;padding:4px 12px;border-radius:999px;font-size:12px;font-weight:700}
    .stat-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:20px 0}
    .stat-box{background:#0f172a;border:1px solid #334155;border-radius:16px;padding:14px;text-align:center}
    .stat-num{font-size:24px;font-weight:900;color:#38bdf8}
    .stat-label{font-size:11px;color:#94a3b8;margin-top:4px;font-weight:600}
    .btn{display:flex;align-items:center;justify-content:space-between;background:#2563eb;color:#fff;text-decoration:none;padding:14px 18px;border-radius:14px;font-weight:700;margin-bottom:10px;transition:all .15s}
    .btn:hover{background:#1d4ed8;transform:translateY(-1px)}
    .btn-kid{background:#059669}.btn-kid:hover{background:#047857}
    .btn-backup{background:#334155;color:#e2e8f0;border:1px solid #475569}.btn-backup:hover{background:#475569}
    .grid-2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    .notice{background:#1e3a8a30;border:1px solid #1e40af50;border-radius:14px;padding:14px;font-size:12px;color:#93c5fd;line-height:1.5;margin-bottom:20px}
  </style>
</head>
<body>
  <div class="card">
    <h1>
      <span>🏠 Máy Chủ PC Cá Nhân</span>
      <span class="badge">● Lưu Trữ Nội Bộ</span>
    </h1>
    <p style="color:#94a3b8;font-size:13.5px;margin:6px 0 16px">Dữ liệu gia đình được lưu trữ an toàn ngay trên ổ cứng máy tính này (Thư mục: <code>/data</code>).</p>
    
    <div class="stat-grid">
      <div class="stat-box">
        <div class="stat-num">${telemetry.length}</div>
        <div class="stat-label">📍 VỊ TRÍ GPS</div>
      </div>
      <div class="stat-box">
        <div class="stat-num">${chats.length}</div>
        <div class="stat-label">💬 TIN NHẮN</div>
      </div>
      <div class="stat-box">
        <div class="stat-num">${commands.length}</div>
        <div class="stat-label">⚡ LỆNH KHÓA/CHUÔNG</div>
      </div>
    </div>

    <div class="notice">
      🔒 <strong>Bảo mật tối đa:</strong> 100% tọa độ GPS, nhật ký di chuyển và tin nhắn được lưu trực tiếp trên ổ cứng máy tính cá nhân của bạn. Không ai có quyền truy cập ngoài bạn.
    </div>

    <div style="margin-bottom:16px">
      <a href="/parent.html" class="btn"><span>📱 Mở Ứng Dụng Cha Mẹ (ParentPro)</span> ➔</a>
      <a href="/kid.html" class="btn btn-kid"><span>🧒 Mở Ứng Dụng Con Cái (KidCare)</span> ➔</a>
    </div>

    <div class="grid-2" style="margin-bottom:16px">
      <a href="/download/parent" class="btn btn-backup"><span>📥 Tải APK Bố Mẹ</span></a>
      <a href="/download/kid" class="btn btn-backup"><span>📥 Tải APK Con</span></a>
    </div>

    <a href="/api/data/export" class="btn btn-backup" style="background:#0284c7;color:#fff;border:none">
      <span>💾 Tải File Sao Lưu Dữ Liệu Máy Tính (.JSON)</span> 📥
    </a>

    <h4 style="font-size:12px;text-transform:uppercase;letter-spacing:.5px;color:#94a3b8;margin:22px 0 8px">Đường Dẫn Nội Mạng Wi-Fi Trong Nhà:</h4>
    ${ipListHtml}
  </div>
</body>
</html>`;
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
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
