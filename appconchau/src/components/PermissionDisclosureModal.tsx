import React, { useState } from 'react';
import { ShieldCheck, MapPin, CheckCircle2, ChevronRight } from 'lucide-react';

interface PermissionDisclosureModalProps {
  onAccept: () => void;
}

export const PermissionDisclosureModal: React.FC<PermissionDisclosureModalProps> = ({ onAccept }) => {
  const [step, setStep] = useState<number>(1);

  const handleNext = () => {
    if (step === 1) {
      setStep(2);
    } else {
      // Đánh dấu đã đọc Disclosure để không hiện lại ở những lần mở app sau
      localStorage.setItem('kidcare_prominent_disclosure_accepted_v1', 'true');
      onAccept();
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4 select-none touch-none">
      <div className="bg-white rounded-[24px] w-full max-w-sm overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-300">
        
        <div className={`p-6 pb-4 flex flex-col items-center justify-center text-white ${step === 1 ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-gradient-to-br from-indigo-500 to-purple-600'}`}>
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-3 backdrop-blur-md shadow-inner">
            {step === 1 ? <MapPin size={32} className="text-white" /> : <ShieldCheck size={32} className="text-white" />}
          </div>
          <h2 className="text-lg font-black text-center leading-tight">
            {step === 1 ? 'Quyền Truy Cập Vị Trí Ngầm' : 'Quyền Dịch Vụ Trợ Năng'}
          </h2>
        </div>

        <div className="p-6 bg-slate-50 flex-1 overflow-y-auto">
          {step === 1 ? (
            <div className="space-y-4">
              <p className="text-[13px] text-slate-600 leading-relaxed text-justify">
                <b>KidCare</b> thu thập dữ liệu vị trí ngầm (Background Location) để cho phép cha mẹ:
              </p>
              <ul className="space-y-2 text-[12px] text-slate-700 font-medium">
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                  <span>Xem vị trí hiện tại của thiết bị trên bản đồ theo thời gian thực.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                  <span>Gửi và nhận cảnh báo hàng rào địa lý (Geofencing) ngay cả khi ứng dụng đã đóng hoặc không sử dụng.</span>
                </li>
              </ul>
              <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                <p className="text-[11px] text-emerald-800 font-semibold italic text-center">
                  Dữ liệu vị trí chỉ được đồng bộ với thiết bị của cha mẹ, hoàn toàn bảo mật và không chia sẻ cho bất kỳ bên thứ ba nào.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-[13px] text-slate-600 leading-relaxed text-justify">
                <b>KidCare</b> yêu cầu <b>Dịch vụ Trợ năng (Accessibility Service)</b> để hoạt động cốt lõi với mục đích bảo vệ trẻ em:
              </p>
              <ul className="space-y-2 text-[12px] text-slate-700 font-medium">
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-indigo-500 shrink-0 mt-0.5" />
                  <span>Tự động theo dõi tên các ứng dụng đang mở trên màn hình.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-indigo-500 shrink-0 mt-0.5" />
                  <span>Ngăn chặn tức thời truy cập vào các ứng dụng bị cha mẹ cấm.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-indigo-500 shrink-0 mt-0.5" />
                  <span>Thực thi tính năng khóa màn hình và hiện thử thách khi hết giờ.</span>
                </li>
              </ul>
              <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
                <p className="text-[11px] text-indigo-800 font-semibold italic text-center">
                  Chúng tôi cam kết KHÔNG dùng quyền này để đọc tin nhắn cá nhân, mật khẩu hay theo dõi bàn phím của trẻ.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-between gap-3">
          <div className="flex items-center justify-center gap-1.5 w-12">
            <div className={`w-2 h-2 rounded-full transition-all ${step === 1 ? 'bg-emerald-500 w-4' : 'bg-slate-200'}`} />
            <div className={`w-2 h-2 rounded-full transition-all ${step === 2 ? 'bg-indigo-500 w-4' : 'bg-slate-200'}`} />
          </div>
          <button
            onClick={handleNext}
            className={`flex-1 py-3 px-4 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-1 transition-all active:scale-95 shadow-md ${
              step === 1 ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20'
            }`}
          >
            {step === 1 ? (
              <><span>Tiếp tục</span><ChevronRight size={16} /></>
            ) : (
              <><span>Tôi Hiểu và Đồng Ý</span><ShieldCheck size={16} /></>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
