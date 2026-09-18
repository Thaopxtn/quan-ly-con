import React, { useState } from "react";
import {
  ShieldCheck,
  Lock,
  MapPin,
  Clock,
  Radio,
  FileText,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Eye,
  Smartphone
} from "lucide-react";

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  role: "parent" | "kid";
  onAccept?: () => void;
  onClose?: () => void;
  isViewOnly?: boolean;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({
  isOpen,
  role,
  onAccept,
  onClose,
  isViewOnly = false,
}) => {
  const [hasAgreed, setHasAgreed] = useState(false);
  const [activeTab, setActiveTab] = useState<"summary" | "data_collected" | "security">("summary");

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (isViewOnly) {
      if (onClose) onClose();
      return;
    }
    if (hasAgreed) {
      const storageKey =
        role === "parent"
          ? "parentpro_privacy_policy_accepted_v1"
          : "kidcare_privacy_policy_accepted_v1";
      localStorage.setItem(storageKey, "true");
      if (onAccept) onAccept();
    }
  };

  const isParent = role === "parent";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/80 backdrop-blur-md animate-in fade-in select-none">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-100 animate-in zoom-in-95">
        
        {/* Header */}
        <div className={`p-4 text-white relative ${isParent ? "bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-800" : "bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600"}`}>
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 shadow-inner">
              <ShieldCheck size={26} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] uppercase font-black tracking-wider px-2 py-0.5 bg-white/20 rounded-full inline-block mb-0.5">
                {isParent ? "ParentPro • Dành cho Phụ huynh" : "KidCare • Bảo vệ an toàn của con"}
              </span>
              <h2 className="text-base font-black leading-tight truncate">
                Chính Sách Quyền Riêng Tư & Bảo Mật
              </h2>
              <p className="text-[11px] text-blue-100 font-medium">
                Tuân thủ Luật Trẻ Em & COPPA Quốc Tế
              </p>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center cursor-pointer transition"
                aria-label="Đóng"
              >
                ✕
              </button>
            )}
          </div>

          {/* Navigation Tabs */}
          <div className="flex mt-3 bg-black/20 p-1 rounded-xl text-xs font-bold gap-1">
            <button
              onClick={() => setActiveTab("summary")}
              className={`flex-1 py-1 px-2 rounded-lg transition text-center cursor-pointer ${
                activeTab === "summary" ? "bg-white text-blue-900 shadow-sm" : "text-white/80 hover:text-white"
              }`}
            >
              Tổng quan
            </button>
            <button
              onClick={() => setActiveTab("data_collected")}
              className={`flex-1 py-1 px-2 rounded-lg transition text-center cursor-pointer ${
                activeTab === "data_collected" ? "bg-white text-blue-900 shadow-sm" : "text-white/80 hover:text-white"
              }`}
            >
              Dữ liệu thu thập
            </button>
            <button
              onClick={() => setActiveTab("security")}
              className={`flex-1 py-1 px-2 rounded-lg transition text-center cursor-pointer ${
                activeTab === "security" ? "bg-white text-blue-900 shadow-sm" : "text-white/80 hover:text-white"
              }`}
            >
              Cam kết bảo mật
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs text-slate-600">
          {activeTab === "summary" && (
            <div className="space-y-3">
              <div className="bg-blue-50/70 border border-blue-100 p-3 rounded-2xl flex items-start space-x-2.5">
                <AlertCircle size={18} className="text-blue-600 shrink-0 mt-0.5" />
                <p className="text-[11.5px] text-blue-900 leading-relaxed font-medium">
                  Ứng dụng được thiết kế nhằm mục đích <strong>bảo vệ an toàn thể chất và tinh thần của trẻ em</strong> trong môi trường số, hỗ trợ cha mẹ đồng hành cùng con mà vẫn tôn trọng tối đa sự riêng tư và bảo mật dữ liệu gia đình.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                  4 Nguyên tắc bảo vệ cốt lõi:
                </h4>

                <div className="grid grid-cols-1 gap-2">
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl flex items-start space-x-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <MapPin size={16} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-[11.5px]">Định vị an toàn 24/7</p>
                      <p className="text-[11px] text-slate-500">
                        Chỉ cha mẹ trong gia đình mới có thể xem vị trí thời gian thực và lịch sử di chuyển của con.
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl flex items-start space-x-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                      <Clock size={16} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-[11.5px]">Quản lý giờ dùng & nghỉ ngơi</p>
                      <p className="text-[11px] text-slate-500">
                        Theo dõi thời lượng mở ứng dụng, tự động khóa giờ ăn cơm, giờ ngủ và hạn chế cận thị.
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl flex items-start space-x-2.5">
                    <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                      <Radio size={16} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-[11.5px]">Cứu nạn khẩn cấp SOS</p>
                      <p className="text-[11px] text-slate-500">
                        Khi con gặp nguy hiểm bấm nút SOS, chuông báo động lập tức hú trên máy cha mẹ kèm tọa độ chính xác.
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl flex items-start space-x-2.5">
                    <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                      <Lock size={16} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-[11.5px]">Mã hóa & Quyền riêng tư</p>
                      <p className="text-[11px] text-slate-500">
                        Tuyệt đối KHÔNG bán dữ liệu cho bất kỳ công ty quảng cáo nào. Cha mẹ có quyền xóa hoàn toàn dữ liệu.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "data_collected" && (
            <div className="space-y-3">
              <p className="text-[11.5px] leading-relaxed">
                Để phục vụ việc giám sát an toàn, hệ thống chỉ thu thập các thông tin kỹ thuật cần thiết sau:
              </p>

              <div className="space-y-2">
                <div className="border border-slate-100 rounded-xl p-2.5 bg-slate-50">
                  <span className="font-bold text-slate-900 block mb-0.5">1. Vị trí địa lý (GPS & Mạng)</span>
                  <p className="text-[11px] text-slate-500">
                    Tọa độ vĩ độ/kinh độ, tốc độ di chuyển và địa chỉ ước tính khi con di chuyển hoặc khi kích hoạt SOS.
                  </p>
                </div>

                <div className="border border-slate-100 rounded-xl p-2.5 bg-slate-50">
                  <span className="font-bold text-slate-900 block mb-0.5">2. Thống kê sử dụng màn hình</span>
                  <p className="text-[11px] text-slate-500">
                    Tên các ứng dụng con mở (ví dụ: YouTube, Game, Trình duyệt) và tổng số phút sử dụng trong ngày.
                  </p>
                </div>

                <div className="border border-slate-100 rounded-xl p-2.5 bg-slate-50">
                  <span className="font-bold text-slate-900 block mb-0.5">3. Trạng thái thiết bị phần cứng</span>
                  <p className="text-[11px] text-slate-500">
                    Phần trăm pin, trạng thái sạc, kết nối WiFi/4G, âm lượng loa và trạng thái khóa/mở máy.
                  </p>
                </div>

                <div className="border border-slate-100 rounded-xl p-2.5 bg-slate-50">
                  <span className="font-bold text-slate-900 block mb-0.5">4. Tin nhắn gia đình & Yêu cầu gia hạn</span>
                  <p className="text-[11px] text-slate-500">
                    Nội dung trò chuyện giữa cha mẹ và con cái trong ứng dụng, yêu cầu xin thêm thời gian và nhiệm vụ nhận sao.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "security" && (
            <div className="space-y-3">
              <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-start space-x-2.5">
                <ShieldCheck size={20} className="text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-[11.5px] text-emerald-900 space-y-1">
                  <p className="font-bold">Cam kết an toàn tuyệt đối từ nhà phát triển:</p>
                  <ul className="list-disc pl-3.5 space-y-0.5 text-[11px] text-emerald-800">
                    <li>Dữ liệu truyền tải qua giao thức mã hóa HTTPS/TLS và Firebase Security Rules.</li>
                    <li>Chỉ các thiết bị đã quét mã QR kết nối (Paired Devices) mới có khóa giải mã dữ liệu của con.</li>
                    <li>Không lưu trữ mật khẩu thuần hoặc thông tin tài khoản ngân hàng của phụ huynh.</li>
                    <li>Tuân thủ Luật Trẻ Em số 102/2016/QH13 của Nước Cộng hòa Xã hội Chủ nghĩa Việt Nam.</li>
                  </ul>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] text-slate-500 space-y-1">
                <p className="font-bold text-slate-700">Quyền của người dùng:</p>
                <p>
                  Bất kỳ lúc nào, cha mẹ có thể hủy kết nối thiết bị của con hoặc xóa toàn bộ lịch sử vị trí và dữ liệu hoạt động trong phần <em>Cài đặt &gt; Xóa dữ liệu</em>.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer / Accept Section */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 space-y-3">
          {!isViewOnly && (
            <label className="flex items-start space-x-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={hasAgreed}
                onChange={(e) => setHasAgreed(e.target.checked)}
                className="w-4 h-4 mt-0.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
              />
              <span className="text-[11.5px] text-slate-700 leading-snug">
                Tôi đã đọc, hiểu rõ và <strong>đồng ý</strong> với Chính sách quyền riêng tư và Điều khoản sử dụng của hệ thống {isParent ? "ParentPro" : "KidCare"}.
              </span>
            </label>
          )}

          <div className="flex items-center space-x-2">
            {isViewOnly ? (
              <button
                onClick={onClose}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl text-xs shadow-md transition active:scale-98 cursor-pointer text-center"
              >
                Đóng
              </button>
            ) : (
              <button
                onClick={handleConfirm}
                disabled={!hasAgreed}
                className={`w-full py-3 font-bold rounded-2xl text-xs shadow-md transition flex items-center justify-center space-x-1.5 cursor-pointer active:scale-98 ${
                  hasAgreed
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:opacity-95 shadow-blue-500/20"
                    : "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                }`}
              >
                <CheckCircle2 size={16} />
                <span>Tôi Chấp Nhận & Tiếp Tục</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
