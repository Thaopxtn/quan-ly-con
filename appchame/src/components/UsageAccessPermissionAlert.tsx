import React, { useState } from 'react';
import { ShieldAlert, ArrowUpRight, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { useAppState, getActiveParentId } from '@shared/store';
import { sendRemoteCommandToKid } from '@shared/firebase/cloudSyncService';
import { haptics } from '@shared/utils/haptics';

interface UsageAccessPermissionAlertProps {
  childId?: string;
  compact?: boolean;
  className?: string;
}

export const UsageAccessPermissionAlert: React.FC<UsageAccessPermissionAlertProps> = ({
  childId,
  compact = false,
  className = '',
}) => {
  const { state } = useAppState();
  const [isSending, setIsSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  const targetChild = childId
    ? state.children.find((c) => c.id === childId) || state.child
    : state.child;

  if (!targetChild) return null;

  // Identify active device for this child
  const activeDev = targetChild.devices?.find(
    (d) => d.deviceId === targetChild.activeDeviceId
  ) || targetChild.devices?.[0];

  // Check if usage access permission is explicitly false or ungranted
  const rawPerm =
    activeDev?.hasUsageAccessPermission ??
    activeDev?.telemetry?.hasUsageAccessPermission ??
    targetChild.hasUsageAccessPermission;

  // Only show warning if the child has a paired mobile device and hasUsageAccessPermission is explicitly false
  // (or if we have telemetry from Android device but usage permission is not granted)
  const isPermissionMissing = rawPerm === false;

  if (!isPermissionMissing) {
    return null;
  }

  const handleRequestPermission = async () => {
    if (isSending) return;
    haptics.medium();
    setIsSending(true);

    try {
      const parentId = getActiveParentId() || 'yaDXFmTMcccQV6m53Rxtw4LOF303';
      await sendRemoteCommandToKid(
        parentId,
        targetChild.id,
        'request_usage_permission',
        {
          title: 'Cấp quyền truy cập thời gian sử dụng',
          description:
            'Bố mẹ yêu cầu bật Quyền truy cập dữ liệu sử dụng để theo dõi và bảo vệ thiết bị con an toàn.',
        },
        targetChild.name
      );

      setSentSuccess(true);
      setTimeout(() => setSentSuccess(false), 8000);
    } catch (err) {
      console.warn('Failed to send request_usage_permission command:', err);
    } finally {
      setIsSending(false);
    }
  };

  if (compact) {
    return (
      <div
        className={`bg-amber-50 border border-amber-200/80 rounded-2xl p-2.5 flex items-center justify-between gap-2 shadow-2xs animate-in fade-in duration-300 ${className}`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-xl bg-amber-500/15 text-amber-600 flex items-center justify-center shrink-0">
            <ShieldAlert size={16} />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-black text-amber-900 block truncate">
              Chưa cấp quyền theo dõi thời gian
            </span>
            <span className="text-[9.5px] text-amber-700/80 block truncate">
              Thời gian dùng app có thể chưa chuẩn
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleRequestPermission}
          disabled={isSending}
          className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white rounded-xl text-[10px] font-bold flex items-center gap-1 shadow-2xs transition cursor-pointer shrink-0 disabled:opacity-50"
        >
          {isSending ? (
            <Loader2 size={12} className="animate-spin" />
          ) : sentSuccess ? (
            <CheckCircle2 size={12} className="text-emerald-200" />
          ) : (
            <ArrowUpRight size={12} />
          )}
          <span>{sentSuccess ? 'Đã yêu cầu' : 'Yêu cầu quyền'}</span>
        </button>
      </div>
    );
  }

  return (
    <div
      className={`bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-orange-500/10 border-2 border-amber-400/60 rounded-3xl p-4 shadow-sm relative overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300 ${className}`}
    >
      {/* Decorative background glow */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-400/20 rounded-full blur-2xl pointer-events-none" />

      <div className="flex items-start gap-3 relative z-10">
        <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-500/20">
          <ShieldAlert size={22} strokeWidth={2.4} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h4 className="text-xs font-black text-amber-950 uppercase tracking-wider">
              Chưa Cấp Quyền Thời Gian Sử Dụng
            </h4>
            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-amber-200 text-amber-800">
              Yêu cầu Android
            </span>
          </div>

          <p className="text-[11px] text-amber-900/90 mt-1 leading-relaxed">
            Thiết bị của <strong>{targetChild.name}</strong> chưa bật{' '}
            <strong className="text-amber-950 underline decoration-amber-400">
              Quyền truy cập dữ liệu sử dụng (Usage Access)
            </strong>
            . Khi chưa cấp quyền, hệ thống không thể đếm chính xác số phút con dùng từng app
            hoặc kích hoạt khóa thông minh theo giới hạn.
          </p>

          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleRequestPermission}
              disabled={isSending}
              className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md transition-all duration-200 cursor-pointer active:scale-95 ${
                sentSuccess
                  ? 'bg-emerald-600 text-white shadow-emerald-600/20'
                  : 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20'
              }`}
            >
              {isSending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : sentSuccess ? (
                <CheckCircle2 size={14} />
              ) : (
                <Sparkles size={14} />
              )}
              <span>
                {isSending
                  ? 'Đang gửi yêu cầu đến máy con...'
                  : sentSuccess
                  ? 'Đã gửi lệnh! Đang mở Cài đặt máy con'
                  : 'Yêu cầu máy con cấp quyền ngay'}
              </span>
            </button>

            {sentSuccess && (
              <span className="text-[10px] text-emerald-700 font-bold animate-in fade-in">
                ✓ Màn hình Cài đặt cấp quyền đang tự động mở trên điện thoại của bé!
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
