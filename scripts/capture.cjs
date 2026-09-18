const { execSync } = require('child_process');
const fs = require('fs');
const outFile = process.argv[2] || 'screen_now.png';
const buf = execSync('"D:\\Sdk\\platform-tools\\adb.exe" -s emulator-5554 exec-out screencap -p', {
  encoding: 'buffer',
  maxBuffer: 20 * 1024 * 1024
});
fs.writeFileSync(outFile, buf);
console.log('Saved ' + outFile + ' (' + buf.length + ' bytes)');
