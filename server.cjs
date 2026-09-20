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

function readDb(type) {
  try {
    const file = DB_FILES[type];
    if (file && fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    }
  } catch (e) {
    console.error(`[DB] Error reading ${type}:`, e.message);
  }
  return OBJECT_DB_KEYS.has(type) ? {} : [];
}

function writeDb(type, data) {
  try {
    const file = DB_FILES[type];
    if (file) {
      fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
    }
  } catch (e) {
    console.error(`[DB] Error writing ${type}:`, e.message);
  }
}

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

  // 4. Remote Command API (Parent sends lock/buzz -> stored on PC -> sent to Kid)
  if (pathname === '/api/command') {
    if (req.method === 'POST') {
      const data = await parseJsonBody(req);
      if (data && data.childId && (data.type || data.command)) {
        data.id = data.id || ('cmd_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6));
        data.type = data.type || data.command;
        data.createdAt = data.createdAt || new Date().toISOString();
        data.status = data.status || 'pending';

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

  // 4.1 Remote Command ACK API (Kid sends execution feedback back to Parent)
  if (pathname === '/api/command/ack') {
    if (req.method === 'POST') {
      const ack = await parseJsonBody(req);
      const cmdId = ack && (ack.commandId || ack.id);
      if (cmdId) {
        const commands = readDb('commands');
        const targetCmd = commands.find(c => c.id === cmdId);
        if (targetCmd) {
          targetCmd.status = ack.status || 'executed';
          targetCmd.acknowledgedAt = new Date().toISOString();
          if (ack.deviceName) targetCmd.deviceName = ack.deviceName;
          if (ack.childName) targetCmd.childName = ack.childName;
          if (ack.detail) targetCmd.detail = ack.detail;
          writeDb('commands', commands);
        }
        broadcastRealtime('command_ack', {
          commandId: cmdId,
          command: ack.command || (targetCmd ? targetCmd.type : ''),
          status: ack.status || 'executed',
          childId: ack.childId,
          childName: ack.childName,
          deviceName: ack.deviceName,
          detail: ack.detail || 'Thực thi thành công trên máy con',
          executedAt: ack.executedAt || Date.now(),
          timestamp: new Date().toISOString(),
        });
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

  // 5.1 Child Settings API (Screen time, app limits, daily schedules, hardware controls)
  if (pathname === '/api/settings') {
    if (req.method === 'POST') {
      const body = await parseJsonBody(req);
      const childId = body && (body.childId || (body.settings && body.settings.childId));
      if (childId) {
        const settingsPayload = body.settings !== undefined ? body.settings : body;
        const allSettings = readDb('settings');
        const existing = allSettings[childId] || {};
        allSettings[childId] = {
          ...existing,
          ...settingsPayload,
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
        const alert = {
          id: 'sos_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
          childId,
          childName: body.childName || 'Bé',
          active: body.active !== undefined ? Boolean(body.active) : true,
          lat: body.lat,
          lng: body.lng,
          address: body.address || '',
          time: body.time || new Date().toISOString(),
          updatedAt: Date.now(),
        };
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
        const reqItem = {
          id: body.id || ('treq_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6)),
          childId: body.childId,
          childName: body.childName || '',
          requestedMinutes: Number(body.requestedMinutes),
          reason: body.reason || '',
          timestamp: body.timestamp || Date.now(),
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
  if (pathname === '/api/pairing' || pathname === '/api/pairing/create') {
    if (req.method === 'POST') {
      const session = await parseJsonBody(req);
      const code = session && session.code;
      if (code) {
        const cleanCode = String(code).trim();
        const pairings = readDb('pairings');
        pairings[cleanCode] = {
          ...session,
          code: cleanCode,
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
    }
    if (req.method === 'GET') {
      const code = parsedUrl.searchParams.get('code');
      if (code) {
        const cleanCode = String(code).trim();
        const pairings = readDb('pairings');
        const session = pairings[cleanCode];
        if (session) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, session }));
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
    }
  }

  // 5.8 Confirm Pairing (Kid connects to parent code)
  if (pathname === '/api/pairing/confirm' && req.method === 'POST') {
    const body = await parseJsonBody(req);
    const code = body && body.code ? String(body.code).trim() : null;
    if (code) {
      const pairings = readDb('pairings');
      const session = pairings[code];
      if (!session) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Pairing session not found or expired' }));
        return;
      }

      session.status = 'connected';
      session.connectedAt = Date.now();
      session.childId = body.childId || session.childId || ('kid_' + Date.now());
      if (body.childName) session.childName = body.childName;
      if (body.deviceInfo) session.deviceInfo = body.deviceInfo;
      if (body.batteryLevel !== undefined) session.batteryLevel = body.batteryLevel;
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
  if (pathname === '/portal' || pathname === '/hub' || pathname === '/dashboard' || pathname === '/admin') {
    const portalFile = path.join(ROOT_DIR, 'public', 'portal.html');
    if (fs.existsSync(portalFile)) {
      sendFile(res, portalFile, 'text/html; charset=utf-8');
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
