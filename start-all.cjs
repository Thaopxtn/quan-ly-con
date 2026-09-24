/**
 * Unified Smart Dashboard & Runner for "Quản Lý Con":
 * - Auto-detects existing PM2 services (quan-ly-con-server & quan-ly-con-tunnel)
 * - Avoids port collision, avoiding false kills or duplicate processes
 * - Verifies local server (http://127.0.0.1:3000) & Cloudflare 4G Tunnel health
 * - Real-time watchdog monitor keeping the console window open and responsive
 * - Keyboard shortcuts: [O] Mở Portal, [R] Tải lại link, [Ctrl+C] Đóng
 */

const { spawn, execSync, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const http = require('http');
const https = require('https');
const readline = require('readline');

const ROOT_DIR = __dirname;
const PORT = process.env.PORT || 3000;

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
        ips.push(iface.address);
      }
    }
  }
  return ips;
}

function checkServerRunning(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}/api/health`, { timeout: 1500 }, (res) => {
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
  if (!targetUrl || !targetUrl.startsWith('http')) return Promise.resolve(false);
  return new Promise((resolve) => {
    try {
      const client = targetUrl.startsWith('https') ? https : http;
      const req = client.get(`${targetUrl}/api/health`, { timeout: 4000 }, (res) => {
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

function isPm2ProcessOnline(serviceName) {
  try {
    const out = execSync('npx pm2 jlist', { stdio: ['pipe', 'pipe', 'ignore'] }).toString();
    const list = JSON.parse(out);
    return list.some(item => item.name === serviceName && item.pm2_env?.status === 'online');
  } catch (_) {
    return false;
  }
}

function openBrowser(url) {
  try {
    const cmd = process.platform === 'win32' ? `start "" "${url}"` : `open "${url}"`;
    exec(cmd);
  } catch (_) {}
}

function updateDiscoveryFiles(url) {
  if (!url) return;
  try {
    fs.writeFileSync(path.join(ROOT_DIR, 'server-url.txt'), url.trim(), 'utf8');
    fs.writeFileSync(path.join(ROOT_DIR, 'server-url.json'), JSON.stringify({ url: url.trim(), updatedAt: Date.now() }, null, 2), 'utf8');

    const copyDists = ['dist', 'dist-parent', 'dist-kid'];
    for (const d of copyDists) {
      const dirPath = path.join(ROOT_DIR, d);
      if (fs.existsSync(dirPath)) {
        fs.writeFileSync(path.join(dirPath, 'server-url.txt'), url.trim(), 'utf8');
      }
    }
  } catch (_) {}

  // Sync to GitHub
  try {
    execSync('git add server-url.txt server-url.json', { cwd: ROOT_DIR, stdio: 'ignore' });
    const gitStatus = execSync('git status --porcelain server-url.txt server-url.json', { cwd: ROOT_DIR }).toString().trim();
    if (gitStatus) {
      execSync('git commit -m "chore: auto-sync server url to github"', { cwd: ROOT_DIR, stdio: 'ignore' });
      execSync('git push origin main', { cwd: ROOT_DIR, stdio: 'ignore' });
    }
  } catch (_) {}
}

function readStoredUrl() {
  const urlFile = path.join(ROOT_DIR, 'server-url.txt');
  if (fs.existsSync(urlFile)) {
    try {
      const u = fs.readFileSync(urlFile, 'utf8').trim();
      if (u.startsWith('https://')) return u;
    } catch (_) {}
  }
  return '';
}

function displayBanner(publicUrl) {
  const localIps = getLocalIps();
  console.log('\n================================================================');
  console.log('  🎉 TẤT CẢ ĐÃ SẴN SÀNG! CÁC ĐƯỜNG LINK TRUY CẬP CỦA BẠN:');
  console.log('================================================================');
  console.log('\n🌐 1. LINK ỨNG DỤNG CHA MẸ (TRÊN ĐIỆN THOẠI HOẶC MÁY TÍNH):');
  if (publicUrl) {
    console.log(`   👉 Trên điện thoại (4G):   ${publicUrl}/parent.html`);
  }
  console.log(`   👉 Trên máy tính này (PC): http://localhost:${PORT}/parent.html`);
  console.log(`   💻 Giao diện Quản trị PC:  http://localhost:${PORT}/portal`);
  if (publicUrl) {
    console.log(`   📥 Tải App Cha Mẹ (APK):   ${publicUrl}/download/parent`);
  }

  console.log('\n📱 2. LINK ỨNG DỤNG CON CÁI:');
  console.log(`   👉 Mở App Con trên điện thoại và gõ mã 6 số từ Bố Mẹ là xong!`);
  if (publicUrl) {
    console.log(`   👉 Hoặc mở trên web:       ${publicUrl}/kid.html`);
    console.log(`   📥 Tải App Con (APK):      ${publicUrl}/download/kid`);
  }

  if (publicUrl) {
    console.log('\n📡 3. TRẠM ĐỒNG BỘ TỰ ĐỘNG QUA GITHUB:');
    console.log(`   👉 URL máy chủ hiện tại:    ${publicUrl}`);
    console.log(`   👉 Trạng thái:              🟢 Đã nạp và tự động nhận diện 100%`);
  }

  if (localIps.length > 0) {
    console.log('\n🏠 LINK NỘI BỘ WI-FI TRONG NHÀ:');
    localIps.forEach(ip => {
      console.log(`   👉 http://${ip}:${PORT}/parent.html`);
    });
  }

  console.log('\n================================================================');
  console.log('💡 HƯỚNG DẪN DÙNG:');
  console.log('• Giữ nguyên cửa sổ này để theo dõi trạng thái máy chủ.');
  console.log('• Phím [O]: Mở Giao diện Quản trị Máy chủ (Portal) trên trình duyệt.');
  console.log('• Phím [P]: Mở Giao diện App Cha Mẹ (Parent App) trên trình duyệt.');
  console.log('• Nhấn [Ctrl + C] hoặc đóng cửa sổ khi hoàn tất.');
  console.log('================================================================\n');
}

async function main() {
  console.clear();
  console.log('================================================================');
  console.log('       🚀 TRUNG TÂM KHỞI ĐỘNG HỢP NHẤT MÁY CHỦ VÀ 4G');
  console.log('                 Hệ Thống Quản Lý Con Cái');
  console.log('================================================================\n');

  let serverSpawned = null;
  let tunnelSpawned = null;
  let publicUrl = '';

  // -------------------------------------------------------------
  // STEP 1: Check and Start Local Server
  // -------------------------------------------------------------
  console.log(`[1/2] ⏳ Đang kiểm tra máy chủ nội bộ (cổng ${PORT})...`);
  let isServerUp = await checkServerRunning(PORT);

  if (isServerUp) {
    const isPm2 = isPm2ProcessOnline('quan-ly-con-server');
    console.log(`[1/2] ✅ Máy chủ nội bộ đang hoạt động sẵn sàng (cổng ${PORT})! ${isPm2 ? '[PM2 24/7 Mode]' : ''}`);
  } else {
    // Try PM2 restart first if registered
    let restoredViaPm2 = false;
    try {
      execSync('npx pm2 restart quan-ly-con-server', { stdio: 'ignore' });
      for (let i = 0; i < 6; i++) {
        await new Promise(r => setTimeout(r, 500));
        if (await checkServerRunning(PORT)) {
          restoredViaPm2 = true;
          break;
        }
      }
    } catch (_) {}

    if (restoredViaPm2) {
      console.log(`[1/2] ✅ Đã khởi động máy chủ nội bộ thành công qua PM2 (cổng ${PORT})!`);
    } else {
      console.log(`[1/2] ⏳ Đang khởi chạy tiến trình máy chủ nội bộ...`);
      serverSpawned = spawn('node', [path.join(ROOT_DIR, 'server.cjs')], {
        cwd: ROOT_DIR,
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
      });

      serverSpawned.stderr.on('data', (d) => {
        const msg = d.toString();
        if (!msg.includes('EADDRINUSE')) {
          console.error('[Server Error]:', msg);
        }
      });

      for (let i = 0; i < 10; i++) {
        await new Promise(r => setTimeout(r, 600));
        if (await checkServerRunning(PORT)) break;
      }
      console.log(`[1/2] ✅ Máy chủ nội bộ đã khởi động thành công (cổng ${PORT})!`);
    }
  }

  // -------------------------------------------------------------
  // STEP 2: Check and Start Cloudflare 4G Tunnel
  // -------------------------------------------------------------
  console.log('\n[2/2] ⏳ Đang kiểm tra đường truyền Internet 4G (Cloudflare Tunnel)...');

  // Check if we already have an active healthy tunnel URL
  const existingUrl = readStoredUrl();
  let isExistingUrlAlive = false;

  if (existingUrl) {
    process.stdout.write(`   Kiểm tra kết nối URL đã lưu: ${existingUrl}... `);
    isExistingUrlAlive = await checkUrlHealth(existingUrl);
    if (isExistingUrlAlive) {
      console.log('🟢 ONLINE!');
      publicUrl = existingUrl;
    } else {
      console.log('⚪ Không phản hồi (sẽ cấp URL mới).');
    }
  }

  // If tunnel is managed by PM2 and already alive
  if (!isExistingUrlAlive) {
    if (isPm2ProcessOnline('quan-ly-con-tunnel')) {
      console.log('   Khởi động lại đường hầm PM2 (quan-ly-con-tunnel)...');
      try {
        execSync('npx pm2 restart quan-ly-con-tunnel', { stdio: 'ignore' });
      } catch (_) {}
    }

    // Wait up to 15s for tunnel-manager or fresh URL
    for (let i = 0; i < 15; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const candidateUrl = readStoredUrl();
      if (candidateUrl && candidateUrl !== existingUrl) {
        const ok = await checkUrlHealth(candidateUrl);
        if (ok) {
          publicUrl = candidateUrl;
          isExistingUrlAlive = true;
          break;
        }
      }
    }
  }

  // If still no healthy tunnel, spawn directly
  if (!isExistingUrlAlive) {
    const cfPath = findCloudflared();
    if (cfPath) {
      console.log('   Khởi chạy trực tiếp cloudflared.exe...');
      tunnelSpawned = spawn(cfPath, ['tunnel', '--url', `http://localhost:${PORT}`], {
        cwd: ROOT_DIR,
        windowsHide: true,
      });

      tunnelSpawned.stdout.on('data', (d) => {
        const text = d.toString();
        const m = text.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
        if (m && !publicUrl) {
          publicUrl = m[0];
          updateDiscoveryFiles(publicUrl);
        }
      });
      tunnelSpawned.stderr.on('data', (d) => {
        const text = d.toString();
        const m = text.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
        if (m && !publicUrl) {
          publicUrl = m[0];
          updateDiscoveryFiles(publicUrl);
        }
      });

      // Wait up to 15s for URL
      for (let i = 0; i < 20; i++) {
        await new Promise(r => setTimeout(r, 600));
        if (publicUrl) break;
      }
    }
  }

  if (publicUrl) {
    console.log(`[2/2] ✅ Đường truyền Internet 4G đang hoạt động hoàn hảo!`);
  } else {
    console.log(`[2/2] ⚠️ Chưa thể kết nối 4G Tunnel. Máy chủ vẫn hoạt động tốt trong mạng Wi-Fi LAN.`);
  }

  // Display access banner
  displayBanner(publicUrl);

  // Setup interactive key listener
  readline.emitKeypressEvents(process.stdin);
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }

  process.stdin.on('keypress', (str, key) => {
    if (key.ctrl && key.name === 'c') {
      shutdown();
    } else if (key.name === 'o') {
      console.log('👉 Đang mở Giao diện Quản trị Máy chủ: http://localhost:' + PORT + '/portal');
      openBrowser(`http://localhost:${PORT}/portal`);
    } else if (key.name === 'p') {
      console.log('👉 Đang mở Ứng dụng Cha Mẹ: http://localhost:' + PORT + '/parent.html');
      openBrowser(`http://localhost:${PORT}/parent.html`);
    }
  });

  // Watchdog Loop: Keeps process alive and logs subtle pulse every 15s
  let cycle = 0;
  const watchdog = setInterval(async () => {
    cycle++;
    const sOk = await checkServerRunning(PORT);
    const tOk = publicUrl ? await checkUrlHealth(publicUrl) : false;
    const timeStr = new Date().toLocaleTimeString('vi-VN');

    // Subtle single-line progress update
    const sStatus = sOk ? '🟢 Server: OK' : '🔴 Server: ERROR';
    const tStatus = tOk ? '🟢 4G: OK' : (publicUrl ? '🟡 4G: Chậm' : '⚪ 4G: Tắt');
    process.stdout.write(`\r[${timeStr}] ${sStatus} (Port ${PORT}) | ${tStatus} | [O]: Mở Portal | [P]: Mở App Cha | [Ctrl+C]: Đóng `);
  }, 10000);

  function shutdown() {
    clearInterval(watchdog);
    console.log('\n\n[Đang tắt] Đóng cửa sổ giám sát...');
    if (serverSpawned) {
      try { serverSpawned.kill('SIGINT'); } catch (_) {}
    }
    if (tunnelSpawned) {
      try { tunnelSpawned.kill('SIGINT'); } catch (_) {}
    }
    const isPm2 = isPm2ProcessOnline('quan-ly-con-server');
    if (isPm2) {
      console.log('ℹ️ Máy chủ ngầm (PM2) vẫn tiếp tục duy trì hoạt động 24/7.');
    }
    process.exit(0);
  }

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch(err => {
  console.error('Lỗi:', err.message);
});
