const fs = require('fs');
let content = fs.readFileSync('D:/luufilelaptrinh/quan ly con/appconchau/src/KidApp.tsx', 'utf8');

const regex = /    const serverUrl = localStorage\.getItem\('parentpro_server_url'\) \|\| 'http:\/\/192\.168\.1\.4:3000';\s*const savedChildId = localStorage\.getItem\('kidcare_child_id'\) \|\| targetChildId;\s*const savedParentId = localStorage\.getItem\('kidcare_parent_id'\) \|\| activeParentId;\s*startNativeProtectionService\(serverUrl, savedChildId, savedParentId\)\.catch\(\(e\) => console\.warn\('Protection service startup error:', e\)\);/g;

content = content.replace(regex, '');

const oldUseEffect = `  // Start Android Native 24/7 Foreground Protection Service on boot/mount
  useEffect(() => {
    
  }, []);`;
  
const newUseEffect = `  // Start Android Native 24/7 Foreground Protection Service on boot/mount
  useEffect(() => {
    const serverUrl = localStorage.getItem('parentpro_server_url') || 'http://192.168.1.4:3000';
    const savedChildId = targetChildId || localStorage.getItem('kidcare_child_id') || '';
    const savedParentId = activeParentId || localStorage.getItem('kidcare_parent_id') || '';
    startNativeProtectionService(serverUrl, savedChildId, savedParentId).catch((e) => console.warn('Protection service startup error:', e));
  }, [activeParentId, targetChildId]);`;

content = content.replace(oldUseEffect, newUseEffect);

fs.writeFileSync('D:/luufilelaptrinh/quan ly con/appconchau/src/KidApp.tsx', content);
console.log("Done");
