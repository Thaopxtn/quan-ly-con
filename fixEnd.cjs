const fs = require('fs');
let content = fs.readFileSync('D:/luufilelaptrinh/quan ly con/appchame/src/modules/alerts/AlertsScreen.tsx', 'utf8');

const doubleClose = `      </>
      )} {/* End View Mode Conditional */}

      </>
      )} {/* End View Mode Conditional */}

      {/* Floating Action Button (FAB) for Quick Notification Creation */}`;
const singleClose = `      </>
      )} {/* End View Mode Conditional */}

      {/* Floating Action Button (FAB) for Quick Notification Creation */}`;

content = content.replace(doubleClose, singleClose);
fs.writeFileSync('D:/luufilelaptrinh/quan ly con/appchame/src/modules/alerts/AlertsScreen.tsx', content);
