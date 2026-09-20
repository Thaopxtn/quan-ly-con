import React, { useState } from 'react';
import { ShieldCheck, Heart, User, Mail, Lock, ArrowRight } from 'lucide-react';
import { loginParentAccount, registerParentAccount, loginWithGoogleParentAccount } from '@shared/firebase/firebaseService';
import { isSimulatorMode } from '@shared/store';

interface WelcomeAuthScreenProps {
  onLoginSuccess: () => void;
}

export const WelcomeAuthScreen: React.FC<WelcomeAuthScreenProps> = ({ onLoginSuccess }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg('Vui lòng nhập địa chỉ email hợp lệ.');
      return;
    }

    if (!password || password.length < 6) {
      setErrorMsg('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }

    setLoading(true);
    try {
      if (isRegister) {
        const name = fullName.trim() || 'Bố/Mẹ';
        const res = await registerParentAccount(cleanEmail, password, name);
        if (res.success) {
          onLoginSuccess();
        } else {
          setErrorMsg(res.error || 'Đăng ký thất bại. Vui lòng thử lại.');
        }
      } else {
        const res = await loginParentAccount(cleanEmail, password);
        if (res.success) {
          onLoginSuccess();
        } else {
          setErrorMsg(res.error || 'Đăng nhập không thành công. Kiểm tra lại thông tin.');
        }
      }
    } catch (err: any) {
      setErrorMsg('Lỗi kết nối máy chủ. Vui lòng kiểm tra Internet.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await loginWithGoogleParentAccount();
      if (res.success) {
        onLoginSuccess();
      } else {
        setErrorMsg(res.error || 'Đăng nhập Google không thành công. Vui lòng thử lại.');
      }
    } catch (err: any) {
      setErrorMsg('Lỗi kết nối khi xác thực Google.');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen flex flex-col justify-between p-5 bg-gradient-to-b from-slate-50 via-white to-blue-50/40 select-none overflow-y-auto">
      {/* Status Bar Spacer */}
      {!isSimulatorMode() && (
        <div
          className="w-full shrink-0 bg-transparent pointer-events-none"
          style={{ height: 'var(--status-bar-height, 42px)' }}
        />
      )}

      {/* Top Header & Brand */}
      <div className="pt-2 pb-2 text-center">
        <div className="relative inline-block mb-3">
          <div className="w-16 h-16 bg-blue-600 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-3xl shadow-xl shadow-blue-500/25 flex items-center justify-center text-white ring-8 ring-blue-500/10 transition-transform active:scale-95">
            <ShieldCheck size={34} strokeWidth={2.2} />
          </div>
          <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-white"></span>
          </span>
        </div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">ParentPro</h1>
        <p className="text-xs font-semibold text-slate-500 mt-1 flex items-center justify-center gap-1.5">
          <Heart size={13} className="text-rose-500 fill-rose-500 inline" />
          Hệ sinh thái an toàn số & đồng hành cùng con
        </p>
      </div>

      {/* Main Form Card */}
      <div className="my-auto py-2 max-w-sm mx-auto w-full">
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-6 shadow-[0_10px_35px_-8px_rgba(15,23,42,0.08)] border border-slate-200/80 space-y-4">
          {/* iOS Segmented Selector */}
          <div className="bg-slate-100/90 p-1 rounded-2xl flex text-xs font-bold border border-slate-200/70">
            <button
              type="button"
              onClick={() => {
                setIsRegister(false);
                setErrorMsg(null);
              }}
              className={`flex-1 py-2 rounded-xl transition-all duration-200 cursor-pointer ${
                !isRegister
                  ? 'bg-white text-blue-600 shadow-sm font-black'
                  : 'text-slate-500 hover:text-slate-800 font-semibold'
              }`}
            >
              Đăng Nhập
            </button>
            <button
              type="button"
              onClick={() => {
                setIsRegister(true);
                setErrorMsg(null);
              }}
              className={`flex-1 py-2 rounded-xl transition-all duration-200 cursor-pointer ${
                isRegister
                  ? 'bg-white text-blue-600 shadow-sm font-black'
                  : 'text-slate-500 hover:text-slate-800 font-semibold'
              }`}
            >
              Đăng Ký Mới
            </button>
          </div>

          {/* Google Sign-in Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full py-2.5 px-4 bg-white hover:bg-slate-50/90 border border-slate-200 hover:border-slate-300 rounded-2xl shadow-xs text-slate-800 text-xs font-bold transition-all active:scale-[0.98] flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.15z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.15C3.26 21.36 7.33 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.24C.45 8.15 0 9.92 0 12s.45 3.85 1.24 5.42l4.04-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.24 6.58l4.04 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
            <span>{isRegister ? 'Đăng ký nhanh bằng Google' : 'Tiếp tục với Google'}</span>
          </button>

          {/* Clean Divider */}
          <div className="relative flex items-center justify-center my-1">
            <div className="border-t border-slate-200/80 w-full"></div>
            <span className="bg-white px-3 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              hoặc email
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {isRegister && (
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                  <User size={13} className="text-blue-600" />
                  Họ và tên của bạn
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Bố Minh, Mẹ Thảo"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50/80 border border-slate-200 text-slate-900 rounded-2xl text-xs focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition font-medium"
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                <Mail size={13} className="text-blue-600" />
                Email phụ huynh
              </label>
              <input
                type="email"
                placeholder="name@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50/80 border border-slate-200 text-slate-900 rounded-2xl text-xs focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition font-medium"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                <Lock size={13} className="text-blue-600" />
                Mật khẩu bảo vệ
              </label>
              <input
                type="password"
                placeholder="Tối thiểu 6 ký tự"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50/80 border border-slate-200 text-slate-900 rounded-2xl text-xs focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition font-medium"
              />
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-50/90 border border-rose-200 text-rose-800 rounded-2xl text-[11px] font-semibold text-center space-y-1.5 animate-in fade-in">
                <p>{errorMsg}</p>
                {!isRegister && errorMsg.includes('Tạo tài khoản') && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsRegister(true);
                      setErrorMsg(null);
                    }}
                    className="inline-block px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-[10px] shadow-xs active:scale-95 cursor-pointer"
                  >
                    Chuyển sang Đăng ký ngay ➔
                  </button>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black rounded-2xl shadow-lg shadow-blue-500/25 transition-all active:scale-[0.98] text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 mt-1"
            >
              {loading ? (
                <span>Đang xử lý...</span>
              ) : (
                <>
                  <span>{isRegister ? 'Hoàn Tất Đăng Ký' : 'Đăng Nhập Vào ParentPro'}</span>
                  <ArrowRight size={14} strokeWidth={2.5} />
                </>
              )}
            </button>
          </form>
        </div>

      </div>

      {/* Footer */}
      <div className="text-center text-[10px] font-semibold text-slate-400 pb-2 flex items-center justify-center gap-1.5">
        <ShieldCheck size={13} className="text-slate-400 inline" />
        <span>Bảo mật dữ liệu 256-bit • Firebase Cloud Realtime</span>
      </div>
    </div>
  );
};
