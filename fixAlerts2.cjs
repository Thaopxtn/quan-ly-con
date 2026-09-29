const fs = require('fs');
let content = fs.readFileSync('D:/luufilelaptrinh/quan ly con/appchame/src/modules/alerts/AlertsScreen.tsx', 'utf8');

const injectTarget = `
      {/* View Mode Toggle */}
      <div className="px-4 py-2 pt-0 border-b border-slate-100">
        <div className="flex p-1 bg-slate-100 dark:bg-slate-800/50 rounded-2xl">
          <button
            onClick={() => setViewMode('system')}
            className={\`flex-1 py-1.5 text-[11px] font-bold rounded-xl transition-all \${viewMode === 'system' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}\`}
          >
            Cảnh báo hệ thống
          </button>
          <button
            onClick={() => setViewMode('device_apps')}
            className={\`flex-1 py-1.5 text-[11px] font-bold rounded-xl transition-all \${viewMode === 'device_apps' ? 'bg-white shadow-sm text-blue-700' : 'text-slate-500 hover:text-slate-700'}\`}
          >
            Thông báo máy con
          </button>
        </div>
      </div>

      {viewMode === 'device_apps' ? (
        <DeviceNotificationsView childId={selectedChildId || child?.id || ''} />
      ) : (
      <>
      {/* Notifications List */}`;

content = content.replace('{/* Notifications List */}', injectTarget);

content = content.replace('      {/* Floating Action Button (FAB) for Quick Notification Creation */}', '      </>\n      )} {/* End View Mode Conditional */}\n\n      {/* Floating Action Button (FAB) for Quick Notification Creation */}');

fs.writeFileSync('D:/luufilelaptrinh/quan ly con/appchame/src/modules/alerts/AlertsScreen.tsx', content);
console.log("Done");
