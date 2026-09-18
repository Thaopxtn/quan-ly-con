import React, { useState } from "react";
import { ChevronLeft, Bell, Trash2, CheckCheck, Filter } from "lucide-react";
import { useAppState } from "@shared/store";
import { ChildNotification } from "@shared/types";

interface NotificationCenterScreenProps {
  onBack?: () => void;
}

export const NotificationCenterScreen: React.FC<NotificationCenterScreenProps> = ({ onBack }) => {
  const { state, markNotificationRead, markAllNotificationsRead, clearAllNotifications } = useAppState();
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [appFilter, setAppFilter] = useState<string>("all");

  const targetChildId = state.selectedChildId;
  const child = state.children.find((c) => c.id === targetChildId) || state.children[0] || state.child;
  const settings = state.childSettings[targetChildId];
  const notifications: ChildNotification[] = settings?.notifications || [];

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const appNames = Array.from(new Set(notifications.map((n) => n.appName)));

  const filtered = notifications.filter((n) => {
    if (filter === "unread" && n.isRead) return false;
    if (appFilter !== "all" && n.appName !== appFilter) return false;
    return true;
  });

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
              <span>Nhật Ký Thông Báo Máy Con</span>
              {unreadCount > 0 && (
                <span className="text-[10px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                  <Bell size={10} className="fill-rose-500 text-rose-500" /> {unreadCount} mới
                </span>
              )}
            </h1>
            <p className="text-[11px] text-slate-500 font-medium">
              Thiết bị {child?.name || "Bé"} • Đồng bộ tin nhắn & thông báo ứng dụng
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Trực tuyến</span>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* Actions & Filters */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Filter size={15} className="text-slate-400" />
              <span className="text-xs font-bold text-slate-700">Bộ lọc thông báo:</span>
            </div>
            <div className="flex items-center space-x-2">
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllNotificationsRead(targetChildId)}
                  className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold transition active:scale-95 cursor-pointer"
                >
                  <CheckCheck size={13} />
                  <span>Đọc tất cả</span>
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={() => clearAllNotifications(targetChildId)}
                  className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold transition active:scale-95 cursor-pointer"
                >
                  <Trash2 size={13} />
                  <span>Xóa hết</span>
                </button>
              )}
            </div>
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            <button
              onClick={() => setFilter("all")}
              className={`text-xs px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                filter === "all"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Tất cả ({notifications.length})
            </button>
            <button
              onClick={() => setFilter("unread")}
              className={`text-xs px-3 py-1.5 rounded-xl font-bold transition cursor-pointer flex items-center gap-1 ${
                filter === "unread"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <span>Chưa đọc</span>
              {unreadCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] flex items-center justify-center font-black">
                  {unreadCount}
                </span>
              )}
            </button>

            {appNames.map((app) => (
              <button
                key={app}
                onClick={() => setAppFilter(appFilter === app ? "all" : app)}
                className={`text-xs px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                  appFilter === app
                    ? "bg-slate-800 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {app}
              </button>
            ))}
          </div>
        </div>

        {/* Notifications List */}
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-slate-100 shadow-xs space-y-2">
              <span className="text-4xl block">🔔</span>
              <p className="text-sm font-bold text-slate-700">Không có thông báo nào</p>
              <p className="text-xs text-slate-400">
                {filter === "unread" ? "Tất cả các thông báo đã được xem." : "Máy con chưa nhận thông báo mới nào."}
              </p>
            </div>
          ) : (
            filtered.map((notif, idx) => (
              <div
                key={`${notif.id}-${idx}`}
                onClick={() => markNotificationRead(targetChildId, notif.id)}
                className={`p-3.5 rounded-2xl border transition active:scale-[0.99] cursor-pointer flex items-start space-x-3.5 ${
                  notif.isRead
                    ? "bg-white border-slate-100 opacity-80 hover:opacity-100"
                    : "bg-indigo-50/40 border-indigo-200 shadow-xs hover:bg-indigo-50/70"
                }`}
              >
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl shrink-0 ${
                    notif.isRead ? "bg-slate-100 text-slate-600" : "bg-indigo-100 text-indigo-700 shadow-xs"
                  }`}
                >
                  {notif.appIcon}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span className="text-xs font-bold text-indigo-700 uppercase tracking-wide">
                      {notif.appName}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-400 font-medium">{notif.time}</span>
                      {!notif.isRead && (
                        <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0 animate-pulse"></span>
                      )}
                    </div>
                  </div>

                  <p
                    className={`text-xs font-bold truncate ${
                      notif.isRead ? "text-slate-800" : "text-slate-900 font-black"
                    }`}
                  >
                    {notif.title}
                  </p>
                  <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5 leading-relaxed">
                    {notif.body}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationCenterScreen;
