import React, { useState } from 'react';
import { useAppState } from '@shared/store';
import { Plus, Check, Settings2 } from 'lucide-react';
import { PairChildDeviceModal } from './PairChildDeviceModal';
import { ManageChildrenModal } from './ManageChildrenModal';

export const ChildSwitcherBar: React.FC = () => {
  const { state, switchChild } = useAppState();
  const { children, selectedChildId } = state;

  const [showPairModal, setShowPairModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);

  return (
    <div className="bg-white/90 backdrop-blur-md rounded-2xl p-2 border border-slate-100 shadow-xs space-y-2">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center space-x-1.5">
          <span className="text-[11px] font-black text-slate-700 tracking-tight uppercase">
            Hồ sơ con đang quản lý:
          </span>
          <span className="px-1.5 py-0.2 bg-blue-100 text-blue-700 text-[10px] font-black rounded-md">
            {children.length} bé
          </span>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setShowManageModal(true)}
            className="flex items-center space-x-1 text-[11px] font-bold text-slate-600 hover:text-blue-600 px-2 py-0.5 rounded-lg hover:bg-slate-100 transition active:scale-95 cursor-pointer"
            title="Quản lý danh sách con và xóa bé"
          >
            <Settings2 size={12} />
            <span>Quản lý</span>
          </button>
          <button
            onClick={() => setShowPairModal(true)}
            className="flex items-center space-x-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 px-2 py-0.5 rounded-lg hover:bg-blue-50 transition active:scale-95 cursor-pointer"
          >
            <Plus size={12} />
            <span>Thêm bé</span>
          </button>
        </div>
      </div>

      {/* Horizontal Child Chips List */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 select-none">
        {children.length === 0 ? (
          <span className="text-xs text-slate-400 py-2 px-1 italic">
            Chưa có thiết bị con nào kết nối
          </span>
        ) : (
          children.map((child) => {
            const isSelected = child.id === selectedChildId;
            const isChildLocked = Boolean(
              child.isLocked ||
              state.childSettings?.[child.id]?.isLocked ||
              (child.id === selectedChildId && state.lockChallenge?.isLocked)
            );
            return (
              <button
                key={child.id}
                onClick={() => switchChild(child.id)}
                className={`flex items-center space-x-2.5 px-3 py-2 rounded-2xl border transition-all text-left shrink-0 active:scale-95 ${
                  isSelected
                    ? isChildLocked
                      ? 'bg-gradient-to-r from-rose-50 to-amber-50/70 border-rose-300 ring-2 ring-rose-500/20 shadow-xs'
                      : 'bg-gradient-to-r from-blue-50 to-indigo-50/70 border-blue-300 ring-2 ring-blue-500/20 shadow-xs'
                    : isChildLocked
                    ? 'bg-rose-50/40 hover:bg-rose-100/50 border-rose-200/60 text-slate-700'
                    : 'bg-slate-50/80 hover:bg-slate-100/80 border-slate-200/70 text-slate-600'
                }`}
              >
                <div className="relative shrink-0">
                  <img
                    src={child.avatar}
                    alt={child.name}
                    className={`w-9 h-9 rounded-xl object-cover ring-2 transition ${
                      isChildLocked
                        ? 'ring-rose-500'
                        : isSelected
                        ? 'ring-blue-500'
                        : 'ring-white'
                    }`}
                  />
                  {isChildLocked ? (
                    <span
                      className="absolute -top-1 -right-1 w-4 h-4 bg-rose-600 text-white rounded-full flex items-center justify-center text-[9px] shadow-xs animate-pulse ring-2 ring-white"
                      title="Điện thoại đang bị khóa"
                    >
                      🔒
                    </span>
                  ) : (
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                        child.status === 'online'
                          ? 'bg-emerald-500'
                          : child.status === 'studying'
                          ? 'bg-indigo-500'
                          : 'bg-amber-500'
                      }`}
                    />
                  )}
                </div>

                <div>
                  <div className="flex items-center space-x-1">
                    <h4
                      className={`text-xs font-black truncate max-w-[90px] ${
                        isSelected ? (isChildLocked ? 'text-rose-900' : 'text-blue-900') : 'text-slate-800'
                      }`}
                    >
                      {child.name}
                    </h4>
                    {isSelected && <Check size={13} className={isChildLocked ? 'text-rose-600 shrink-0' : 'text-blue-600 shrink-0'} />}
                  </div>
                  {isChildLocked ? (
                    <p className="text-[9.5px] font-bold text-rose-600 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping inline-block" />
                      Đang khóa máy
                    </p>
                  ) : (
                    <p className="text-[10px] text-slate-500 font-medium">
                      {child.age} tuổi • {child.grade}
                    </p>
                  )}
                </div>
              </button>
            );
          }))}

        {/* Quick Add Button */}
        <button
          onClick={() => setShowPairModal(true)}
          className="flex items-center justify-center space-x-1 px-3 py-2 rounded-2xl border-2 border-dashed border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 text-slate-500 hover:text-blue-600 text-xs font-bold transition shrink-0 h-[46px] cursor-pointer"
          title="Ghép đôi thêm thiết bị con cái (Mã 6 số)"
        >
          <Plus size={15} />
          <span className="text-[11px]">Thêm con</span>
        </button>
      </div>

      {/* Modal Pair Child Device (Using Kid's 6-digit Code) */}
      {showPairModal && (
        <PairChildDeviceModal
          onClose={() => setShowPairModal(false)}
          onSuccess={(cid) => {
            if (cid) switchChild(cid);
            setShowPairModal(false);
          }}
        />
      )}

      {/* Modal Manage Children (Edit, Unlink Devices, Delete Child) */}
      {showManageModal && (
        <ManageChildrenModal
          onClose={() => setShowManageModal(false)}
          onChildSwitched={(cid) => switchChild(cid)}
        />
      )}
    </div>
  );
};
