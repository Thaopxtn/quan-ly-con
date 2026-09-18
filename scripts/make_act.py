import os

content = '''import React, { useState, useRef } from " react\;
import {
 Smartphone,
 ShieldCheck,
 ArrowRight,
 Sparkles,
 Heart,
} from \lucide-react\;
import { submitChildPairingCode, KidPairedInfo } from \@shared/firebase/pairingService\;
import confetti from \canvas-confetti\;

interface KidActivationScreenProps {
 onActivationComplete: (parentName: string, childName: string) => void;
}

export const KidActivationScreen: React.FC<KidActivationScreenProps> = ({
 onActivationComplete,
}) => {
 const [digits, setDigits] = useState([\\, \\, \\, \\, \\, \\]);
 const [loading, setLoading] = useState(false);
 const [errorMsg, setErrorMsg] = useState<string | null>(null);

 const inputRefs = [
 useRef<HTMLInputElement>(null),
 useRef<HTMLInputElement>(null),
 useRef<HTMLInputElement>(null),
 useRef<HTMLInputElement>(null),
 useRef<HTMLInputElement>(null),
 useRef<HTMLInputElement>(null),
 ];

 const handleDigitChange = (index: number, val: string) => {
 const clean = val.replace(/\\D/g, \\).slice(-1);
 const newDigits = [...digits];
 newDigits[index] = clean;
 setDigits(newDigits);
 setErrorMsg(null);

 if (clean && index < 5) {
 inputRefs[index + 1].current?.focus();
 }
 };

 const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
 if (e.key === \Backspace\ && !digits[index] && index > 0) {
 inputRefs[index - 1].current?.focus();
 }
 };

 const handlePaste = (e: React.ClipboardEvent) => {
 e.preventDefault();
 const pasted = e.clipboardData.getData(\text\).replace(/\\D/g, \\).slice(0, 6);
 if (pasted) {
 const newDigits = [...digits];
 for (let i = 0; i < pasted.length; i++) {
 newDigits[i] = pasted[i];
 }
 setDigits(newDigits);
 if (pasted.length === 6) {
 inputRefs[5].current?.focus();
 }
 }
 };

 const getDeviceModel = () => {
 if (typeof navigator === \undefined\) return \Android Device\;
 const ua = navigator.userAgent;
 if (/samsung/i.test(ua)) return \Samsung Galaxy\;
 if (/redmi|xiaomi/i.test(ua)) return \Xiaomi\;
 if (/oppo/i.test(ua)) return \Oppo\;
 if (/pixel/i.test(ua)) return \Google Pixel\;
 return \Android Device\;
 };

 const handleSubmit = async () => {
 const code = digits.join(\\);
 if (code.length !== 6) {
 setErrorMsg(\Vui lòng nhập đủ 6 chữ số mã ghép đôi.\);
 return;
 }

 setLoading(true);
 setErrorMsg(null);

 try {
 const res = await submitChildPairingCode(code, {
 model: getDeviceModel(),
 osVersion: \Android 14\,
 });

 if (res.success && res.session) {
 confetti({
 particleCount: 120,
 spread: 80,
 origin: { y: 0.6 },
 });
 setTimeout(() => {
 onActivationComplete(res.session!.parentName, res.session!.childName);
 }, 1000);
 } else {
 setErrorMsg(res.error || \Mã ghép đôi không đúng hoặc đã hết hạn.\);
 }
 } catch (err) {
 setErrorMsg(\Lỗi kết nối máy chủ Cloud Firebase. Vui lòng thử lại.\);
 } finally {
 setLoading(false);
 }
 };

 return (
 <div className=\min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col justify-between p-6 select-none relative overflow-hidden\>
 <div className=\absolute -top-24 -left-24 w-72 h-72 bg-blue-600/20 rounded-full blur-3xl pointer-events-none\ />
 <div className=\absolute -bottom-24 -right-24 w-72 h-72 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none\ />

 <div className=\pt-8 text-center relative z-10\>
 <div className=\w-16 h-16 mx-auto bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-3xl shadow-xl shadow-blue-500/25 flex items-center justify-center text-white mb-3 ring-4 ring-blue-500/20\>
 <ShieldCheck size={36} strokeWidth={2.5} />
 </div>
 <h1 className=\text-2xl font-black tracking-tight text-white\>KidCare - Con Cái</h1>
 <p className=\text-xs font-medium text-slate-400 mt-1 flex items-center justify-center gap-1.5\>
 <Heart size={13} className=\text-rose-400 fill-rose-400\ />
 Bảo vệ an toàn & đồng hành cùng con 24/7
 </p>
 </div>

 <div className=\my-auto py-4 max-w-sm mx-auto w-full relative z-10\>
 <div className=\bg-slate-900/90 border border-slate-800 backdrop-blur-xl rounded-3xl p-6 shadow-2xl space-y-5\>
 <div className=\text-center space-y-1.5\>
 <div className=\inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[11px] font-bold\>
 <Sparkles size={12} />
 KÍCH HOẠT THIẾT BỊ LẦN ĐẦU
 </div>
 <h2 className=\text-base font-bold text-slate-100 pt-1\>Nhập Mã Ghép Đôi 6 Số</h2>
 <p className=\text-xs text-slate-400 leading-relaxed\>
 Mở app <strong>ParentPro (Cha Mẹ)</strong> ➔ Chọn <strong>Ghép đôi thiết bị</strong> để lấy mã PIN 6 số.
 </p>
 </div>

 <div className=\flex justify-center gap-2 py-1\ onPaste={handlePaste}>
 {digits.map((digit, idx) => (
 <input
 key={idx}
 ref={inputRefs[idx]}
 type=\text\
 inputMode=\numeric\
 maxLength={1}
 value={digit}
 onChange={(e) => handleDigitChange(idx, e.target.value)}
 onKeyDown={(e) => handleKeyDown(idx, e)}
 className=\w-11 h-13 text-center text-2xl font-black font-mono bg-slate-800/90 border border-slate-700 text-amber-400 rounded-2xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 outline-none transition shadow-inner\
 autoFocus={idx === 0}
 />
 ))}
 </div>

 {errorMsg && (
 <div className=\p-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-400 text-xs font-semibold text-center\>
 {errorMsg}
 </div>
 )}

 <button
 onClick={handleSubmit}
 disabled={loading || digits.join(\\).length !== 6}
 className=\w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-2xl shadow-lg shadow-blue-500/25 transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm cursor-pointer\
 >
 {loading ? (
 <span>Đang kiểm tra Cloud...</span>
 ) : (
 <>
 <span>Liên Kết Với Cha Mẹ</span>
 <ArrowRight size={16} />
 </>
 )}
 </button>

 <div className=\pt-2 border-t border-slate-800/80 space-y-1.5 text-[11px] text-slate-400\>
 <div className=\flex items-center gap-2\>
 <div className=\w-4 h-4 rounded-full bg-blue-500/20 text-blue-400 font-bold text-[10px] flex items-center justify-center\>1</div>
 <span>Trên máy Bố/Mẹ: Vào app ParentPro bấm <strong>Ghép đôi thiết bị</strong></span>
 </div>
 <div className=\flex items-center gap-2\>
 <div className=\w-4 h-4 rounded-full bg-blue-500/20 text-blue-400 font-bold text-[10px] flex items-center justify-center\>2</div>
 <span>Nhập 6 số hiện trên màn hình Bố/Mẹ vào ô trên</span>
 </div>
 <div className=\flex items-center gap-2\>
 <div className=\w-4 h-4 rounded-full bg-blue-500/20 text-blue-400 font-bold text-[10px] flex items-center justify-center\>3</div>
 <span>Hai máy tự động đồng bộ GPS, Pin, SOS và bảo vệ ngầm 24/7</span>
 </div>
 </div>
 </div>
 </div>

 <div className=\text-center text-[11px] text-slate-500 pb-2 relative z-10\>
 KidCare v1.0 • MDM Protected Real-time Security
 </div>
 </div>
 );
};
'''

with open(r'D:\luufilelaptrinh\quan ly con\appconchau\src\KidActivationScreen.tsx', 'w', encoding='utf-8') as f:
 f.write(content)

print('Success KidActivationScreen.tsx')
