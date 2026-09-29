const fs = require('fs');
let content = fs.readFileSync('D:/luufilelaptrinh/quan ly con/appchame/src/modules/dashboard/DashboardScreen.tsx', 'utf8');

content = content.replace('const lockReasonType =', 'const childSpecificSettings = currentChild ? state.childSettings?.[currentChild.id] : null;\n  const isHwLocked = Boolean(childSpecificSettings?.hardwareControls?.isHardwareLocked);\n  const blockedAppsCount = childSpecificSettings?.apps?.filter(a => a.isBlocked).length || 0;\n\n  const lockReasonType =');

content = content.replace('🔒 ĐANG KHÓA MÁY THỰC TẾ', '🔒 ĐANG KHÓA TOÀN BỘ MÁY');
content = content.replace('Thiết bị của con hiện đang ở trạng thái khóa.', 'Thiết bị của con hiện đang ở trạng thái khóa chặn.');
content = content.replace('<span>Mở khóa ngay</span>', '<span>Mở khóa toàn bộ</span>');

const addition = `{/* ⚠️ CỐ ĐỊNH PHẦN CỨNG BANNER */}
      {!isTargetChildLocked && isHwLocked && (
        <div className="p-3 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
            <Lock size={14} />
          </div>
          <div>
            <h4 className="text-[11px] font-bold text-indigo-900">Âm lượng & Độ sáng đang cố định</h4>
            <p className="text-[10px] text-indigo-700">Con không thể tự điều chỉnh phần cứng.</p>
          </div>
        </div>
      )}

      {/* 🚫 CHẶN ỨNG DỤNG BANNER */}
      {!isTargetChildLocked && blockedAppsCount > 0 && (
        <div className="p-3 rounded-2xl bg-orange-50 border border-orange-100 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
            <Lock size={14} />
          </div>
          <div>
            <h4 className="text-[11px] font-bold text-orange-900">Có {blockedAppsCount} ứng dụng bị chặn</h4>
            <p className="text-[10px] text-orange-700">Con không thể mở các ứng dụng này.</p>
          </div>
        </div>
      )}

      {/* Unified Modern Family & Multi-Child Hub */}
      <UnifiedChildHub onNavigate={onNavigate} />`;

content = content.replace('{/* Unified Modern Family & Multi-Child Hub */}\r\n      <UnifiedChildHub onNavigate={onNavigate} />', addition);
content = content.replace('{/* Unified Modern Family & Multi-Child Hub */}\n      <UnifiedChildHub onNavigate={onNavigate} />', addition);

fs.writeFileSync('D:/luufilelaptrinh/quan ly con/appchame/src/modules/dashboard/DashboardScreen.tsx', content);
console.log('Done');
