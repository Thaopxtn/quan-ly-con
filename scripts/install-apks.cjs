/**
 * Automated APK Installer via ADB
 * 
 * Automatically detects connected Android phones and installs the appropriate APK:
 * - Huawei INE-LX2 (Kid) -> KidCare-AppConCai.apk
 * - Samsung SM-S908N (Parent) -> ParentPro-AppChaMe.apk
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
function getAdbPath() {
  const candidates = [
    'C:\\Users\\thaoh\\AppData\\Local\\Android\\Sdk\\platform-tools\\adb.exe',
    process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Android', 'Sdk', 'platform-tools', 'adb.exe') : '',
    process.env.ANDROID_HOME ? path.join(process.env.ANDROID_HOME, 'platform-tools', 'adb.exe') : '',
    process.env.ANDROID_SDK_ROOT ? path.join(process.env.ANDROID_SDK_ROOT, 'platform-tools', 'adb.exe') : '',
  ];
  for (const c of candidates) {
    if (c && fs.existsSync(c)) {
      return `"${c}"`;
    }
  }
  return 'adb';
}

const adb = getAdbPath();

function getConnectedDevices() {
  try {
    const raw = execSync(`${adb} devices -l`, { encoding: 'utf8' });
    const lines = raw.split('\n').filter(l => l.trim().length > 0);
    const devices = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      const parts = line.split(/\s+/);
      if (parts.length >= 2 && parts[1] === 'device') {
        const serial = parts[0];
        let model = '';
        const modelMatch = line.match(/model:(\S+)/);
        if (modelMatch) model = modelMatch[1];
        devices.push({ serial, model, raw: line });
      }
    }
    return devices;
  } catch (e) {
    console.error('Không thể chạy lệnh adb:', e.message);
    return [];
  }
}

function installApkToDevice(serial, apkName, appLabel) {
  const apkPath = path.join(ROOT_DIR, apkName);
  if (!fs.existsSync(apkPath)) {
    console.error(`❌ Không tìm thấy file APK: ${apkName}. Vui lòng chạy "npm run build:apk:all" trước!`);
    return false;
  }

  console.log(`📱 Đang cài đặt [${appLabel}] (${apkName}) vào thiết bị [${serial}]...`);
  try {
    const output = execSync(`${adb} -s ${serial} install -r -d "${apkPath}"`, { encoding: 'utf8', timeout: 120000 });
    if (output.includes('Success')) {
      console.log(`  ✅ CÀI ĐẶT THÀNH CÔNG [${appLabel}] trên [${serial}]! 🎉`);
      return true;
    } else {
      console.warn(`  ⚠️ Kết quả từ ADB: ${output.trim()}`);
      return false;
    }
  } catch (e) {
    console.error(`  ❌ Lỗi khi cài đặt vào [${serial}]:`, e.message);
    return false;
  }
}

function main() {
  const target = process.argv[2] || 'all';
  const devices = getConnectedDevices();

  if (devices.length === 0) {
    console.log('⚠️ Không tìm thấy thiết bị Android nào được kết nối qua USB.');
    console.log('Vui lòng kiểm tra:');
    console.log('1. Đã cắm cáp USB nối điện thoại vào máy tính.');
    console.log('2. Đã bật "Gỡ lỗi USB" (USB Debugging) trên điện thoại.');
    return;
  }

  console.log(`🔍 Tìm thấy ${devices.length} thiết bị đang kết nối USB:`);
  devices.forEach((d, idx) => {
    console.log(`   ${idx + 1}. Serial: ${d.serial} | Model: ${d.model || 'Unknown'}`);
  });
  console.log('');

  // Identify Kid phone (INE-LX2 or JUC7N18704011839)
  const kidDevice = devices.find(d => d.model.includes('INE-LX2') || d.serial.includes('JUC7N18704011839'));
  // Identify Parent phone (SM-S908N or R3CT3102XWY)
  const parentDevice = devices.find(d => d.model.includes('SM-S908') || d.serial.includes('R3CT3102XWY'));

  let installedCount = 0;

  if (target === 'kid' || target === 'all') {
    const targetSerial = kidDevice ? kidDevice.serial : devices[0].serial;
    const ok = installApkToDevice(targetSerial, 'KidCare-AppConCai.apk', 'App Con Cái (KidCare)');
    if (ok) installedCount++;
  }

  if (target === 'parent' || target === 'all') {
    const targetSerial = parentDevice ? parentDevice.serial : (devices[1] ? devices[1].serial : devices[0].serial);
    const ok = installApkToDevice(targetSerial, 'ParentPro-AppChaMe.apk', 'App Cha Mẹ (ParentPro)');
    if (ok) installedCount++;
  }

  console.log(`\n🏁 Hoàn tất: Đã cài đặt thành công ${installedCount} ứng dụng!`);
}

main();
