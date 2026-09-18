import React, { useState } from 'react';
import {
  ChevronLeft,
  Shield,
  CheckCircle2,
  XCircle,
  GraduationCap,
  Globe,
  SlidersHorizontal,
  Plus
} from 'lucide-react';
import { useAppState } from '@shared/store';

interface ContentFilterScreenProps {
  onBack: () => void;
}

export const ContentFilterScreen: React.FC<ContentFilterScreenProps> = ({ onBack }) => {
  const { state, toggleContentFilter, toggleStudyMode } = useAppState();
  const { contentFilters, studyModeOnly, safeSearch } = state;
  const [activeSubTab, setActiveSubTab] = useState<'web' | 'apps' | 'search'>('web');

  return (
    <div className="flex-1 flex flex-col bg-slate-50 select-none pb-6">
      {/* Header */}
      <div className="bg-white px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition"
          >
            <ChevronLeft size={20} />
          </button>
          <h2 className="text-base font-bold text-slate-800">Lọc nội dung nâng cao</h2>
        </div>
      </div>

      {/* Tabs Web / App / Search */}
      <div className="p-4 pb-2">
        <div className="bg-slate-200/70 p-1 rounded-2xl flex">
          <button
            onClick={() => setActiveSubTab('web')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition ${
              activeSubTab === 'web' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Web
          </button>
          <button
            onClick={() => setActiveSubTab('apps')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition ${
              activeSubTab === 'apps' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Ứng dụng
          </button>
          <button
            onClick={() => setActiveSubTab('search')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition ${
              activeSubTab === 'search' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tìm kiếm
          </button>
        </div>
      </div>

      {/* Blocked Categories List */}
      <div className="flex-1 px-4 space-y-3 overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-800">Danh sách nội dung bị chặn</h3>
          <span className="text-[11px] text-rose-600 font-semibold bg-rose-50 px-2 py-0.5 rounded-full">
            {contentFilters.filter((f) => f.isBlocked).length} Đang chặn
          </span>
        </div>

        <div className="bg-white rounded-2xl p-2 border border-slate-100 shadow-soft divide-y divide-slate-100">
          {contentFilters.map((filter) => (
            <div key={filter.id} className="p-2.5 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                  <XCircle size={18} strokeWidth={2.5} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">{filter.name}</h4>
                  <p className="text-[10px] text-slate-400">{filter.desc}</p>
                </div>
              </div>

              {/* iOS Toggle switch */}
              <button
                onClick={() => toggleContentFilter(filter.id)}
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 p-0.5 ${
                  filter.isBlocked ? 'bg-rose-500' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform duration-200 ${
                    filter.isBlocked ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>

        {/* Study Mode Whitelist Card */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50/70 rounded-2xl p-4 border border-blue-200/80 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md">
                <GraduationCap size={20} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Cho phép các trang web an toàn</h4>
                <p className="text-[11px] text-blue-700 font-medium">Bảo vệ tối đa giờ học tập</p>
              </div>
            </div>
          </div>

          <div className="bg-white/90 backdrop-blur rounded-xl p-3 flex items-center justify-between border border-blue-100">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Shield size={14} className="text-emerald-600" />
                Chế độ học tập
              </span>
              <p className="text-[10px] text-slate-500">Chỉ cho phép truy cập các trang web giáo dục</p>
            </div>

            <button
              onClick={() => toggleStudyMode()}
              className={`relative w-11 h-6 rounded-full transition-colors duration-200 p-0.5 ${
                studyModeOnly ? 'bg-emerald-500' : 'bg-slate-300'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform duration-200 ${
                  studyModeOnly ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
