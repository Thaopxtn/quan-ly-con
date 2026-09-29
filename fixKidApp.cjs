const fs = require('fs');
let content = fs.readFileSync('D:/luufilelaptrinh/quan ly con/appconchau/src/KidApp.tsx', 'utf8');

const target = "startNativeProtectionService().catch((e) => console.warn('Protection service startup error:', e));";
const replacement = `
    const serverUrl = localStorage.getItem('parentpro_server_url') || 'http://192.168.1.4:3000';
    const savedChildId = localStorage.getItem('kidcare_child_id') || targetChildId;
    const savedParentId = localStorage.getItem('kidcare_parent_id') || activeParentId;
    startNativeProtectionService(serverUrl, savedChildId, savedParentId).catch((e) => console.warn('Protection service startup error:', e));
`;

content = content.replace(target, replacement);

fs.writeFileSync('D:/luufilelaptrinh/quan ly con/appconchau/src/KidApp.tsx', content);
console.log("Done");
