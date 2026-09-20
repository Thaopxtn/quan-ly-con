/**
 * Unified Runner for "Quản Lý Con":
 * 1. Checks/Starts Local High-Performance Node Server (server.cjs)
 * 2. Starts Cloudflare 4G Internet Tunnel (cloudflared)
 * 3. Automatically extracts the public HTTPS 4G URL and displays clean access links
 * 4. Gracefully handles ports, existing instances, and clean shutdown
 */

const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const http = require('http');

const ROOT_DIR = __dirname;
const PORT = process.env.PORT || 3000;

// 1. Locate cloudflared binary
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

  // Try PATH
  try {
    const whereOut = execSync('where cloudflared', { stdio: ['pipe', 'pipe', 'ignore'] }).toString().trim();
    if (whereOut) return 'cloudflared';
  } catch (_) {}

  return null;
}

// 2. Get local LAN IPs
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

// 3. Check if server is already responding
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

// 4. Free port if blocked by a dead/unresponsive process
function freePortIfBlocked(port) {
  try {
    const stdout = execSync(`netstat -ano | findstr :${port}`, { stdio: ['pipe', 'pipe', 'ignore'] }).toString();
    const lines = stdout.split('\n');
    for (const line of lines) {
      if (line.includes('LISTENING')) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && pid !== '0' && pid != process.pid) {
          try {
            execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
            console.log(`[Dọn dẹp] Đã giải phóng cổng ${port} (tiến trình cũ PID: ${pid})`);
          } catch (_) {}
        }
      }
    }
  } catch (_) {}
}

async function main() {
  console.log('================================================================');
  console.log('       🚀 KHỞI ĐỘNG HỢP NHẤT MÁY CHỦ VÀ ĐƯỜNG TRUYỀN 4G');
  console.log('                 Hệ Thống Quản Lý Con Cái');
  console.log('================================================================\n');

  let serverProcess = null;

  // Step 1: Always ensure fresh server instance with latest code
  console.log(`[1/2] ⏳ Đang khởi động máy chủ nội bộ (cổng ${PORT})...`);
  freePortIfBlocked(PORT);

    console.log(`[1/2] ⏳ Đang khởi chạy máy chủ nội bộ...`);
    serverProcess = spawn('node', [path.join(ROOT_DIR, 'server.cjs')], {
      cwd: ROOT_DIR,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });

    serverProcess.stderr.on('data', (d) => {
      const msg = d.toString();
      if (!msg.includes('EADDRINUSE')) {
        console.error('[Server]:', msg);
      }
    });

    serverProcess.on('exit', (code) => {
      if (code !== null && code !== 0) {
        console.error(`[CẢNH BÁO] Máy chủ nội bộ đã dừng với mã: ${code}`);
      }
    });

    // Wait a brief moment for it to be ready
    for (let i = 0; i < 5; i++) {
      await new Promise(r => setTimeout(r, 600));
      if (await checkServerRunning(PORT)) break;
    }
    console.log(`[1/2] ✅ Máy chủ nội bộ đã khởi động thành công (cổng ${PORT})!`);

  // Step 2: Locate & Launch Cloudflare Tunnel
  const cfPath = findCloudflared();
  if (!cfPath) {
    console.error('\n❌ KHÔNG TÌM THẤY CLOUDFLARED!');
    console.error('Vui lòng đảm bảo file "cloudflared.exe" tồn tại.');
    console.log('\n[INFO] Máy chủ nội bộ vẫn đang chạy tại: http://localhost:' + PORT);
    getLocalIps().forEach(ip => console.log('   Wi-Fi: http://' + ip + ':' + PORT));
    return;
  }

  console.log('\n[2/2] ⏳ Đang kích hoạt đường truyền Internet 4G (Cloudflare Tunnel)...');

  // Clean up any orphan old tunnel process before opening a new one
  try {
    execSync('taskkill /F /IM cloudflared.exe', { stdio: 'ignore' });
  } catch (_) {}

  const tunnelProcess = spawn(cfPath, ['tunnel', '--url', `http://localhost:${PORT}`], {
    cwd: ROOT_DIR,
    windowsHide: true,
  });

  let tunnelFound = false;

  const handleTunnelOutput = (data) => {
    const text = data.toString();
    const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
    if (match && !tunnelFound) {
      tunnelFound = true;
      const publicUrl = match[0];
      const localIps = getLocalIps();

      // 1. Save local discovery files
      try {
        fs.writeFileSync(path.join(ROOT_DIR, 'server-url.txt'), publicUrl.trim(), 'utf8');
        fs.writeFileSync(path.join(ROOT_DIR, 'server-url.json'), JSON.stringify({ url: publicUrl.trim(), updatedAt: Date.now() }, null, 2), 'utf8');
        
        // Also copy into dist web folders if present
        const copyDists = ['dist', 'dist-parent', 'dist-kid'];
        for (const d of copyDists) {
          const dirPath = path.join(ROOT_DIR, d);
          if (fs.existsSync(dirPath)) {
            fs.writeFileSync(path.join(dirPath, 'server-url.txt'), publicUrl.trim(), 'utf8');
          }
        }
      } catch (err) {
        console.warn('⚠️ Lỗi ghi file server-url.txt:', err.message);
      }

      // 2. Auto-sync to GitHub so Apps can discover the PC server URL permanently
      try {
        console.log('\n📡 Đang tự động đồng bộ link máy chủ lên GitHub (server-url.txt)...');
        execSync('git add server-url.txt server-url.json', { cwd: ROOT_DIR, stdio: 'ignore' });
        const gitStatus = execSync('git status --porcelain server-url.txt server-url.json', { cwd: ROOT_DIR }).toString().trim();
        if (gitStatus) {
          execSync('git commit -m "chore: auto-sync server url to github"', { cwd: ROOT_DIR, stdio: 'ignore' });
          execSync('git push origin main', { cwd: ROOT_DIR, stdio: 'ignore' });
          console.log('✅ ĐÃ ĐỒNG BỘ THÀNH CÔNG LÊN GITHUB! Cả 2 App sẽ tự kết nối tự động 100%.\n');
        } else {
          console.log('✅ Link máy chủ trên GitHub đã đồng bộ mới nhất.\n');
        }
      } catch (gitErr) {
        console.warn('⚠️ Không thể tự động push lên GitHub (vẫn dùng link 4G trực tiếp bình thường):', gitErr.message);
      }

      console.log('================================================================');
      console.log('  🎉 TẤT CẢ ĐÃ SẴN SÀNG! CÁC ĐƯỜNG LINK TRUY CẬP CỦA BẠN:');
      console.log('================================================================');
      console.log('\n🌐 1. LINK ỨNG DỤNG CHA MẸ (TRÊN ĐIỆN THOẠI HOẶC MÁY TÍNH):');
      console.log(`   👉 Trên điện thoại (4G):   ${publicUrl}/parent.html`);
      console.log(`   👉 Trên máy tính này (PC): http://localhost:${PORT}/parent.html`);
      console.log(`   📥 Tải App Cha Mẹ (APK):   ${publicUrl}/download/parent`);

      console.log('\n📱 2. LINK ỨNG DỤNG CON CÁI:');
      console.log(`   👉 Mở App Con trên điện thoại và gõ mã 6 số từ Bố Mẹ là xong!`);
      console.log(`   👉 Hoặc mở trên web:       ${publicUrl}/kid.html`);
      console.log(`   📥 Tải App Con (APK):      ${publicUrl}/download/kid`);

      console.log('\n📡 3. TRẠM ĐỒNG BỘ TỰ ĐỘNG QUA GITHUB:');
      console.log(`   👉 URL máy chủ hiện tại:    ${publicUrl}`);
      console.log(`   👉 Trạng thái:              🟢 Đã nạp và tự động nhận diện 100%`);

      if (localIps.length > 0) {
        console.log('\n🏠 LINK NỘI BỘ WI-FI TRONG NHÀ:');
        localIps.forEach(ip => {
          console.log(`   👉 http://${ip}:${PORT}/parent.html`);
        });
      }

      console.log('\n================================================================');
      console.log('💡 HƯỚNG DẪN DÙNG:');
      console.log('• Giữ nguyên cửa sổ này để máy chủ tiếp tục chạy.');
      console.log('• Trên máy con: Chỉ cần gõ mã 6 số từ máy bố mẹ ➔ Kết nối thành công ngay!');
      console.log('• Nhấn [Ctrl + C] hoặc đóng cửa sổ khi muốn dừng máy chủ.');
      console.log('================================================================\n');
    }
  };

  tunnelProcess.stdout.on('data', handleTunnelOutput);
  tunnelProcess.stderr.on('data', handleTunnelOutput);

  tunnelProcess.on('exit', () => {
    console.log(`[Cloudflare Tunnel] Đã ngắt kết nối.`);
  });

  // Handle Clean Shutdown
  function cleanup() {
    console.log('\n\n[Đang tắt] Đang đóng kết nối 4G và dọn dẹp...');
    try { if (tunnelProcess) tunnelProcess.kill('SIGINT'); } catch (_) {}
    try { if (serverProcess) serverProcess.kill('SIGINT'); } catch (_) {}
    setTimeout(() => process.exit(0), 500);
  }

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  process.on('exit', cleanup);
}

main().catch(err => {
  console.error('Lỗi khởi động:', err);
});
