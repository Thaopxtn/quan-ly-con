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
