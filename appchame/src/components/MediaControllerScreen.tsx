import React, { useState, useEffect } from "react";
import {
  ChevronLeft,
  Music,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Radio,
  Sparkles
} from "lucide-react";
import { useAppState } from "@shared/store";
import { MediaPlaybackState } from "@shared/types";

interface MediaControllerScreenProps {
  onBack?: () => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export const MediaControllerScreen: React.FC<MediaControllerScreenProps> = ({ onBack }) => {
  const { state, sendMediaCmd } = useAppState();
  const targetChildId = state.selectedChildId;
  const child = state.children.find((c) => c.id === targetChildId) || state.children[0] || state.child;
  const settings = state.childSettings[targetChildId];
  const media: MediaPlaybackState | undefined = settings?.mediaPlayback;

  const [localVolume, setLocalVolume] = useState(media?.volume ?? 65);
  const [seekPos, setSeekPos] = useState(media?.positionSeconds ?? 0);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2000);
  };

  useEffect(() => {
    if (media) {
      setLocalVolume(media.volume);
      setSeekPos(media.positionSeconds);
    }
  }, [media?.volume, media?.positionSeconds]);

  const progressPct =
    media && media.durationSeconds > 0 ? (seekPos / media.durationSeconds) * 100 : 0;

  return (
    <div className="flex-1 flex flex-col bg-slate-50 select-none pb-8 overflow-y-auto">
      {/* Top App Bar */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md px-4 py-3 border-b border-slate-100 flex items-center justify-between shadow-xs">
        <div className="flex items-center space-x-3">
          {onBack && (
            <button
              onClick={onBack}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition active:scale-95 cursor-pointer"
            >
              <ChevronLeft size={20} />
            </button>
          )}
          <div>
            <h1 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
              <span>Điều Khiển Media & Âm Nhạc</span>
              {media?.isPlaying && (
                <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                  <Radio size={10} className="animate-pulse text-purple-600" /> Đang phát
                </span>
              )}
            </h1>
            <p className="text-[11px] text-slate-500 font-medium">
              Thiết bị {child?.name || "Bé"} • Quản lý bài hát, âm lượng từ xa
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Trực tuyến</span>
        </div>
      </div>

      {/* Floating Toast */}
      {toastMsg && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-slate-900/90 text-white text-xs font-medium px-4 py-2 rounded-full shadow-lg backdrop-blur-md animate-in fade-in slide-in-from-top-2">
          {toastMsg}
        </div>
      )}

      <div className="p-4 space-y-4">
        {/* Main Player Card */}
        <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-5 shadow-lg relative overflow-hidden space-y-5">
          {/* Background glowing blur */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* App & Device Info Header */}
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full font-semibold flex items-center gap-1.5">
              <Music size={12} className="text-indigo-400" />
              <span>{media?.appName || "Trình phát nhạc"}</span>
            </span>
            <span className="text-[11px] text-slate-400 font-medium">
              {child?.name || "Bé"} đang nghe
            </span>
          </div>

          {/* Artwork & Track Info */}
          <div className="flex flex-col items-center justify-center py-2 space-y-4">
            <div className="relative group">
              <img
                src={media?.artUrl || "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop"}
                alt="Album Art"
                className={`w-44 h-44 rounded-3xl object-cover shadow-2xl border-2 border-white/10 transition-transform ${
                  media?.isPlaying ? "scale-100 rotate-1" : "scale-95 grayscale-20"
                }`}
                onError={(e) => {
                  e.currentTarget.src =
                    "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop";
                }}
              />
              {media?.isPlaying && (
                <div className="absolute inset-0 rounded-3xl ring-4 ring-indigo-400/30 animate-pulse pointer-events-none" />
              )}
            </div>

            <div className="text-center px-4 space-y-1">
              <h2 className="text-lg font-black text-white tracking-tight">
                {media?.trackTitle || "Không có bài hát"}
              </h2>
              <p className="text-xs text-indigo-200/80 font-medium">
                {media?.artist || "Nghệ sĩ"} • {media?.album || "Album"}
              </p>
            </div>
          </div>

          {/* Progress Seek Bar */}
          <div className="space-y-1.5 px-1">
            <div className="relative flex items-center">
              <input
                type="range"
                min={0}
                max={media?.durationSeconds || 100}
                value={seekPos}
                onChange={(e) => setSeekPos(Number(e.target.value))}
                onMouseUp={() => {
                  sendMediaCmd(targetChildId, "seek", seekPos);
                  showToast(`Đã tua đến ${formatTime(seekPos)}`);
                }}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-white/20 accent-indigo-400"
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 font-semibold px-0.5">
              <span>{formatTime(seekPos)}</span>
              <span>{formatTime(media?.durationSeconds || 0)}</span>
            </div>
          </div>

          {/* Playback Controls */}
          <div className="flex items-center justify-center gap-6 pt-1">
            <button
              onClick={() => {
                sendMediaCmd(targetChildId, "prev");
                showToast("Đã chuyển bài trước");
              }}
              className="w-11 h-11 rounded-2xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition active:scale-90 cursor-pointer"
              title="Bài trước"
            >
              <SkipBack size={18} />
            </button>

            <button
              onClick={() => {
                const nextState = !media?.isPlaying;
                sendMediaCmd(targetChildId, nextState ? "play" : "pause");
                showToast(nextState ? "Đã phát nhạc từ xa" : "Đã tạm dừng phát nhạc");
              }}
              className="w-14 h-14 rounded-3xl bg-indigo-500 hover:bg-indigo-600 flex items-center justify-center text-white shadow-xl shadow-indigo-500/40 transition active:scale-95 cursor-pointer"
              title={media?.isPlaying ? "Tạm dừng" : "Phát nhạc"}
            >
              {media?.isPlaying ? <Pause size={24} /> : <Play size={24} className="ml-0.5" />}
            </button>

            <button
              onClick={() => {
                sendMediaCmd(targetChildId, "next");
                showToast("Đã chuyển bài kế tiếp");
              }}
              className="w-11 h-11 rounded-2xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition active:scale-90 cursor-pointer"
              title="Bài tiếp theo"
            >
              <SkipForward size={18} />
            </button>
          </div>
        </div>

        {/* Remote Volume & Audio Safety Card */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Volume2 size={18} className="text-indigo-600" />
              <div>
                <h3 className="text-xs font-bold text-slate-900">Âm Lượng Thiết Bị Con</h3>
                <p className="text-[11px] text-slate-500 font-medium">Điều chỉnh từ xa và giới hạn an toàn thính giác</p>
              </div>
            </div>
            <span className="text-sm font-black text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-xl">
              {localVolume}%
            </span>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={() => {
                setLocalVolume(0);
                sendMediaCmd(targetChildId, "volume", 0);
                showToast("Đã tắt âm lượng từ xa");
              }}
              className="text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <VolumeX size={18} />
            </button>
            <input
              type="range"
              min={0}
              max={100}
              value={localVolume}
              onChange={(e) => setLocalVolume(Number(e.target.value))}
              onMouseUp={() => {
                sendMediaCmd(targetChildId, "volume", localVolume);
                showToast(`Âm lượng đặt mức ${localVolume}%`);
              }}
              className="flex-1 h-2 rounded-full appearance-none cursor-pointer bg-slate-100 accent-indigo-600"
            />
            <Volume2 size={18} className="text-slate-400" />
          </div>

          {/* Preset Buttons */}
          <div className="grid grid-cols-5 gap-1.5 pt-1">
            {[
              { label: "Mute", val: 0 },
              { label: "25%", val: 25 },
              { label: "50%", val: 50 },
              { label: "75%", val: 75 },
              { label: "100%", val: 100 },
            ].map((p) => (
              <button
                key={p.val}
                onClick={() => {
                  setLocalVolume(p.val);
                  sendMediaCmd(targetChildId, "volume", p.val);
                  showToast(`Đặt âm lượng: ${p.label}`);
                }}
                className={`py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  localVolume === p.val
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MediaControllerScreen;
