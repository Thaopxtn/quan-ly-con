import React, { useState } from 'react';
import {
  ChevronLeft,
  Crown,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  X,
  CreditCard,
  QrCode,
  Smartphone,
  Zap,
  Check,
  HelpCircle
} from 'lucide-react';
import { useAppState } from '@shared/store';

interface PremiumScreenProps {
  onBack: () => void;
}

export const PremiumScreen: React.FC<PremiumScreenProps> = ({ onBack }) => {
  const { state, activatePremiumSubscription } = useAppState();
  const { isPremium, premiumPlan, premiumExpiresAt } = state;

  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showComparisonModal, setShowComparisonModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');
  const [paymentMethod, setPaymentMethod] = useState<'momo' | 'vnpay' | 'vietqr' | 'card'>('momo');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isActivated, setIsActivated] = useState(false);

  const features = [
    'Báo cáo chi tiết & phân tích chuyên sâu AI',
    'Giới hạn thời gian nâng cao từng khung giờ',
    'Lọc nội dung nâng cao & chặn trang web độc hại',
    'Hỗ trợ khẩn cấp 24/7 từ chuyên gia tâm lý',
    'Lưu lịch sử hành trình di chuyển 12 tháng',
    'Không giới hạn số lượng thiết bị và vùng an toàn',
  ];

  const comparisonRows = [
    { name: 'Định vị GPS trực tiếp', free: 'Cơ bản (60s)', pro: 'Thời gian thực (10s)' },
    { name: 'Lưu lịch sử hành trình', free: '7 ngày gần nhất', pro: '12 tháng không giới hạn' },
    { name: 'Số lượng vùng an toàn', free: 'Tối đa 3 vùng', pro: 'Không giới hạn vùng' },
    { name: 'Giám sát màn hình & Camera', free: 'Tiêu chuẩn', pro: 'HD 1080p + AI tư thế' },
    { name: 'Thử thách mở máy (Toán/Quiz)', free: 'Giới hạn', pro: 'Mở rộng kho câu hỏi' },
    { name: 'Hỗ trợ kỹ thuật', free: 'Email', pro: 'Hotline ưu tiên 24/7' },
  ];

  const handleCheckout = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setIsActivated(true);
      if (activatePremiumSubscription) {
        activatePremiumSubscription(selectedPlan);
      }
    }, 1800);
  };

  return (
    <div className="flex-1 flex flex-col justify-between p-6 bg-gradient-to-b from-amber-50/70 via-white to-blue-50 select-none overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="w-8 h-8 rounded-full bg-white shadow-xs border border-slate-200 flex items-center justify-center text-slate-700 transition hover:bg-slate-50 cursor-pointer"
        >
          <ChevronLeft size={20} />
        </button>
        <span className="text-xs font-bold text-slate-700">Gói dịch vụ cao cấp</span>
        <div className="w-8"></div>
      </div>

      {/* Hero Crown & Title */}
      <div className="text-center my-auto py-4 space-y-2.5">
        <div className="relative w-20 h-20 mx-auto bg-gradient-to-tr from-amber-400 to-yellow-300 rounded-3xl p-4 shadow-xl flex items-center justify-center text-amber-900 ring-4 ring-amber-100 animate-in zoom-in duration-300">
          <Crown size={42} strokeWidth={2.2} />
          <span className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-[11px] font-black shadow">
            PRO
          </span>
        </div>

        <h1 className="text-2xl font-black text-slate-900 tracking-tight">ParentPro Premium</h1>
        <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
          Đồng hành trọn vẹn và bảo vệ con toàn diện cùng sức mạnh AI
        </p>

        {isPremium && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold shadow-xs">
            <CheckCircle2 size={14} className="text-emerald-600" />
            <span>Đang kích hoạt gói {premiumPlan === 'yearly' ? '1 Năm' : '1 Tháng'} • Hết hạn: {premiumExpiresAt || 'Vĩnh viễn'}</span>
          </div>
        )}

        {/* Feature Checkpoints */}
        <div className="bg-white rounded-3xl p-5 shadow-soft border border-slate-100/80 text-left space-y-3 mt-4">
          {features.map((item, idx) => (
            <div key={idx} className="flex items-start space-x-3">
              <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" />
              <span className="text-xs font-semibold text-slate-700 leading-snug">{item}</span>
            </div>
          ))}
        </div>

        <div className="pt-2 text-center">
          <span className="text-xs font-bold text-slate-400">Chỉ từ </span>
          <span className="text-2xl font-black text-blue-600">33.250đ</span>
          <span className="text-xs text-slate-500"> / tháng</span>
        </div>
      </div>

      {/* CTA Buttons */}
      <div className="space-y-2.5 pb-2 pt-2">
        <button
          type="button"
          onClick={() => setShowCheckoutModal(true)}
          className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-2xl shadow-lg shadow-blue-500/25 transition active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
        >
          <Zap size={16} className="fill-current" />
          <span>{isPremium ? 'Gia Hạn Gói Premium' : 'Nâng Cấp Ngay'}</span>
        </button>

        <button
          type="button"
          onClick={() => setShowComparisonModal(true)}
          className="w-full py-2 text-[11px] font-semibold text-slate-400 hover:text-slate-600 text-center cursor-pointer"
        >
          So sánh tính năng & Tìm hiểu thêm
        </button>
      </div>

      {/* Modal 1: Checkout & Plan Selection */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Crown size={16} className="text-amber-500" />
                <span>Chọn Gói Đăng Ký Premium</span>
              </h3>
              <button
                onClick={() => {
                  setShowCheckoutModal(false);
                  setIsActivated(false);
                }}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {isActivated ? (
              <div className="py-6 text-center space-y-3">
                <div className="w-16 h-16 bg-gradient-to-tr from-amber-400 to-yellow-300 text-amber-900 rounded-3xl flex items-center justify-center mx-auto shadow-lg ring-4 ring-amber-100">
                  <Crown size={36} />
                </div>
                <h4 className="text-base font-black text-slate-900">Chúc Mừng Bạn Đã Lên Premium!</h4>
                <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                  Tài khoản gia đình đã được kích hoạt thành công toàn bộ tính năng cao cấp không giới hạn.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setShowCheckoutModal(false);
                    setIsActivated(false);
                  }}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer mt-2"
                >
                  Bắt Đầu Sử Dụng
                </button>
              </div>
            ) : (
              <div className="space-y-3.5">
                {/* Plans */}
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setSelectedPlan('yearly')}
                    className={`w-full p-3.5 rounded-2xl border text-left transition flex items-center justify-between cursor-pointer ${
                      selectedPlan === 'yearly'
                        ? 'border-blue-500 bg-blue-50/80 text-blue-900 ring-1 ring-blue-300 shadow-xs'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-black">Gói 1 Năm (Tiết kiệm 35%)</span>
                        <span className="text-[9.5px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded">
                          Phổ biến nhất
                        </span>
                      </div>
                      <p className="text-[10.5px] text-slate-500 mt-0.5">399.000đ / 12 tháng (~33.250đ/tháng)</p>
                    </div>
                    {selectedPlan === 'yearly' && <Check size={18} className="text-blue-600 font-black" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedPlan('monthly')}
                    className={`w-full p-3.5 rounded-2xl border text-left transition flex items-center justify-between cursor-pointer ${
                      selectedPlan === 'monthly'
                        ? 'border-blue-500 bg-blue-50/80 text-blue-900 ring-1 ring-blue-300 shadow-xs'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div>
                      <span className="text-xs font-black block">Gói 1 Tháng</span>
                      <p className="text-[10.5px] text-slate-500 mt-0.5">49.000đ / tháng • Gia hạn linh hoạt</p>
                    </div>
                    {selectedPlan === 'monthly' && <Check size={18} className="text-blue-600 font-black" />}
                  </button>
                </div>

                {/* Payment Methods */}
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Phương thức thanh toán
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'momo' as const, label: 'Ví MoMo', icon: Smartphone, color: '#A50064' },
                      { id: 'vnpay' as const, label: 'VNPAY-QR', icon: QrCode, color: '#005BAA' },
                      { id: 'vietqr' as const, label: 'Chuyển khoản VietQR', icon: QrCode, color: '#10B981' },
                      { id: 'card' as const, label: 'Thẻ Visa / Master', icon: CreditCard, color: '#6366F1' },
                    ].map((pm) => {
                      const isSelected = paymentMethod === pm.id;
                      const Icon = pm.icon;
                      return (
                        <button
                          key={pm.id}
                          type="button"
                          onClick={() => setPaymentMethod(pm.id)}
                          className={`p-2.5 rounded-xl border flex items-center space-x-2 text-left transition cursor-pointer ${
                            isSelected
                              ? 'border-blue-500 bg-blue-50/80 text-blue-700 shadow-xs'
                              : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                          }`}
                        >
                          <Icon size={16} style={{ color: pm.color }} />
                          <span className="text-[11px] font-bold truncate leading-tight">{pm.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-2 flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowCheckoutModal(false)}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={handleCheckout}
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {isProcessing ? 'Đang xử lý...' : selectedPlan === 'yearly' ? 'Thanh toán 399.000đ' : 'Thanh toán 49.000đ'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal 2: Feature Comparison */}
      {showComparisonModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <ShieldCheck size={16} className="text-blue-600" />
                <span>So Sánh Quyền Lợi Gói</span>
              </h3>
              <button
                onClick={() => setShowComparisonModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="border border-slate-100 rounded-2xl overflow-hidden text-xs">
              <div className="grid grid-cols-3 bg-slate-100 p-2.5 font-bold text-slate-700">
                <span>Tính năng</span>
                <span className="text-center text-slate-500">Miễn phí</span>
                <span className="text-center text-blue-600 font-black">Premium Pro</span>
              </div>
              <div className="divide-y divide-slate-100">
                {comparisonRows.map((row, idx) => (
                  <div key={idx} className="grid grid-cols-3 p-2.5 items-center">
                    <span className="font-semibold text-slate-800 text-[11px] leading-tight">{row.name}</span>
                    <span className="text-center text-[10px] text-slate-400">{row.free}</span>
                    <span className="text-center text-[10px] font-bold text-emerald-600">{row.pro}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowComparisonModal(false);
                setShowCheckoutModal(true);
              }}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer"
            >
              Nâng Cấp Ngay
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
