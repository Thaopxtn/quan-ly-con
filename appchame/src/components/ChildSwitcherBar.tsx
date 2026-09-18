import React, { useState } from 'react';
import { useAppState } from '@shared/store';
import { Plus, Check } from 'lucide-react';
import { PairChildDeviceModal } from './PairChildDeviceModal';

export const ChildSwitcherBar: React.FC = () => {
  const { state, switchChild } = useAppState();
  const { children, selectedChildId } = state;

  const [showPairModal, setShowPairModal] = useState(false);

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
        <button
          onClick={() => setShowPairModal(true)}
          className="flex items-center space-x-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 transition active:scale-95 cursor-pointer"
        >
          <Plus size={13} />
          <span>Thêm bé</span>
        </button>
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
          return (
            <button
              key={child.id}
              onClick={() => switchChild(child.id)}
              className={`flex items-center space-x-2.5 px-3 py-2 rounded-2xl border transition-all text-left shrink-0 active:scale-95 ${
                isSelected
                  ? 'bg-gradient-to-r from-blue-50 to-indigo-50/70 border-blue-300 ring-2 ring-blue-500/20 shadow-xs'
                  : 'bg-slate-50/80 hover:bg-slate-100/80 border-slate-200/70 text-slate-600'
              }`}
            >
              <div className="relative shrink-0">
                <img
                  src={child.avatar}
                  alt={child.name}
                  className={`w-9 h-9 rounded-xl object-cover ring-2 transition ${
                    isSelected ? 'ring-blue-500' : 'ring-white'
                  }`}
                />
                <span
                  className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                    child.status === 'online'
                      ? 'bg-emerald-500'
                      : child.status === 'studying'
                      ? 'bg-indigo-500'
                      : 'bg-amber-500'
                  }`}
                />
              </div>

              <div>
                <div className="flex items-center space-x-1">
                  <h4
                    className={`text-xs font-black truncate max-w-[90px] ${
                      isSelected ? 'text-blue-900' : 'text-slate-800'
                    }`}
                  >
                    {child.name}
                  </h4>
                  {isSelected && <Check size={13} className="text-blue-600 shrink-0" />}
                </div>
                <p className="text-[10px] text-slate-500 font-medium">
                  {child.age} tuổi • {child.grade}
                </p>
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
          onSuccess={() => setShowPairModal(false)}
        />
      )}
    </div>
  );
};
