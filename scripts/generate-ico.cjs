const fs = require('fs');
const path = require('path');

const pngPath = path.join(__dirname, '..', 'public', 'icon-parentpro-512.png');
const icoPath = path.join(__dirname, '..', 'public', 'app-icon.ico');

if (!fs.existsSync(pngPath)) {
  console.error('PNG not found at:', pngPath);
  process.exit(1);
}

const pngBuffer = fs.readFileSync(pngPath);
const pngSize = pngBuffer.length;

// Header (6 bytes)
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // type 1 = ICO
header.writeUInt16LE(1, 4); // 1 image

// Directory entry (16 bytes)
const dir = Buffer.alloc(16);
dir.writeUInt8(0, 0); // 0 means >=256px
dir.writeUInt8(0, 1); // 0 means >=256px
dir.writeUInt8(0, 2); // color count
dir.writeUInt8(0, 3); // reserved
dir.writeUInt16LE(1, 4); // color planes
dir.writeUInt16LE(32, 6); // bits per pixel
dir.writeUInt32LE(pngSize, 8); // size of image data in bytes
dir.writeUInt32LE(22, 12); // offset (6 + 16 = 22)

const icoBuffer = Buffer.concat([header, dir, pngBuffer]);
fs.writeFileSync(icoPath, icoBuffer);
console.log('✅ Đã tạo thành công biểu tượng ứng dụng Windows: public/app-icon.ico (Dung lượng:', icoBuffer.length, 'bytes)');
