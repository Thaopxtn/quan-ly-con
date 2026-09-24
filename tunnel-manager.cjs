/**
 * Cloudflare Tunnel Manager for ParentPro & KidCare
 * - Runs and supervises cloudflared tunnel
 * - Automatically captures public 4G HTTPS URL
 * - Updates local server-url.txt & server-url.json
 * - Synchronizes updated URL to GitHub origin main
 * - Auto-restarts on network drop or silent tunnel expiration
 */

const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const http = require('http');
const https = require('https');

const ROOT_DIR = __dirname;
const PORT = process.env.PORT || 3000;

function log(...args) {
  const time = new Date().toLocaleTimeString('vi-VN');
  console.log(`[TunnelManager ${time}]`, ...args);
}

function findCloudflared() {
  const candidates = [
    path.join(ROOT_DIR, 'cloudflared.exe'),
    'D:\\cloudflared-windows-amd64.exe',
    'D:\\cloudflared.exe',
    path.join(process.env.ProgramFiles || 'C:\\Program Files', 'cloudflared', 'cloudflared.exe'),
    path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'cloudflared', 'cloudflared.exe'),
  ];

  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }

  try {
    const whereOut = execSync('where cloudflared', { stdio: ['pipe', 'pipe', 'ignore'] }).toString().trim();
    if (whereOut) return 'cloudflared';
  } catch (_) {}

  return null;
}

function getLocalIps() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push(`http://${iface.address}:${PORT}`);
      }
    }
  }
  return ips;
}

function checkLocalServerReady() {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${PORT}/api/health`, { timeout: 2000 }, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

function checkUrlHealth(targetUrl) {
  return new Promise((resolve) => {
    try {
      const client = targetUrl.startsWith('https') ? https : http;
      const req = client.get(`${targetUrl}/api/health`, { timeout: 5000 }, (res) => {
        resolve(res.statusCode === 200);
      });
      req.on('error', () => resolve(false));
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
    } catch (_) {
      resolve(false);
    }
  });
}

let activeTunnelChild = null;
let currentPublicUrl = '';
let healthCheckTimer = null;
let failedHealthChecks = 0;
let isRestarting = false;

function updateDiscoveryFiles(url) {
  const localIps = getLocalIps();
  const payload = {
    url,
    localIps,
    updatedAt: Date.now(),
    dateStr: new Date().toISOString()
  };

  try {
    fs.writeFileSync(path.join(ROOT_DIR, 'server-url.txt'), url.trim(), 'utf8');
    fs.writeFileSync(path.join(ROOT_DIR, 'server-url.json'), JSON.stringify(payload, null, 2), 'utf8');

    const copyDists = ['dist', 'dist-parent', 'dist-kid'];
    for (const d of copyDists) {
      const dirPath = path.join(ROOT_DIR, d);
      if (fs.existsSync(dirPath)) {
        fs.writeFileSync(path.join(dirPath, 'server-url.txt'), url.trim(), 'utf8');
      }
    }
    log(`💾 Đã cập nhật file server-url.txt & server-url.json -> ${url}`);
  } catch (err) {
    log('⚠️ Lỗi ghi file cấu hình discovery:', err.message);
  }

  // Push to GitHub
  try {
    log('📡 Đang đồng bộ link máy chủ lên GitHub...');
    execSync('git add server-url.txt server-url.json', { cwd: ROOT_DIR, stdio: 'ignore' });
    const diff = execSync('git status --porcelain server-url.txt server-url.json', { cwd: ROOT_DIR }).toString().trim();
    if (diff) {
      execSync('git commit -m "chore: sync 4G server url [skip ci]"', { cwd: ROOT_DIR, stdio: 'ignore' });
      execSync('git push origin main', { cwd: ROOT_DIR, stdio: 'ignore' });
      log('✅ Đã đồng bộ thành công lên GitHub! Các thiết bị con & cha mẹ sẽ tự động cập nhật URL.');
    } else {
      log('ℹ️ GitHub đã chứa URL mới nhất.');
    }
  } catch (gitErr) {
    log('⚠️ Không thể push lên GitHub (vẫn dùng tunnel trực tiếp bình thường):', gitErr.message);
  }
}

async function startTunnel() {
  if (isRestarting) return;
  isRestarting = true;

  const cfPath = findCloudflared();
  if (!cfPath) {
    log('❌ Không tìm thấy cloudflared.exe!');
    isRestarting = false;
    return;
  }

  // Ensure local server is up
  let ready = await checkLocalServerReady();
  let serverWaitRetries = 0;
  while (!ready && serverWaitRetries < 20) {
    log('⏳ Đang đợi máy chủ nội bộ cổng ' + PORT + ' khởi động...');
    await new Promise((r) => setTimeout(r, 1500));
    ready = await checkLocalServerReady();
    serverWaitRetries++;
  }

  if (!ready) {
    log('⚠️ Cảnh báo: Máy chủ cổng ' + PORT + ' chưa sẵn sàng, nhưng vẫn tiến hành mở tunnel.');
  }

  // Kill old cloudflared processes if any
  try {
    execSync('taskkill /F /IM cloudflared.exe', { stdio: 'ignore' });
  } catch (_) {}

  log('🚀 Bắt đầu khởi chạy Cloudflare Tunnel...');
  failedHealthChecks = 0;

  activeTunnelChild = spawn(cfPath, ['tunnel', '--url', `http://localhost:${PORT}`], {
    cwd: ROOT_DIR,
    windowsHide: true,
  });

  isRestarting = false;
  let urlCaptured = false;

  const handleTunnelData = (chunk) => {
    const text = chunk.toString();
    const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
    if (match && !urlCaptured) {
      urlCaptured = true;
      currentPublicUrl = match[0];
      log(`🎉 KẾT NỐI 4G THÀNH CÔNG! URL Máy Chủ: ${currentPublicUrl}`);
      updateDiscoveryFiles(currentPublicUrl);
      startHealthWatchdog();
    }
  };

  activeTunnelChild.stdout.on('data', handleTunnelData);
  activeTunnelChild.stderr.on('data', handleTunnelData);

  activeTunnelChild.on('close', (code) => {
    log(`⚠️ Tiến trình Cloudflare đã dừng (code: ${code}). Chuẩn bị khởi động lại sau 4s...`);
    stopHealthWatchdog();
    activeTunnelChild = null;
    urlCaptured = false;
    setTimeout(() => {
      startTunnel();
    }, 4000);
  });

  activeTunnelChild.on('error', (err) => {
    log('❌ Lỗi tiến trình Cloudflare:', err.message);
  });
}

function startHealthWatchdog() {
  stopHealthWatchdog();
  healthCheckTimer = setInterval(async () => {
    if (!currentPublicUrl) return;
    const ok = await checkUrlHealth(currentPublicUrl);
    if (ok) {
      failedHealthChecks = 0;
    } else {
      failedHealthChecks++;
      log(`⚠️ Health check thất bại (${failedHealthChecks}/3) cho ${currentPublicUrl}`);
      if (failedHealthChecks >= 3) {
        log('🚨 Tunnel có dấu hiệu đứt kết nối hoặc hết hạn. Tiến hành tái khởi động...');
        stopHealthWatchdog();
        try {
          if (activeTunnelChild) activeTunnelChild.kill('SIGINT');
        } catch (_) {}
      }
    }
  }, 45000); // Check every 45s
}

function stopHealthWatchdog() {
  if (healthCheckTimer) {
    clearInterval(healthCheckTimer);
    healthCheckTimer = null;
  }
}

function shutdown() {
  log('🛑 Đang đóng Tunnel Manager...');
  stopHealthWatchdog();
  try {
    if (activeTunnelChild) activeTunnelChild.kill('SIGINT');
  } catch (_) {}
  try {
    execSync('taskkill /F /IM cloudflared.exe', { stdio: 'ignore' });
  } catch (_) {}
  setTimeout(() => process.exit(0), 500);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('exit', shutdown);

// Main entry
startTunnel();
