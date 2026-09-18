import React, { useState, useEffect, useRef } from "react";
import {
  ChevronLeft,
  Calendar,
  Clock,
  Timer,
  Plus,
  Trash2,
  CheckCircle2,
  Bell,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Tag
} from "lucide-react";
import { useAppState } from "@shared/store";
import { ChildAlarm, ChildTimer, ChildScheduleEvent } from "@shared/types";

interface ScheduleManagerScreenProps {
  onBack?: () => void;
}

const DAY_NAMES = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  study: { label: "📚 Học tập", color: "bg-blue-100 text-blue-800 border-blue-200" },
  activity: { label: "⚽ Thể thao", color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  medical: { label: "🏥 Y tế / Sức khỏe", color: "bg-rose-100 text-rose-800 border-rose-200" },
  family: { label: "👨‍👩‍👧 Gia đình", color: "bg-purple-100 text-purple-800 border-purple-200" },
  other: { label: "📌 Khác", color: "bg-slate-100 text-slate-800 border-slate-200" },
};

function formatSeconds(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
}

export const ScheduleManagerScreen: React.FC<ScheduleManagerScreenProps> = ({ onBack }) => {
  const {
    state,
    addAlarm,
    updateAlarm,
    deleteAlarm,
    addTimer,
    updateTimerState,
    deleteTimer,
    addScheduleEvent,
    updateScheduleEvent,
    deleteScheduleEvent,
  } = useAppState();

  const targetChildId = state.selectedChildId;
  const child = state.children.find((c) => c.id === targetChildId) || state.children[0] || state.child;
  const settings = state.childSettings[targetChildId];

  const alarms: ChildAlarm[] = settings?.alarms || [];
  const timers: ChildTimer[] = settings?.timers || [];
  const events: ChildScheduleEvent[] = settings?.scheduleEvents || [];

  const [tab, setTab] = useState<"schedule" | "alarm" | "timer">("schedule");
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  // Alarm form states
  const [showAlarmForm, setShowAlarmForm] = useState(false);
  const [alarmTime, setAlarmTime] = useState("06:30");
  const [alarmLabel, setAlarmLabel] = useState("");
  const [alarmDays, setAlarmDays] = useState<number[]>([1, 2, 3, 4, 5]);

  // Timer form states
  const [showTimerForm, setShowTimerForm] = useState(false);
  const [timerLabel, setTimerLabel] = useState("");
  const [timerM, setTimerM] = useState(15);
  const [timerH, setTimerH] = useState(0);

  // Schedule form states
  const [showEventForm, setShowEventForm] = useState(false);
  const [evtTitle, setEvtTitle] = useState("");
  const [evtDate, setEvtDate] = useState(new Date().toISOString().slice(0, 10));
  const [evtTime, setEvtTime] = useState("08:00");
  const [evtNote, setEvtNote] = useState("");
  const [evtCategory, setEvtCategory] = useState<"study" | "activity" | "medical" | "family" | "other">(
    "study"
  );
  const [evtColor, setEvtColor] = useState("#3b82f6");

  // Timer interval ticker
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    const runningTimer = timers.find((t) => t.isRunning && t.remainingSeconds > 0);
    if (runningTimer) {
      timerRef.current = setInterval(() => {
        const fresh = state.childSettings[targetChildId]?.timers || [];
        const t = fresh.find((x) => x.id === runningTimer.id);
        if (t && t.isRunning && t.remainingSeconds > 0) {
          updateTimerState(targetChildId, t.id, {
            remainingSeconds: t.remainingSeconds - 1,
            isRunning: t.remainingSeconds - 1 > 0,
          });
        }
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timers.map((t) => `${t.id}:${t.isRunning}:${t.remainingSeconds}`).join(",")]);

  const handleAddAlarm = () => {
    if (!alarmLabel.trim()) return;
    addAlarm(targetChildId, {
      label: alarmLabel.trim(),
      time: alarmTime,
      repeatDays: alarmDays,
      isEnabled: true,
    });
    setShowAlarmForm(false);
    setAlarmLabel("");
    showToast("Đã đồng bộ báo thức mới sang máy con!");
  };

  const handleAddTimer = () => {
    const total = timerH * 3600 + timerM * 60;
    if (total <= 0) return;
    addTimer(targetChildId, {
      label: timerLabel.trim() || `Hẹn giờ ${timerM} phút`,
      totalSeconds: total,
    });
    setShowTimerForm(false);
    setTimerLabel("");
    showToast("Đã thiết lập đồng hồ đếm ngược!");
  };

  const handleAddEvent = () => {
    if (!evtTitle.trim()) return;
    addScheduleEvent(targetChildId, {
      title: evtTitle.trim(),
      date: evtDate,
      time: evtTime,
      note: evtNote,
      color: evtColor,
      isCompleted: false,
      category: evtCategory,
    });
    setShowEventForm(false);
    setEvtTitle("");
    setEvtNote("");
    showToast("Đã thêm lịch sự kiện mới cho con!");
  };

  const today = new Date().toISOString().slice(0, 10);
  const sortedEvents = [...events].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

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
              <span>Lịch Trình, Báo Thức & Hẹn Giờ</span>
            </h1>
            <p className="text-[11px] text-slate-500 font-medium">
              Thiết bị {child?.name || "Bé"} • Đồng bộ chuông báo và thời gian biểu
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Đồng bộ</span>
        </div>
      </div>

      {/* Floating Toast */}
      {toastMsg && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-slate-900/90 text-white text-xs font-medium px-4 py-2 rounded-full shadow-lg backdrop-blur-md animate-in fade-in slide-in-from-top-2">
          {toastMsg}
        </div>
      )}

      <div className="p-4 space-y-4">
        {/* Navigation Tabs */}
        <div className="flex bg-slate-200/80 p-1 rounded-2xl text-xs font-bold">
          <button
            onClick={() => setTab("schedule")}
            className={`flex-1 py-1.5 rounded-xl transition cursor-pointer ${
              tab === "schedule" ? "bg-white text-blue-600 shadow-sm" : "text-slate-600"
            }`}
          >
            📅 Lịch Sự Kiện ({events.length})
          </button>
          <button
            onClick={() => setTab("alarm")}
            className={`flex-1 py-1.5 rounded-xl transition cursor-pointer ${
              tab === "alarm" ? "bg-white text-orange-600 shadow-sm" : "text-slate-600"
            }`}
          >
            ⏰ Báo Thức ({alarms.length})
          </button>
          <button
            onClick={() => setTab("timer")}
            className={`flex-1 py-1.5 rounded-xl transition cursor-pointer ${
              tab === "timer" ? "bg-white text-emerald-600 shadow-sm" : "text-slate-600"
            }`}
          >
            ⏱️ Hẹn Giờ ({timers.length})
          </button>
        </div>

        {/* ─── TAB 1: SCHEDULE ─────────────────────────────────── */}
        {tab === "schedule" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider px-1">
                Thời Khóa Biểu & Sự Kiện:
              </span>
              <button
                onClick={() => setShowEventForm(!showEventForm)}
                className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer shadow-xs"
              >
                <Plus size={14} />
                <span>{showEventForm ? "Đóng form" : "Thêm sự kiện"}</span>
              </button>
            </div>

            {showEventForm && (
              <div className="bg-white rounded-2xl p-4 border border-blue-200 shadow-sm space-y-3 animate-in fade-in">
                <h4 className="text-xs font-bold text-blue-800">Thêm Sự Kiện / Lịch Trình Mới</h4>
                <input
                  type="text"
                  placeholder="Tiêu đề (VD: Kiểm tra Toán, Học bơi...)"
                  value={evtTitle}
                  onChange={(e) => setEvtTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">Ngày diễn ra:</label>
                    <input
                      type="date"
                      value={evtDate}
                      onChange={(e) => setEvtDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">Giờ bắt đầu:</label>
                    <input
                      type="time"
                      value={evtTime}
                      onChange={(e) => setEvtTime(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">Phân loại sự kiện:</label>
                  <select
                    value={evtCategory}
                    onChange={(e) => setEvtCategory(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 font-medium"
                  >
                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </div>

                <input
                  type="text"
                  placeholder="Ghi chú thêm (VD: Mang đồ bơi, chuẩn bị bút mực...)"
                  value={evtNote}
                  onChange={(e) => setEvtNote(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 font-medium"
                />

                <button
                  onClick={handleAddEvent}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition active:scale-98 cursor-pointer shadow-xs"
                >
                  Xác Nhận Lưu Lịch Trình
                </button>
              </div>
            )}

            {sortedEvents.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center border border-slate-100 shadow-xs space-y-1">
                <Calendar size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="text-xs font-bold text-slate-700">Chưa có lịch trình nào</p>
                <p className="text-[11px] text-slate-400">Bấm "Thêm sự kiện" để đặt lịch học tập cho con</p>
              </div>
            ) : (
              sortedEvents.map((evt, idx) => (
                <div
                  key={`${evt.id}-${idx}`}
                  className={`p-3.5 bg-white rounded-2xl border transition shadow-xs flex items-start justify-between ${
                    evt.isCompleted ? "opacity-60 border-slate-100" : "border-slate-100 hover:border-blue-200"
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div
                      className="w-2.5 self-stretch rounded-full shrink-0"
                      style={{ backgroundColor: evt.color || "#3b82f6" }}
                    />
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <h4
                          className={`text-xs font-bold ${
                            evt.isCompleted ? "line-through text-slate-500" : "text-slate-900"
                          }`}
                        >
                          {evt.title}
                        </h4>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded font-bold border ${
                            CATEGORY_LABELS[evt.category]?.color || "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {CATEGORY_LABELS[evt.category]?.label || "Sự kiện"}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium">
                        {evt.date === today ? "Hôm nay" : evt.date} • lúc {evt.time}
                      </p>
                      {evt.note && <p className="text-[11px] text-slate-400">{evt.note}</p>}
                    </div>
                  </div>

                  <div className="flex items-center space-x-1 shrink-0 ml-2">
                    <button
                      onClick={() =>
                        updateScheduleEvent(targetChildId, evt.id, { isCompleted: !evt.isCompleted })
                      }
                      className={`p-1.5 rounded-xl border transition active:scale-90 cursor-pointer ${
                        evt.isCompleted
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                      }`}
                      title={evt.isCompleted ? "Đánh dấu chưa xong" : "Đã hoàn thành"}
                    >
                      <CheckCircle2 size={16} />
                    </button>
                    <button
                      onClick={() => deleteScheduleEvent(targetChildId, evt.id)}
                      className="p-1.5 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 transition active:scale-90 cursor-pointer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ─── TAB 2: ALARM ────────────────────────────────────── */}
        {tab === "alarm" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider px-1">
                Báo Thức Trực Tiếp Thiết Bị Con:
              </span>
              <button
                onClick={() => setShowAlarmForm(!showAlarmForm)}
                className="flex items-center space-x-1 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer shadow-xs"
              >
                <Plus size={14} />
                <span>{showAlarmForm ? "Đóng form" : "Đặt báo thức"}</span>
              </button>
            </div>

            {showAlarmForm && (
              <div className="bg-white rounded-2xl p-4 border border-orange-200 shadow-sm space-y-3 animate-in fade-in">
                <h4 className="text-xs font-bold text-orange-800">Cài Đặt Báo Thức Mới</h4>
                <div className="flex items-center justify-center py-2">
                  <input
                    type="time"
                    value={alarmTime}
                    onChange={(e) => setAlarmTime(e.target.value)}
                    className="text-3xl font-black text-slate-900 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-200 focus:bg-white text-center"
                  />
                </div>

                <input
                  type="text"
                  placeholder="Nhãn báo thức (VD: Dậy đi học, Giờ uống sữa...)"
                  value={alarmLabel}
                  onChange={(e) => setAlarmLabel(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white font-medium"
                />

                <div>
                  <span className="text-[10px] font-bold text-slate-500 block mb-1.5">Lặp lại các thứ:</span>
                  <div className="grid grid-cols-7 gap-1">
                    {DAY_NAMES.map((name, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() =>
                          setAlarmDays(
                            alarmDays.includes(i)
                              ? alarmDays.filter((x) => x !== i)
                              : [...alarmDays, i]
                          )
                        }
                        className={`py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                          alarmDays.includes(i)
                            ? "bg-orange-500 text-white shadow-xs"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleAddAlarm}
                  className="w-full py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition active:scale-98 cursor-pointer shadow-xs"
                >
                  Xác Nhận Lưu Báo Thức
                </button>
              </div>
            )}

            {alarms.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center border border-slate-100 shadow-xs space-y-1">
                <Bell size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="text-xs font-bold text-slate-700">Chưa có báo thức nào</p>
                <p className="text-[11px] text-slate-400">Bấm "Đặt báo thức" để tạo lịch nhắc nhở</p>
              </div>
            ) : (
              alarms.map((alarm, idx) => (
                <div
                  key={`${alarm.id}-${idx}`}
                  className="p-4 bg-white rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3.5">
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                        alarm.isEnabled ? "bg-orange-100 text-orange-600" : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      <Bell size={22} className={alarm.isEnabled ? "animate-wiggle" : ""} />
                    </div>
                    <div>
                      <h3
                        className={`text-xl font-black ${
                          alarm.isEnabled ? "text-slate-900" : "text-slate-400"
                        }`}
                      >
                        {alarm.time}
                      </h3>
                      <p className="text-xs font-bold text-slate-600 mt-0.5">{alarm.label}</p>
                      <p className="text-[10px] text-slate-400">
                        {alarm.repeatDays.length === 7
                          ? "Hàng ngày"
                          : alarm.repeatDays.length === 0
                          ? "Một lần"
                          : `Các thứ: ${DAY_NAMES.filter((_, i) => alarm.repeatDays.includes(i)).join(", ")}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() =>
                        updateAlarm(targetChildId, alarm.id, { isEnabled: !alarm.isEnabled })
                      }
                      className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                        alarm.isEnabled ? "bg-orange-500" : "bg-slate-200"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${
                          alarm.isEnabled ? "right-0.5" : "left-0.5"
                        }`}
                      />
                    </button>
                    <button
                      onClick={() => deleteAlarm(targetChildId, alarm.id)}
                      className="p-1.5 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 transition active:scale-90 cursor-pointer ml-1"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ─── TAB 3: TIMER ────────────────────────────────────── */}
        {tab === "timer" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider px-1">
                Đồng Hồ Đếm Ngược Từ Xa:
              </span>
              <button
                onClick={() => setShowTimerForm(!showTimerForm)}
                className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer shadow-xs"
              >
                <Plus size={14} />
                <span>{showTimerForm ? "Đóng form" : "Thêm hẹn giờ"}</span>
              </button>
            </div>

            {showTimerForm && (
              <div className="bg-white rounded-2xl p-4 border border-emerald-200 shadow-sm space-y-3 animate-in fade-in">
                <h4 className="text-xs font-bold text-emerald-800">Thiết Lập Thời Gian Hẹn Giờ</h4>
                <input
                  type="text"
                  placeholder="Tên hẹn giờ (VD: Đọc sách, Nghỉ ngơi giải lao...)"
                  value={timerLabel}
                  onChange={(e) => setTimerLabel(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white font-medium"
                />

                <div className="flex items-center justify-center gap-3 py-2">
                  <div className="text-center">
                    <span className="text-[10px] text-slate-400 font-bold block mb-1">Giờ</span>
                    <input
                      type="number"
                      min={0}
                      max={23}
                      value={timerH}
                      onChange={(e) => setTimerH(Number(e.target.value))}
                      className="w-16 py-2 text-xl font-black text-center bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>
                  <span className="text-xl font-bold text-slate-400 mt-4">:</span>
                  <div className="text-center">
                    <span className="text-[10px] text-slate-400 font-bold block mb-1">Phút</span>
                    <input
                      type="number"
                      min={1}
                      max={59}
                      value={timerM}
                      onChange={(e) => setTimerM(Number(e.target.value))}
                      className="w-16 py-2 text-xl font-black text-center bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-1.5">
                  {[5, 15, 30, 45].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => {
                        setTimerH(0);
                        setTimerM(mins);
                      }}
                      className="py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                    >
                      {mins} phút
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleAddTimer}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition active:scale-98 cursor-pointer shadow-xs"
                >
                  Bắt Đầu Hẹn Giờ Máy Con
                </button>
              </div>
            )}

            {timers.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center border border-slate-100 shadow-xs space-y-1">
                <Timer size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="text-xs font-bold text-slate-700">Chưa có đồng hồ hẹn giờ</p>
                <p className="text-[11px] text-slate-400">Hẹn giờ đếm ngược cho các hoạt động của con</p>
              </div>
            ) : (
              timers.map((timer, idx) => {
                const pct =
                  timer.totalSeconds > 0
                    ? Math.min(100, Math.max(0, (timer.remainingSeconds / timer.totalSeconds) * 100))
                    : 0;

                return (
                  <div
                    key={`${timer.id}-${idx}`}
                    className="p-4 bg-white rounded-2xl border border-slate-100 shadow-xs space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                            timer.isRunning
                              ? "bg-emerald-100 text-emerald-700 animate-pulse"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          <Timer size={22} />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">{timer.label}</h4>
                          <p className="text-2xl font-black text-emerald-600 tracking-tight mt-0.5">
                            {formatSeconds(timer.remainingSeconds)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1.5">
                        <button
                          onClick={() =>
                            updateTimerState(targetChildId, timer.id, { isRunning: !timer.isRunning })
                          }
                          className={`p-2 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer shadow-xs flex items-center gap-1 ${
                            timer.isRunning
                              ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                              : "bg-emerald-600 text-white hover:bg-emerald-700"
                          }`}
                        >
                          {timer.isRunning ? <Pause size={15} /> : <Play size={15} />}
                        </button>
                        <button
                          onClick={() =>
                            updateTimerState(targetChildId, timer.id, {
                              remainingSeconds: timer.totalSeconds,
                              isRunning: false,
                            })
                          }
                          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition active:scale-95 cursor-pointer"
                          title="Đặt lại"
                        >
                          <RotateCcw size={15} />
                        </button>
                        <button
                          onClick={() => deleteTimer(targetChildId, timer.id)}
                          className="p-2 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 transition active:scale-90 cursor-pointer"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ScheduleManagerScreen;
