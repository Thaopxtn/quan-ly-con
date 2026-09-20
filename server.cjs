/**
 * High-Performance Production Server for "Quản Lý Con" (ParentPro & KidCare)
 * Zero external dependencies - pure Node.js HTTP server.
 * Handles Parent App, Kid App, PC Client, and Direct APK Downloads.
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
      // 1 year cache for hashed assets
      headers['Cache-Control'] = 'public, max-age=31536000, immutable';
    } else {
      // HTML files: revalidate
      headers['Cache-Control'] = 'no-cache';
    }

    res.writeHead(200, headers);
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
}

const server = http.createServer((req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let pathname = decodeURIComponent(parsedUrl.pathname);

  // Health check
  if (pathname === '/api/health' || pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      service: 'QuanLyCon-HomeServer'
    }));
    return;
  }

  // Server Management Portal
  if (pathname === '/portal' || pathname === '/hub') {
    const localIps = getLocalIpAddresses();
    const port = PORT;
    const ipListHtml = localIps.map(ip => `
      <div style="background:#f8fafc;padding:12px;border-radius:10px;margin-bottom:8px;font-family:monospace;font-size:13px;border:1px solid #e2e8f0;">
        <strong>Wi-Fi IP:</strong> http://${ip}:${port}
      </div>
    `).join('');

    const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Cổng Quản Trị Máy Chủ - Quản Lý Con</title>
  <style>
    body{font-family:system-ui,-apple-system,sans-serif;background:#f1f5f9;margin:0;padding:24px;color:#1e293b}
    .card{max-width:580px;margin:0 auto;background:#fff;border-radius:20px;padding:28px;box-shadow:0 10px 25px -5px rgba(0,0,0,0.05);border:1px solid #e2e8f0}
    h1{font-size:22px;margin:0 0 8px;color:#0f172a;display:flex;align-items:center;gap:10px}
    .badge{display:inline-block;background:#dcfce7;color:#15803d;padding:4px 10px;border-radius:999px;font-size:12px;font-weight:700}
    .btn{display:flex;align-items:center;justify-content:space-between;background:#2563eb;color:#fff;text-decoration:none;padding:14px 18px;border-radius:14px;font-weight:700;margin-bottom:10px;transition:all .15s}
    .btn:hover{background:#1d4ed8;transform:translateY(-1px)}
    .btn-kid{background:#059669}.btn-kid:hover{background:#047857}
    .btn-apk{background:#f8fafc;color:#0f172a;border:1.5px solid #cbd5e1}.btn-apk:hover{background:#f1f5f9}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  </style>
</head>
<body>
  <div class="card">
    <h1>🏠 Máy Chủ Quản Lý Con <span class="badge">● Online</span></h1>
    <p style="color:#64748b;font-size:14px;margin-bottom:20px">Máy tính cá nhân của bạn đang hoạt động như một máy chủ phục vụ ứng dụng cho cả gia đình.</p>
    
    <div style="margin-bottom:20px">
      <a href="/parent.html" class="btn"><span>📱 Mở Ứng Dụng Cha Mẹ (ParentPro)</span> ➔</a>
      <a href="/kid.html" class="btn btn-kid"><span>🧒 Mở Ứng Dụng Con Cái (KidCare)</span> ➔</a>
    </div>

    <h3 style="font-size:14px;text-transform:uppercase;letter-spacing:.5px;color:#64748b;margin:24px 0 10px">Tải File APK Cài Đặt Android</h3>
    <div class="grid">
      <a href="/download/parent" class="btn btn-apk"><span>📥 Tải APK Bố Mẹ</span></a>
      <a href="/download/kid" class="btn btn-apk"><span>📥 Tải APK Con</span></a>
    </div>

    <h3 style="font-size:14px;text-transform:uppercase;letter-spacing:.5px;color:#64748b;margin:24px 0 10px">Địa Chỉ Truy Cập Nội Mạng (Cùng Wi-Fi)</h3>
    ${ipListHtml}
  </div>
</body>
</html>`;
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }

  // APK Downloads
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

  // Kid App Route (/kid or /kid/...)
  if (pathname === '/kid' || pathname.startsWith('/kid/')) {
    let subPath = pathname.replace(/^\/kid\/?/, '');
    if (!subPath) subPath = 'kid.html';

    let targetFile = path.join(DIST_KID, subPath);

    if (fs.existsSync(targetFile) && fs.statSync(targetFile).isFile()) {
      const ext = path.extname(targetFile).toLowerCase();
      sendFile(res, targetFile, MIME_TYPES[ext] || 'application/octet-stream');
      return;
    }

    // Also check assets inside dist-kid
    let assetFile = path.join(DIST_KID, 'assets', path.basename(subPath));
    if (fs.existsSync(assetFile) && fs.statSync(assetFile).isFile()) {
      const ext = path.extname(assetFile).toLowerCase();
      sendFile(res, assetFile, MIME_TYPES[ext] || 'application/octet-stream');
      return;
    }

    // SPA Fallback for Kid
    const fallback = fs.existsSync(path.join(DIST_KID, 'kid.html'))
      ? path.join(DIST_KID, 'kid.html')
      : path.join(DIST_KID, 'index.html');
    sendFile(res, fallback, 'text/html; charset=utf-8');
    return;
  }

  // Parent App & Static Assets Route
  let relPath = pathname === '/' ? 'parent.html' : pathname.replace(/^\//, '');
  let targetFile = path.join(DIST_PARENT, relPath);

  // If file exists directly in dist-parent
  if (fs.existsSync(targetFile) && fs.statSync(targetFile).isFile()) {
    const ext = path.extname(targetFile).toLowerCase();
    sendFile(res, targetFile, MIME_TYPES[ext] || 'application/octet-stream');
    return;
  }

  // Check if asset is requested from dist-kid's assets if not in parent
  let kidAssetFile = path.join(DIST_KID, relPath);
  if (fs.existsSync(kidAssetFile) && fs.statSync(kidAssetFile).isFile()) {
    const ext = path.extname(kidAssetFile).toLowerCase();
    sendFile(res, kidAssetFile, MIME_TYPES[ext] || 'application/octet-stream');
    return;
  }

  // SPA Fallback to Parent App
  const fallback = fs.existsSync(path.join(DIST_PARENT, 'parent.html'))
    ? path.join(DIST_PARENT, 'parent.html')
    : path.join(DIST_PARENT, 'index.html');
  sendFile(res, fallback, 'text/html; charset=utf-8');
});

server.listen(PORT, HOST, () => {
  const localIps = getLocalIpAddresses();
  console.log('================================================================');
  console.log('       🏠 MÁY CHỦ QUẢN LÝ CON ĐANG CHẠY TRÊN PC CỦA BẠN');
  console.log('================================================================');
  console.log(`📡 Cổng mạng (Port): ${PORT}`);
  console.log(`💻 Truy cập tại máy này: http://localhost:${PORT}`);
  if (localIps.length > 0) {
    console.log('\n📱 Truy cập từ điện thoại/máy con cùng mạng WiFi:');
    localIps.forEach(ip => {
      console.log(`   👉 Ứng dụng Cha Mẹ:  http://${ip}:${PORT}`);
      console.log(`   👉 Ứng dụng Con Cái: http://${ip}:${PORT}/kid`);
      console.log(`   📥 Tải APK Cha Mẹ:   http://${ip}:${PORT}/download/parent`);
      console.log(`   📥 Tải APK Con Cái:  http://${ip}:${PORT}/download/kid`);
    });
  }
  console.log('\n🌐 Để truy cập từ ngoài đường (4G): Dùng Cloudflare Tunnel (Miễn phí).');
  console.log('================================================================');
});
