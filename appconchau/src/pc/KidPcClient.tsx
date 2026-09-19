import React, { useState, useEffect, useRef } from 'react';
import {
  Monitor,
  Lock,
  Unlock,
  BookOpen,
  Power,
  Tv,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Volume2,
  AlertTriangle,
  CheckCircle2,
  Download,
  Maximize2,
  Minimize2,
  Smile,
  Flame,
  Check
} from 'lucide-react';
import {
  subscribeRemoteCommandsOnKid,
  subscribeChildPcConfig,
  uploadChildPcTelemetry,
  RemoteCommandData,
} from '@shared/firebase/cloudSyncService';
import { getActiveParentId, useAppState } from '@shared/store';
import { ChildPcControlConfig, ChildPcTelemetry } from '@shared/types';
import { playNotificationSound } from '@shared/services/systemNotificationService';

const STUDY_WEBSITES = [
  { name: 'OLM - Học Trực Tuyến', domain: 'olm.vn', url: 'https://olm.vn', icon: '🏫', desc: 'Học bài và luyện đề lớp 1 - 12' },
  { name: 'VioEdu - Đấu Trường Toán Học', domain: 'vio.edu.vn', url: 'https://vio.edu.vn', icon: '📐', desc: 'Toán học thông minh AI' },
  { name: 'SHub Classroom', domain: 'shub.edu.vn', url: 'https://shub.edu.vn', icon: '📝', desc: 'Nộp bài tập và làm bài kiểm tra' },
  { name: 'Khan Academy Tiếng Việt', domain: 'vi.khanacademy.org', url: 'https://vi.khanacademy.org', icon: '🌟', desc: 'Kho khóa học chuẩn quốc tế' },
  { name: 'Zoom Học Tập', domain: 'zoom.us', url: 'https://zoom.us/join', icon: '📹', desc: 'Vào phòng học trực tuyến của thầy cô' },
  { name: 'HocMai.vn', domain: 'hocmai.vn', url: 'https://hocmai.vn', icon: '📚', desc: 'Học trực tuyến số 1 Việt Nam' },
  { name: 'VietJack', domain: 'vietjack.com', url: 'https://vietjack.com', icon: '📖', desc: 'Lời giải chi tiết sách giáo khoa' },
];

export const KidPcClient: React.FC = () => {
  const { state } = useAppState();
  const searchParams = new URLSearchParams(window.location.search);
  const childIdParam = searchParams.get('childId') || 'child_1';
  const parentIdParam = searchParams.get('parentId') || getActiveParentId() || 'family_primary';

  const childProfile = state.children?.find((c) => c.id === childIdParam) || state.child;
  const childName = childProfile?.name || 'Con';

  // PC State
  const [pcConfig, setPcConfig] = useState<ChildPcControlConfig>({
    isLocked: false,
    lockReason: '',
    isStudyMode: false,
    dailyLimitMinutes: 120,
    curfewStart: '22:00',
    curfewEnd: '06:00',
    mealtimeLock: false,
    bedtimeLock: false,
    allowedWebsitesOnly: false,
    whitelistedWebsites: ['olm.vn', 'vio.edu.vn', 'shub.edu.vn', 'zoom.us', 'khanacademy.org', 'hocmai.vn', 'vietjack.com'],
    blacklistedWebsites: ['facebook.com', 'tiktok.com', 'gamevui.vn', 'roblox.com'],
    blockedApps: [],
  });

  const [activeWindow, setActiveWindow] = useState('Google Chrome - Góc Học Tập');
  const [screenTimeSeconds, setScreenTimeSeconds] = useState(45 * 60);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Broadcast Message State
  const [broadcastOverlay, setBroadcastOverlay] = useState<{
    title: string;
    message: string;
    sticker?: string;
  } | null>(null);

  // Shutdown Countdown State
  const [shutdownCountdown, setShutdownCountdown] = useState<number | null>(null);

  // Request Extension Modal
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestSent, setRequestSent] = useState(false);

  // 1. Subscribe to PC Config from Firebase
  useEffect(() => {
    const unsubConfig = subscribeChildPcConfig(parentIdParam, childIdParam, (newConfig) => {
      if (newConfig) {
        setPcConfig(newConfig);
      }
    });

    return () => {
      unsubConfig();
    };
  }, [parentIdParam, childIdParam]);

  // 2. Subscribe to Realtime Remote Commands from Parent
  useEffect(() => {
    const unsubCmd = subscribeRemoteCommandsOnKid(parentIdParam, childIdParam, (cmd: RemoteCommandData) => {
      if (!cmd || !cmd.command) return;

      if (cmd.command === 'pc_lock' || cmd.command === 'lock_now') {
        setPcConfig((prev) => ({
          ...prev,
          isLocked: true,
          lockReason: cmd.payload?.reason || cmd.payload?.description || 'Bố mẹ đã tạm khóa máy tính.',
        }));
        playNotificationSound('emergency');
      } else if (cmd.command === 'pc_unlock' || cmd.command === 'unlock_now') {
        setPcConfig((prev) => ({ ...prev, isLocked: false, lockReason: '' }));
        playNotificationSound('success');
      } else if (cmd.command === 'pc_study_mode') {
        const enabled = cmd.payload?.enabled !== undefined ? cmd.payload.enabled : true;
        setPcConfig((prev) => ({ ...prev, isStudyMode: enabled }));
        playNotificationSound('info');
      } else if (cmd.command === 'pc_broadcast' || cmd.command === 'broadcast_msg') {
        setBroadcastOverlay({
          title: cmd.payload?.title || 'Lời dặn từ Bố Mẹ',
          message: cmd.payload?.message || cmd.payload?.text || 'Con chú ý nhé!',
          sticker: cmd.payload?.sticker || '📢',
        });
        playNotificationSound('warning');
      } else if (cmd.command === 'pc_shutdown') {
        const delay = cmd.payload?.delaySeconds || 0;
        if (delay === 0) {
          setShutdownCountdown(5);
        } else {
          setShutdownCountdown(delay);
        }
      }
    });

    return () => {
      unsubCmd();
    };
  }, [parentIdParam, childIdParam]);

  // 3. Screen Time & Telemetry Upload Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setScreenTimeSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Shutdown Countdown interval
  useEffect(() => {
    if (shutdownCountdown === null) return;
    if (shutdownCountdown <= 0) {
      alert('Máy tính được lệnh tắt từ Bố Mẹ!');
      setShutdownCountdown(null);
      return;
    }

    const timer = setTimeout(() => {
      setShutdownCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [shutdownCountdown]);

  // Periodic Telemetry Sync every 30s
  useEffect(() => {
    const syncTelemetry = () => {
      const telemetry: ChildPcTelemetry = {
        deviceId: 'pc_' + childIdParam,
        pcName: `Máy tính của ${childName}`,
        osVersion: 'Windows 11 Home 64-bit',
        status: 'online',
        lastSeen: Date.now(),
        activeWindow: pcConfig.isLocked ? 'Màn hình khóa KidCare' : activeWindow,
        activeProcess: 'chrome.exe',
        screenTimeTodayMinutes: Math.round(screenTimeSeconds / 60),
        isLocked: pcConfig.isLocked,
        isStudyMode: pcConfig.isStudyMode,
        cpuUsage: Math.floor(10 + Math.random() * 20),
        ramUsage: 45,
      };
      uploadChildPcTelemetry(parentIdParam, childIdParam, telemetry).catch(() => {});
    };

    syncTelemetry();
    const interval = setInterval(syncTelemetry, 30000);
    return () => clearInterval(interval);
  }, [parentIdParam, childIdParam, childName, pcConfig.isLocked, pcConfig.isStudyMode, activeWindow, screenTimeSeconds]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  const minutesUsed = Math.floor(screenTimeSeconds / 60);
  const hoursUsed = Math.floor(minutesUsed / 60);
  const remainingMinutes = minutesUsed % 60;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans select-none overflow-x-hidden">
      {/* ========================================================================= */}
      {/* 1. TOP HEADER                                                             */}
      {/* ========================================================================= */}
      <header className="bg-slate-800/90 backdrop-blur-md border-b border-slate-700/80 px-6 py-3.5 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Monitor size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black tracking-tight text-white">KidCare PC</h1>
              <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-black uppercase tracking-wider border border-blue-400/30">
                Góc Học Tập
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Máy tính của: <strong className="text-blue-300">{childName}</strong>
            </p>
          </div>
        </div>

        {/* Center: Live Screen Time Gauge */}
        <div className="flex items-center gap-4 bg-slate-900/60 px-4 py-2 rounded-2xl border border-slate-700">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
            <Clock size={16} className="text-indigo-400" />
            <span>Thời gian đã dùng:</span>
            <strong className="text-white font-mono text-sm">
              {hoursUsed > 0 ? `${hoursUsed}h ` : ''}{remainingMinutes}m
            </strong>
          </div>
          <span className="text-slate-600">|</span>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
            <span>Giới hạn:</span>
            <strong className="text-emerald-400 font-mono text-sm">
              {pcConfig.dailyLimitMinutes || 120}m
            </strong>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          <a
            href="/KidCare-Windows-Agent.bat"
            download="KidCare-Windows-Agent.bat"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-xs font-bold text-slate-200 transition cursor-pointer"
            title="Tải Windows Agent để khóa máy & tắt máy tự động"
          >
            <Download size={14} />
            <span className="hidden md:inline">Windows Agent</span>
          </a>

          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 transition cursor-pointer"
            title="Toàn màn hình"
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>

          <div className="flex items-center gap-2 pl-2 border-l border-slate-700">
            <img
              src={childProfile?.avatar || 'https://images.unsplash.com/photo-1543332164-6e82f355badc?w=100'}
              alt={childName}
              className="w-8 h-8 rounded-full object-cover border border-blue-400"
            />
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. STUDY MODE RIBBON BANNER (WHEN ACTIVE)                                  */}
      {/* ========================================================================= */}
      {pcConfig.isStudyMode && (
        <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 px-6 py-2.5 flex items-center justify-between text-white text-xs font-bold shadow-md">
          <div className="flex items-center gap-2.5">
            <span className="text-lg">📚</span>
            <span>
              CHẾ ĐỘ GÓC HỌC TẬP ĐANG BẬT: Toàn bộ Game và Mạng xã hội đang bị chặn để con tập trung làm bài tập!
            </span>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-indigo-950 text-[10px] font-black uppercase">
            Tập trung học
          </span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. MAIN DASHBOARD CONTENT                                                 */}
      {/* ========================================================================= */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 space-y-6">
        {/* Hero Study Banner */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-850 p-6 rounded-3xl border border-slate-700 shadow-xl relative overflow-hidden">
          <div className="relative z-10 max-w-2xl space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold">
              <ShieldCheck size={14} />
              <span>Thiết bị đang được bảo vệ an toàn bởi Bố Mẹ</span>
            </div>
            <h2 className="text-2xl font-black text-white">
              Chào mừng {childName} đến với Góc Học Tập & Sáng Tạo!
            </h2>
            <p className="text-sm text-slate-300">
              Hãy chọn website học tập hoặc phần mềm bên dưới để bắt đầu buổi học hiệu quả hôm nay nhé.
            </p>
          </div>
        </div>

        {/* Section 1: Study Whitelist Apps & Websites */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">📖</span>
              <h3 className="text-base font-black text-white">Trang Web Học Tập Được Phép</h3>
            </div>
            <span className="text-xs text-slate-400">Bấm để mở trực tiếp</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {STUDY_WEBSITES.map((site) => (
              <a
                key={site.domain}
                href={site.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setActiveWindow(site.name)}
                className="p-4 rounded-2xl bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-blue-500 transition-all group flex items-start justify-between cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-xl bg-slate-700/80 group-hover:bg-blue-600/20 text-2xl flex items-center justify-center transition shrink-0">
                    {site.icon}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white group-hover:text-blue-400 transition">
                      {site.name}
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">{site.desc}</p>
                    <span className="text-[11px] font-mono text-blue-400/80 mt-1 inline-block">
                      {site.domain}
                    </span>
                  </div>
                </div>
                <ExternalLink size={16} className="text-slate-500 group-hover:text-blue-400 transition" />
              </a>
            ))}
          </div>
        </div>

        {/* Section 2: Entertainment / Game Status (Blocked during study mode) */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">🎮</span>
              <h3 className="text-base font-black text-white">Quy Tắc Trò Chơi & Mạng Xã Hội</h3>
            </div>
            <span className="text-xs text-slate-400">Thiết lập từ máy bố mẹ</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { name: 'Roblox', icon: '🟥', exe: 'RobloxPlayerBeta.exe', isGame: true },
              { name: 'Minecraft', icon: '⛏️', exe: 'javaw.exe', isGame: true },
              { name: 'Liên Minh (LOL)', icon: '⚔️', exe: 'LeagueClient.exe', isGame: true },
              { name: 'Steam', icon: '💨', exe: 'steam.exe', isGame: true },
            ].map((game) => {
              const rule = pcConfig.blockedApps?.find((a) => a.processName.toLowerCase() === game.exe.toLowerCase());
              const isBlocked = pcConfig.isStudyMode || rule?.status === 'blocked';

              return (
                <div
                  key={game.name}
                  className={`p-3.5 rounded-2xl border text-center space-y-1.5 transition ${
                    isBlocked
                      ? 'bg-rose-950/30 border-rose-800/60 text-rose-300'
                      : 'bg-slate-800/80 border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="text-2xl">{game.icon}</div>
                  <div className="text-xs font-bold">{game.name}</div>
                  <div className={`text-[10px] font-black uppercase ${isBlocked ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {isBlocked ? '🚫 Bị Chặn' : '⏳ Cho phép có hẹn giờ'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* ========================================================================= */}
      {/* 4. IMPENETRABLE LOCK SCREEN OVERLAY (WHEN LOCKED)                          */}
      {/* ========================================================================= */}
      {pcConfig.isLocked && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
          <div className="max-w-md w-full space-y-5">
            {/* Pulsing Lock Icon */}
            <div className="w-24 h-24 mx-auto rounded-3xl bg-rose-500/20 border-2 border-rose-500/50 flex items-center justify-center text-rose-400 animate-pulse shadow-2xl shadow-rose-500/30">
              <Lock size={48} />
            </div>

            <div className="space-y-2">
              <span className="px-3 py-1 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-black uppercase tracking-widest">
                MÁY TÍNH ĐANG TẠM KHÓA
              </span>
              <h2 className="text-2xl font-black text-white tracking-tight">
                Đến giờ nghỉ ngơi rồi con ơi!
              </h2>
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-sm text-slate-300 font-medium">
                {pcConfig.lockReason || 'Bố mẹ đã tạm khóa máy tính. Con hãy đứng dậy vươn vai, uống nước và nghỉ mắt một chút nhé!'}
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={() => setShowRequestModal(true)}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold shadow-lg shadow-blue-500/20 transition cursor-pointer"
              >
                Xin phép Bố Mẹ thêm 15 phút 🙋
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. DESKTOP BROADCAST MESSAGE OVERLAY (POPUP FROM PARENTS)                  */}
      {/* ========================================================================= */}
      {broadcastOverlay && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-in zoom-in-95 duration-200">
          <div className="bg-gradient-to-br from-slate-900 to-indigo-950 border-2 border-purple-500/60 rounded-3xl p-6 max-w-lg w-full text-center space-y-4 shadow-2xl shadow-purple-500/30">
            <div className="text-5xl animate-bounce">{broadcastOverlay.sticker || '📢'}</div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-black text-white uppercase tracking-wide">
                {broadcastOverlay.title}
              </h3>
              <div className="p-4 rounded-2xl bg-white/10 text-base font-bold text-purple-100">
                "{broadcastOverlay.message}"
              </div>
            </div>

            <button
              onClick={() => setBroadcastOverlay(null)}
              className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl text-sm font-black tracking-wide shadow-lg shadow-purple-600/30 transition cursor-pointer"
            >
              Dạ con biết rồi ạ! 🙋
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. SHUTDOWN COUNTDOWN BANNER (REMOTE SHUTDOWN)                             */}
      {/* ========================================================================= */}
      {shutdownCountdown !== null && (
        <div className="fixed bottom-6 right-6 z-50 bg-rose-600 text-white px-5 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-rose-400 animate-bounce">
          <AlertTriangle size={24} className="shrink-0" />
          <div className="text-left">
            <div className="text-xs font-black uppercase">LỆNH TẮT MÁY TỪ BỐ MẸ</div>
            <div className="text-sm font-bold">
              Máy tính sẽ tự động tắt sau <strong className="font-mono text-base">{shutdownCountdown}</strong> giây!
            </div>
            <div className="text-[11px] text-rose-100">Vui lòng lưu tài liệu và bài tập ngay lập tức.</div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. REQUEST EXTENSION MODAL                                                */}
      {/* ========================================================================= */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="text-center space-y-1">
              <div className="text-3xl">💌</div>
              <h3 className="text-sm font-black text-white">Gửi lời nhắn xin mở máy</h3>
              <p className="text-xs text-slate-400">Bố mẹ sẽ nhận được thông báo tức thì trên điện thoại</p>
            </div>

            {requestSent ? (
              <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-2xl text-center space-y-2">
                <CheckCircle2 size={24} className="mx-auto text-emerald-400" />
                <p className="text-xs font-bold text-emerald-300">
                  Đã gửi yêu cầu đến điện thoại bố mẹ! Con đợi bố mẹ phê duyệt nhé.
                </p>
                <button
                  onClick={() => {
                    setShowRequestModal(false);
                    setRequestSent(false);
                  }}
                  className="mt-2 px-4 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
                >
                  Đóng
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <span className="text-xs text-slate-300 font-bold">Lý do xin thêm giờ:</span>
                  <div className="space-y-1">
                    {[
                      'Con đang làm nốt bài tập cô giáo giao 📚',
                      'Con chuẩn bị nộp bài trên SHub Classroom 📝',
                      'Con đang nghe giảng dở video bài học 📹',
                    ].map((reason) => (
                      <button
                        key={reason}
                        onClick={() => {
                          setRequestSent(true);
                        }}
                        className="w-full text-left p-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-xs font-medium text-slate-200 border border-slate-700/60 cursor-pointer"
                      >
                        {reason}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => setShowRequestModal(false)}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-750 text-slate-400 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Quay lại
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
