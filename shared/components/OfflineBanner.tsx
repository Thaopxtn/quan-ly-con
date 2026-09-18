import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

export const OfflineBanner: React.FC = () => {
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
      const timer = setTimeout(() => setShowReconnected(false), 2500);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline && !showReconnected) return null;

  return (
    <div
      className={`fixed top-0 inset-x-0 z-[99] px-4 py-1.5 text-[11px] font-bold text-white flex items-center justify-center gap-1.5 shadow-md transition-all duration-300 ${
        isOnline ? 'bg-emerald-600 animate-in slide-in-from-top duration-300' : 'bg-amber-600 animate-in slide-in-from-top duration-300'
      }`}
    >
      {isOnline ? (
        <>
          <Wifi size={13} className="shrink-0" />
          <span>Đã khôi phục kết nối đám mây</span>
        </>
      ) : (
        <>
          <WifiOff size={13} className="shrink-0 animate-pulse" />
          <span>Đang ngoại tuyến • Dữ liệu được lưu trữ và sẽ tự động đồng bộ khi có mạng</span>
        </>
      )}
    </div>
  );
};
