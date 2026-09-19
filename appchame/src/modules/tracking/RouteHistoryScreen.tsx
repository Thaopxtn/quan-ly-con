import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronLeft,
  Calendar,
  Play,
  Pause,
  MapPin,
  Clock,
  RotateCcw,
  SkipBack,
  SkipForward,
  Navigation,
  Gauge,
  Activity,
  Footprints,
  Bus,
  Bike,
  Car,
  Coffee
} from 'lucide-react';
import { useAppState, getActiveParentId } from '@shared/store';
import { InteractiveMap } from '@shared/components/InteractiveMap';
import { MOCK_ROUTES_BY_DAY, INITIAL_ROUTE } from '@shared/mockData';
import { RoutePoint } from '@shared/types';
import { subscribeChildRouteHistoryFromCloud } from '@shared/firebase/cloudSyncService';
import { getCurrentParentAccount } from '@shared/firebase/firebaseService';

interface RouteHistoryScreenProps {
  onBack: () => void;
}

type DayFilter = 'today' | 'yesterday' | 'twoDaysAgo';

export const RouteHistoryScreen: React.FC<RouteHistoryScreenProps> = ({ onBack }) => {
  const { state } = useAppState();
  const { child: currentChild, selectedChildId, routeHistory } = state;

  const [selectedDay, setSelectedDay] = useState<DayFilter>('today');
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 2 | 5>(1);
  const [progress, setProgress] = useState(0); // 0 to 100
  const [selectedPointIndex, setSelectedPointIndex] = useState(0);
  const [cloudRoutePoints, setCloudRoutePoints] = useState<RoutePoint[]>([]);

  // Subscribe to real cloud route history
  useEffect(() => {
    const parentId = getActiveParentId();
    const childId = selectedChildId || currentChild?.id;

    if (parentId && childId) {
      const unsub = subscribeChildRouteHistoryFromCloud(
        parentId,
        childId,
        (points) => {
          if (points && points.length > 0) {
            setCloudRoutePoints(points);
          }
        },
        currentChild?.name
      );
      return () => unsub();
    }
  }, [selectedChildId, currentChild?.id, currentChild?.name]);

  // Get active route points based on selected day (Real cloud points prioritized for today)
  const activeRoutePoints: RoutePoint[] =
    selectedDay === 'today'
      ? (cloudRoutePoints.length > 0 ? cloudRoutePoints : (routeHistory.length > 0 ? routeHistory : INITIAL_ROUTE))
      : (MOCK_ROUTES_BY_DAY[selectedDay] || INITIAL_ROUTE);

  // Playback timer
  useEffect(() => {
    let timer: any;
    if (isPlaying) {
      const intervalMs = 120 / playbackSpeed;
      timer = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            setIsPlaying(false);
            return 100;
          }
          const next = prev + 1;
          // Update selected point index based on progress
          const totalPoints = activeRoutePoints.length;
          if (totalPoints > 1) {
            const calculatedIdx = Math.min(
              Math.floor((next / 100) * (totalPoints - 1)),
              totalPoints - 1
            );
            setSelectedPointIndex(calculatedIdx);
          }
          return next;
        });
      }, intervalMs);
    }
    return () => clearInterval(timer);
  }, [isPlaying, playbackSpeed, activeRoutePoints.length]);

  // Reset playback when switching day
  const handleSelectDay = (day: DayFilter) => {
    setSelectedDay(day);
    setIsPlaying(false);
    setProgress(0);
    setSelectedPointIndex(0);
  };

  const togglePlayback = () => {
    if (progress >= 100) {
      setProgress(0);
      setSelectedPointIndex(0);
      setIsPlaying(true);
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setProgress(val);
    const totalPoints = activeRoutePoints.length;
    if (totalPoints > 1) {
      const calculatedIdx = Math.min(
        Math.floor((val / 100) * (totalPoints - 1)),
        totalPoints - 1
      );
      setSelectedPointIndex(calculatedIdx);
    }
  };

  const handleJumpPoint = (index: number) => {
    setSelectedPointIndex(index);
    if (activeRoutePoints.length > 1) {
      const newProg = (index / (activeRoutePoints.length - 1)) * 100;
      setProgress(newProg);
    }
  };

  const handleStepForward = () => {
    const nextIdx = Math.min(selectedPointIndex + 1, activeRoutePoints.length - 1);
    handleJumpPoint(nextIdx);
  };

  const handleStepBack = () => {
    const prevIdx = Math.max(selectedPointIndex - 1, 0);
    handleJumpPoint(prevIdx);
  };

  const cyclePlaybackSpeed = () => {
    if (playbackSpeed === 1) setPlaybackSpeed(2);
    else if (playbackSpeed === 2) setPlaybackSpeed(5);
    else setPlaybackSpeed(1);
  };

  // Helper transport icon
  const getTransportIcon = (transport?: string) => {
    switch (transport) {
      case 'walk':
        return <Footprints size={12} className="text-emerald-500" />;
      case 'bike':
        return <Bike size={12} className="text-blue-500" />;
      case 'bus':
        return <Bus size={12} className="text-purple-500" />;
      case 'car':
        return <Car size={12} className="text-indigo-500" />;
      default:
        return <Coffee size={12} className="text-amber-500" />;
    }
  };

  // Route statistics calculation
  const totalDistanceKm = selectedDay === 'today' ? 8.6 : selectedDay === 'yesterday' ? 6.2 : 11.4;
  const totalTravelTime = selectedDay === 'today' ? '1 giờ 25 phút' : selectedDay === 'yesterday' ? '55 phút' : '1 giờ 45 phút';
  const maxSpeedKmH = selectedDay === 'today' ? 32 : selectedDay === 'yesterday' ? 24 : 45;

  return (
    <div className="flex-1 flex flex-col bg-slate-50 select-none pb-6 overflow-y-auto">
      {/* Header */}
      <div className="bg-white px-4 py-3 border-b border-slate-100 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition cursor-pointer"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-base font-bold text-slate-800">Lịch sử di chuyển</h2>
              {cloudRoutePoints.length > 0 && selectedDay === 'today' && (
                <span className="text-[9px] bg-emerald-100 text-emerald-700 font-extrabold px-1.5 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Đám mây
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 font-medium">Theo dõi hành trình chi tiết của con</p>
          </div>
        </div>

        {/* Day Selector Pills */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-xl text-[11px] font-bold">
          <button
            onClick={() => handleSelectDay('today')}
            className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
              selectedDay === 'today' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Hôm nay
          </button>
          <button
            onClick={() => handleSelectDay('yesterday')}
            className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
              selectedDay === 'yesterday' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Hôm qua
          </button>
          <button
            onClick={() => handleSelectDay('twoDaysAgo')}
            className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
              selectedDay === 'twoDaysAgo' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            2 ngày trước
          </button>
        </div>
      </div>

      {/* Route Map */}
      <div className="p-3">
        <InteractiveMap
          routePoints={activeRoutePoints}
          isPlayingRoute={isPlaying}
          playbackProgress={progress}
          activePointIndex={selectedPointIndex}
          onSelectPoint={handleJumpPoint}
          centerLat={activeRoutePoints[selectedPointIndex]?.lat || currentChild.lat}
          centerLng={activeRoutePoints[selectedPointIndex]?.lng || currentChild.lng}
          childAddress={activeRoutePoints[selectedPointIndex]?.address || currentChild.currentAddress}
          childName={currentChild.name}
          childAvatar={currentChild.avatar}
          className="h-60"
        />
      </div>

      {/* Interactive Playback Scrubber Card */}
      <div className="mx-3 bg-white rounded-2xl p-3 border border-slate-100 shadow-xs space-y-2">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="text-slate-700 flex items-center gap-1.5">
            <Activity size={14} className="text-blue-600" />
            <span>Tua lại hành trình</span>
          </span>
          <span className="text-[11px] font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
            {activeRoutePoints[selectedPointIndex]?.time || '00:00'} • Điểm {selectedPointIndex + 1}/{activeRoutePoints.length}
          </span>
        </div>

        {/* Scrubber Range Slider */}
        <div className="flex items-center space-x-2">
          <input
            type="range"
            min={0}
            max={100}
            value={progress}
            onChange={handleSeek}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
        </div>

        {/* Playback Controls Row */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center space-x-1.5">
            <button
              onClick={handleStepBack}
              disabled={selectedPointIndex === 0}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 transition cursor-pointer"
              title="Điểm dừng trước"
            >
              <SkipBack size={16} />
            </button>

            <button
              onClick={togglePlayback}
              className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center space-x-1.5 shadow-sm transition active:scale-95 cursor-pointer ${
                isPlaying
                  ? 'bg-amber-500 hover:bg-amber-600 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {isPlaying ? (
                <>
                  <Pause size={14} />
                  <span>Tạm dừng</span>
                </>
              ) : (
                <>
                  <Play size={14} className="fill-current" />
                  <span>{progress >= 100 ? 'Xem lại từ đầu' : 'Phát lại'}</span>
                </>
              )}
            </button>

            <button
              onClick={handleStepForward}
              disabled={selectedPointIndex === activeRoutePoints.length - 1}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 transition cursor-pointer"
              title="Điểm dừng tiếp theo"
            >
              <SkipForward size={16} />
            </button>
          </div>

          {/* Speed Multiplier Button */}
          <button
            onClick={cyclePlaybackSpeed}
            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition cursor-pointer"
            title="Tốc độ tua lại"
          >
            {playbackSpeed}x
          </button>
        </div>
      </div>

      {/* Summary Statistics Card */}
      <div className="grid grid-cols-4 gap-2 px-3 pt-3">
        <div className="bg-white rounded-2xl p-2.5 border border-slate-100 text-center">
          <span className="text-[10px] text-slate-400 font-bold uppercase">Quãng đường</span>
          <p className="text-xs font-black text-slate-900 mt-0.5">{totalDistanceKm} km</p>
        </div>
        <div className="bg-white rounded-2xl p-2.5 border border-slate-100 text-center">
          <span className="text-[10px] text-slate-400 font-bold uppercase">Thời gian</span>
          <p className="text-xs font-black text-slate-900 mt-0.5">{totalTravelTime}</p>
        </div>
        <div className="bg-white rounded-2xl p-2.5 border border-slate-100 text-center">
          <span className="text-[10px] text-slate-400 font-bold uppercase">Tốc độ max</span>
          <p className="text-xs font-black text-slate-900 mt-0.5">{maxSpeedKmH} km/h</p>
        </div>
        <div className="bg-white rounded-2xl p-2.5 border border-slate-100 text-center">
          <span className="text-[10px] text-slate-400 font-bold uppercase">Điểm dừng</span>
          <p className="text-xs font-black text-slate-900 mt-0.5">{activeRoutePoints.length} trạm</p>
        </div>
      </div>

      {/* Waypoints Timeline List */}
      <div className="flex-1 px-3 pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-800">Chi tiết từng chặng di chuyển</h3>
          <span className="text-[11px] text-blue-600 font-semibold">Chạm vào điểm để xem</span>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-soft border border-slate-100">
          <div className="relative pl-6 space-y-6">
            {/* Connecting Vertical Line */}
            <div className="absolute left-2.5 top-3 bottom-3 w-0.5 bg-gradient-to-b from-emerald-500 via-blue-500 to-indigo-500"></div>

            {activeRoutePoints.map((point, index) => {
              const isStart = index === 0;
              const isEnd = index === activeRoutePoints.length - 1;
              const isSelected = index === selectedPointIndex;

              return (
                <div
                  key={point.id || index}
                  onClick={() => handleJumpPoint(index)}
                  className={`relative flex items-start space-x-3 p-2 rounded-xl transition cursor-pointer ${
                    isSelected ? 'bg-blue-50/70 ring-1 ring-blue-300' : 'hover:bg-slate-50'
                  }`}
                >
                  {/* Waypoint circle dot */}
                  <div
                    className={`absolute -left-6 top-3 w-5 h-5 rounded-full border-2 border-white shadow-sm flex items-center justify-center ${
                      isStart
                        ? 'bg-emerald-500'
                        : isEnd
                        ? 'bg-indigo-600'
                        : 'bg-blue-500'
                    } ${isSelected ? 'scale-125 ring-2 ring-blue-400' : ''}`}
                  >
                    <span className="text-[9px] font-bold text-white leading-none">{index + 1}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-black text-slate-900">{point.time}</span>
                        <span className="text-xs font-bold text-slate-800 truncate">{point.title}</span>
                      </div>
                      {point.duration && (
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium shrink-0">
                          {point.duration}
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-500 mt-0.5 truncate">{point.address}</p>

                    <div className="flex items-center space-x-3 mt-1 text-[10px] text-slate-400">
                      <span className="flex items-center space-x-1">
                        {getTransportIcon(point.transport)}
                        <span className="capitalize">{point.transport === 'walk' ? 'Đi bộ' : point.transport === 'bike' ? 'Xe máy/đạp' : point.transport === 'bus' ? 'Xe buýt' : point.transport === 'car' ? 'Ô tô' : 'Tại chỗ'}</span>
                      </span>
                      {point.speed !== undefined && point.speed > 0 && (
                        <span>Tốc độ: {point.speed} km/h</span>
                      )}
                      {point.battery !== undefined && (
                        <span>Pin: {point.battery}%</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
