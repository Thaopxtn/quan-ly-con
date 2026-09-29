const fs = require('fs');
let content = fs.readFileSync('D:/luufilelaptrinh/quan ly con/appchame/src/modules/alerts/AlertsScreen.tsx', 'utf8');

content = content.replace("import { CreateNotificationModal } from '../../components/CreateNotificationModal';", "import { CreateNotificationModal } from '../../components/CreateNotificationModal';\nimport { DeviceNotificationsView } from './DeviceNotificationsView';");

content = content.replace('const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);', 'const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);\n  const [viewMode, setViewMode] = useState<"system" | "device_apps">("device_apps");');

const oldHeader = `          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-base font-black text-slate-900 dark:text-white">Trung Tâm Thông Báo</h2>
              {unreadCount > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500 text-white font-black animate-pulse">
                  {unreadCount} mới
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              Quản lý cảnh báo & gửi thông báo nhắc nhở đến con
            </p>
          </div>`;

const newHeader = `          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                {viewMode === 'system' ? 'Trung Tâm Thông Báo' : 'Nhật Ký Thông Báo Máy Con'}
              </h2>
              {viewMode === 'system' && unreadCount > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500 text-white font-black animate-pulse">
                  {unreadCount} mới
                </span>
              )}
              {viewMode === 'device_apps' && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-black flex items-center gap-1 border border-emerald-100">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                  Trực tuyến
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              {viewMode === 'system' 
                ? 'Quản lý cảnh báo & gửi thông báo nhắc nhở đến con' 
                : 'Thiết bị Bé yêu • Đồng bộ tin nhắn & thông báo ứng dụng'}
            </p>
          </div>`;

content = content.replace(oldHeader, newHeader);

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
      <>`;

content = content.replace('<div className="flex-1 overflow-y-auto px-4 pb-24 space-y-3">', injectTarget + '\n<div className="flex-1 overflow-y-auto px-4 pb-24 space-y-3 pt-2">');

content = content.replace('      {/* Floating Action Button (FAB) for Quick Notification Creation */}', '      </>\n      )} {/* End View Mode Conditional */}\n\n      {/* Floating Action Button (FAB) for Quick Notification Creation */}');

fs.writeFileSync('D:/luufilelaptrinh/quan ly con/appchame/src/modules/alerts/AlertsScreen.tsx', content);
console.log("Done");
