/**
 * Unified Runner for "Quản Lý Con":
 * 1. Starts Local High-Performance Node Server (server.cjs)
 * 2. Starts Cloudflare 4G Internet Tunnel (cloudflared)
 * 3. Automatically extracts the public HTTPS 4G URL and displays clean access links
 * 4. Gracefully shuts down all child processes when closed
 */

const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

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

console.log('================================================================');
console.log('       🚀 KHỞI ĐỘNG HỢP NHẤT MÁY CHỦ VÀ ĐƯỜNG TRUYỀN 4G');
console.log('                 Hệ Thống Quản Lý Con Cái');
console.log('================================================================\n');

// 3. Start local server (server.cjs)
console.log('[1/2] ⏳ Đang khởi động máy chủ nội bộ (cổng ' + PORT + ')...');
const serverProcess = spawn('node', [path.join(ROOT_DIR, 'server.cjs')], {
  cwd: ROOT_DIR,
  stdio: ['ignore', 'pipe', 'pipe'],
  windowsHide: true,
});

serverProcess.stdout.on('data', (d) => {
  // Uncomment to debug server stdout:
  // process.stdout.write(d);
});
serverProcess.stderr.on('data', (d) => {
  console.error('[Server Lỗi]:', d.toString());
});

serverProcess.on('exit', (code) => {
  if (code !== null && code !== 0) {
    console.error(`[CẢNH BÁO] Máy chủ nội bộ đã dừng với mã thoát: ${code}`);
  }
});

// 4. Locate Cloudflare
const cfPath = findCloudflared();
if (!cfPath) {
  console.error('\n❌ KHÔNG TÌM THẤY CLOUDFLARED!');
  console.error('Vui lòng đảm bảo file "D:\\cloudflared-windows-amd64.exe" hoặc "cloudflared.exe" tồn tại.');
  console.log('\n[INFO] Máy chủ nội bộ vẫn đang chạy tại: http://localhost:' + PORT);
  getLocalIps().forEach(ip => console.log('   Wi-Fi: http://' + ip + ':' + PORT));
} else {
  console.log('[2/2] ⏳ Đang kích hoạt đường truyền Internet 4G (Cloudflare Tunnel)...');
  console.log('      (Đang kết nối qua: ' + cfPath + ')\n');

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

      console.log('\n================================================================');
      console.log('  🎉 TẤT CẢ ĐÃ SẴN SÀNG! MÁY CHỦ ĐANG HOẠT ĐỘNG HOÀN HẢO');
      console.log('================================================================');
      console.log('\n🌐 LINK TRUY CẬP TỪ MẠNG 4G BÊN NGOÀI (INTERNET):');
      console.log(`   👉 Cổng Quản Trị & Tải App: ${publicUrl}/portal`);
      console.log(`   👉 Ứng Dụng Cha Mẹ:         ${publicUrl}/parent.html`);
      console.log(`   👉 Ứng Dụng Con Cái:        ${publicUrl}/kid.html`);
      console.log(`   📥 Tải APK Bố Mẹ (Android): ${publicUrl}/download/parent`);
      console.log(`   📥 Tải APK Con  (Android): ${publicUrl}/download/kid`);

      if (localIps.length > 0) {
        console.log('\n📱 LINK NỘI BỘ WI-FI (KHI Ở NHÀ):');
        localIps.forEach(ip => {
          console.log(`   👉 http://${ip}:${PORT}/portal`);
        });
      }

      console.log('\n================================================================');
      console.log('💡 HƯỚNG DẪN DÙNG:');
      console.log('• Gửi link 4G trên vào điện thoại Cha Mẹ và Con Cái để sử dụng.');
      console.log('• Giữ nguyên cửa sổ này để máy chủ tiếp tục chạy.');
      console.log('• Nhấn [Ctrl + C] hoặc đóng cửa sổ khi muốn dừng máy chủ.');
      console.log('================================================================\n');
    }
  };

  tunnelProcess.stdout.on('data', handleTunnelOutput);
  tunnelProcess.stderr.on('data', handleTunnelOutput);

  tunnelProcess.on('exit', (code) => {
    console.log(`[Cloudflare Tunnel] Đã ngắt kết nối.`);
  });

  // Handle Clean Shutdown
  function cleanup() {
    console.log('\n\n[Đang tắt] Đang đóng máy chủ và ngắt kết nối 4G an toàn...');
    try { tunnelProcess.kill('SIGINT'); } catch (_) {}
    try { serverProcess.kill('SIGINT'); } catch (_) {}
    setTimeout(() => process.exit(0), 500);
  }

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  process.on('exit', cleanup);
}
