import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

const target = process.argv[2] || 'all';

function copyParentApk() {
  const src = path.join(root, 'android-parent', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
  const dest = path.join(root, 'ParentPro-AppChaMe.apk');
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    const stat = fs.statSync(dest);
    console.log('✅ Xuat APK Cha Me thanh cong: ParentPro-AppChaMe.apk (' + (stat.size / 1024 / 1024).toFixed(2) + ' MB)');
  } else {
    console.error('❌ Khong tim thay file APK: ' + src);
  }
}

function copyKidApk() {
  const src = path.join(root, 'android-kid', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
  const dest = path.join(root, 'KidCare-AppConCai.apk');
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    const stat = fs.statSync(dest);
    console.log('✅ Xuat APK Con Cai thanh cong: KidCare-AppConCai.apk (' + (stat.size / 1024 / 1024).toFixed(2) + ' MB)');
  } else {
    console.error('❌ Khong tim thay file APK: ' + src);
  }
}

if (target === 'parent' || target === 'all') copyParentApk();
if (target === 'kid' || target === 'all') copyKidApk();
