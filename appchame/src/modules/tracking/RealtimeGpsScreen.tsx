import React, { useState, useEffect, useMemo } from 'react';
import {
  ChevronLeft,
  BatteryCharging,
  Gauge,
  History,
  Shield,
  Navigation2,
  RefreshCw,
  PhoneCall,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  Volume2,
  Smartphone,
  CheckCircle2,
  Radio,
  Users,
  MapPin,
  Eye,
  Grid,
  Map as MapIcon,
  Sparkles
} from 'lucide-react';
import { useAppState, getActiveParentId } from '@shared/store';
import { InteractiveMap, MapChildItem } from '@shared/components/InteractiveMap';
import { subscribeChildTelemetryFromCloud, sendRemoteCommandToKid } from '@shared/firebase/cloudSyncService';
import { ChildDeviceInfo, ChildProfile } from '@shared/types';
import { haptics } from '@shared/utils/haptics';
import { makePhoneCall } from '@shared/utils/phoneCall';

interface RealtimeGpsScreenProps {
  onBack: () => void;
  onNavigate: (screenKey: string) => void;
}

export interface EnrichedChildProfile extends ChildProfile {
  address: string;
  inZoneName: string | null;
  nearestZoneName: string | null;
  hasValidNearestZone: boolean;
  formattedDistance: string;
}

// Haversine distance in meters
function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

export const RealtimeGpsScreen: React.FC<RealtimeGpsScreenProps> = ({ onBack, onNavigate }) => {
  const { state, buzzKidPhone, switchActiveChildDevice, switchChild, setTrackingCollectionConfig } = useAppState();
  const { children, selectedChildId, child, safeZones, childSettings } = state;

  // View mode: 'all' (track all children together) or 'single' (focused tracking)
  const [viewMode, setViewMode] = useState<'all' | 'single'>(children.length > 1 ? 'all' : 'single');
  // Layout in 'all' mode: 'panorama' (1 map + list) or 'multimap' (grid of live maps)
  const [allLayoutMode, setAllLayoutMode] = useState<'panorama' | 'multimap'>('panorama');
  const [focusedChildId, setFocusedChildId] = useState<string>(selectedChildId || children[0]?.id || 'child_1');
  const [expandedChildMapId, setExpandedChildMapId] = useState<string | null>(null);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [secondsAgo, setSecondsAgo] = useState(3);
  const [buzzFeedback, setBuzzFeedback] = useState<string | null>(null);
  const [buzzingChildId, setBuzzingChildId] = useState<string | null>(null);

  // Store real-time telemetry updates for all children
  const [telemetryMap, setTelemetryMap] = useState<Record<string, {
    lat?: number;
    lng?: number;
    battery?: number;
    speed?: number;
    currentAddress?: string;
    isScreenOn?: boolean;
    screenState?: 'active' | 'screen_off' | 'background';
    appStatus?: 'active_in_app' | 'in_background' | 'screen_off';
    syncMode?: 'realtime' | 'balanced' | 'power_saving';
  }>>({});

  // Subscribe to Cloud Firestore telemetry for ALL children simultaneously
  useEffect(() => {
    const parentId = getActiveParentId();
    const unsubs: Array<() => void> = [];

    children.forEach((c) => {
      const unsub = subscribeChildTelemetryFromCloud(parentId, c.id, (telemetry) => {
        if (telemetry) {
          setTelemetryMap((prev) => ({
            ...prev,
            [c.id]: telemetry,
          }));
          setSecondsAgo(1);
        }
      }, c.name);
      unsubs.push(unsub);
    });

    return () => {
      unsubs.forEach((u) => {
        try { u(); } catch (_) {}
      });
    };
  }, [children]);

  // Periodic ticker for seconds ago
  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsAgo((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Compute live enhanced data for every child
  const enrichedChildren: EnrichedChildProfile[] = useMemo(() => {
    return children.map((c) => {
      const tel = telemetryMap[c.id];
      const lat = tel?.lat ?? c.lat;
      const lng = tel?.lng ?? c.lng;
      const battery = tel?.battery ?? c.battery;
      const speed = tel?.speed ?? c.speed;
      const address = tel?.currentAddress ?? c.currentAddress;
      const isScreenOn = tel?.isScreenOn ?? c.isScreenOn;
      const screenState = tel?.screenState ?? c.screenState;
      const appStatus = tel?.appStatus ?? c.appStatus;
      const syncMode = tel?.syncMode ?? c.syncMode;

      // Geofence check
      let inZoneName: string | null = null;
      let nearestZoneName: string | null = null;
      let minDistance = Infinity;

      if (Array.isArray(safeZones) && safeZones.length > 0) {
        safeZones.forEach((z) => {
          if (!z.isActive) return;
          const dist = getDistanceMeters(lat, lng, z.lat, z.lng);
          if (dist <= z.radius && !inZoneName) {
            inZoneName = z.name;
          }
          if (dist < minDistance) {
            minDistance = dist;
            nearestZoneName = z.name;
          }
        });
      }

      const hasValidNearestZone = Boolean(
        nearestZoneName && Number.isFinite(minDistance) && minDistance < 500000
      );
      const formattedDistance = minDistance >= 1000
        ? `${(minDistance / 1000).toFixed(1)}km`
        : `${Math.round(minDistance)}m`;

      return {
        ...c,
        lat,
        lng,
        battery,
        speed,
        address,
        isScreenOn,
        screenState,
        appStatus,
        syncMode,
        inZoneName,
        nearestZoneName,
        hasValidNearestZone,
        formattedDistance,
      };
    });
  }, [children, telemetryMap, safeZones]);

  // Fallback enriched child if enrichedChildren is empty
  const fallbackChild: EnrichedChildProfile = {
    ...child,
    address: child.currentAddress,
    inZoneName: null,
    nearestZoneName: null,
    hasValidNearestZone: false,
    formattedDistance: '',
  };

  // Active child for single mode
  const currentChild: EnrichedChildProfile =
    enrichedChildren.find((c) => c.id === focusedChildId) ||
    enrichedChildren[0] ||
    fallbackChild;

  const currentChildSettings = childSettings[currentChild.id];
  const isCurrentGpsDisabled =
    currentChildSettings?.trackingConfig?.enableGpsTracking === false ||
    currentChildSettings?.trackingConfig?.isMasterTrackingEnabled === false;

  // Multi-device tracking for current child
  const childDevices: ChildDeviceInfo[] = currentChild.devices && currentChild.devices.length > 0
    ? currentChild.devices
    : [
        {
          deviceId: 'dev_default',
          id: 'dev_default',
          deviceName: 'Điện thoại của con',
          model: 'Android',
          osVersion: 'Android 12',
          pairedAt: new Date().toISOString(),
          hardwareIdType: 'imei',
          isPrimary: true,
          battery: currentChild.battery,
        }
      ];

  const [selectedDeviceId, setSelectedDeviceId] = useState<string>(
    currentChild.activeDeviceId || childDevices[0]?.deviceId || childDevices[0]?.id || 'dev_default'
  );

  const activeDevice = useMemo(() => {
    return childDevices.find((d) => d.deviceId === selectedDeviceId || d.id === selectedDeviceId) || childDevices[0];
  }, [childDevices, selectedDeviceId]);

  const activeDeviceLat = activeDevice?.lat || activeDevice?.telemetry?.lat || currentChild.lat;
  const activeDeviceLng = activeDevice?.lng || activeDevice?.telemetry?.lng || currentChild.lng;
  const activeDeviceBattery = activeDevice?.battery ?? activeDevice?.telemetry?.battery ?? currentChild.battery;
  const activeDeviceAddress = activeDevice?.currentAddress || activeDevice?.telemetry?.currentAddress || currentChild.address;
  const activeDeviceSpeed = activeDevice?.speed ?? activeDevice?.telemetry?.speed ?? currentChild.speed;

  // Centroid & zoom calculation for All Children overview
  const { centroidLat, centroidLng, familyZoom } = useMemo(() => {
    const validCoords = enrichedChildren.filter((c) => c.lat && c.lng);
    if (validCoords.length === 0) {
      return { centroidLat: 10.762622, centroidLng: 106.682245, familyZoom: 14 };
    }

    const avgLat = validCoords.reduce((sum, c) => sum + c.lat, 0) / validCoords.length;
    const avgLng = validCoords.reduce((sum, c) => sum + c.lng, 0) / validCoords.length;

    const lats = validCoords.map((c) => c.lat);
    const lngs = validCoords.map((c) => c.lng);
    const latSpan = Math.max(...lats) - Math.min(...lats);
    const lngSpan = Math.max(...lngs) - Math.min(...lngs);
    const maxSpan = Math.max(latSpan, lngSpan);

    let z = 13;
    if (maxSpan < 0.015) z = 15;
    else if (maxSpan < 0.05) z = 14;
    else if (maxSpan < 0.12) z = 13;
    else if (maxSpan < 0.3) z = 12;
    else z = 11;

    return { centroidLat: avgLat, centroidLng: avgLng, familyZoom: z };
  }, [enrichedChildren]);

  // Handle refresh all children telemetry
  const handleRefreshAll = () => {
    haptics.light();
    setIsRefreshing(true);
    setSecondsAgo(0);
    try {
      const parentId = getActiveParentId();
      children.forEach((c) => {
        sendRemoteCommandToKid(parentId, c.id, 'ping', undefined, c.name).catch(() => {});
      });
    } catch (e) {
      console.warn('Ping all error:', e);
    }
    setTimeout(() => setIsRefreshing(false), 800);
  };

  // Handle buzzer for specific child
  const handleBuzzChild = async (childId: string, childName: string) => {
    haptics.medium();
    setBuzzingChildId(childId);
    buzzKidPhone(childId);
    setBuzzFeedback(`Đã phát còi tìm máy cho ${childName}!`);
    setTimeout(() => {
      setBuzzingChildId(null);
    }, 3000);
    setTimeout(() => {
      setBuzzFeedback(null);
    }, 4000);
  };

  // Focus a child from All mode
  const handleFocusChild = (childId: string) => {
    haptics.light();
    setFocusedChildId(childId);
    switchChild(childId);
    setViewMode('single');
  };

  // Map child items for InteractiveMap
  const mapChildrenItems: MapChildItem[] = useMemo(() => {
    return enrichedChildren.map((c) => ({
      id: c.id,
      name: c.name,
      avatar: c.avatar,
      lat: c.lat,
      lng: c.lng,
      battery: c.battery,
      speed: c.speed,
      currentAddress: c.address,
      status: c.status,
    }));
  }, [enrichedChildren]);

  return (
    <div className="flex-1 flex flex-col bg-slate-50 select-none pb-6">
      {/* Top Header */}
      <div className="bg-white px-4 py-3 border-b border-slate-100 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition cursor-pointer"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h2 className="text-base font-black text-slate-900 leading-tight">
              {viewMode === 'all'
                ? `Vị trí tất cả các con (${children.length} bé)`
                : `Định vị ${currentChild.name}`}
            </h2>
            <div className="flex items-center space-x-1.5 text-[10px] text-slate-500 font-medium mt-0.5">
              <Radio size={11} className="text-emerald-500 animate-pulse shrink-0" />
              <span>
                {viewMode === 'all'
                  ? `${children.length} máy kết nối • ${secondsAgo < 5 ? 'Vừa xong' : `${secondsAgo}s trước`}`
                  : `Vệ tinh GPS • ${secondsAgo < 5 ? 'Vừa xong' : `${secondsAgo}s trước`}`}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-1.5">
          {/* Toggle view layout when in 'all' mode */}
          {viewMode === 'all' && (
            <div className="bg-slate-100 p-0.5 rounded-xl flex items-center border border-slate-200/80">
              <button
                type="button"
                onClick={() => {
                  haptics.light();
                  setAllLayoutMode('panorama');
                }}
                className={`px-2 py-1 rounded-lg text-[10px] font-black flex items-center space-x-1 transition cursor-pointer ${
                  allLayoutMode === 'panorama'
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Bản đồ toàn cảnh gia đình"
              >
                <MapIcon size={12} />
                <span>Toàn cảnh</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  haptics.light();
                  setAllLayoutMode('multimap');
                }}
                className={`px-2 py-1 rounded-lg text-[10px] font-black flex items-center space-x-1 transition cursor-pointer ${
                  allLayoutMode === 'multimap'
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Xem đồng thời bản đồ của từng bé"
              >
                <Grid size={12} />
                <span>Từng bé</span>
              </button>
            </div>
          )}

          {/* Refresh button */}
          <button
            onClick={handleRefreshAll}
            className={`w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition cursor-pointer ${
              isRefreshing ? 'animate-spin' : ''
            }`}
            title="Làm mới vị trí tất cả các con"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* Buzzer Alert Banner */}
      {buzzFeedback && (
        <div className="bg-emerald-500 text-white px-4 py-2 text-xs font-bold flex items-center justify-center space-x-2 animate-in fade-in slide-in-from-top-2 duration-200 shadow-md">
          <CheckCircle2 size={15} />
          <span>{buzzFeedback}</span>
        </div>
      )}

      {/* Child Switcher Navigation Strip (All Children vs Specific Child) */}
      {children.length > 1 && (
        <div className="bg-white px-3 py-2 border-b border-slate-100 flex items-center space-x-2 overflow-x-auto select-none scrollbar-none shadow-2xs">
          <button
            type="button"
            onClick={() => {
              haptics.light();
              setViewMode('all');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center space-x-1.5 shrink-0 transition-all cursor-pointer ${
              viewMode === 'all'
                ? 'bg-blue-600 bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm ring-2 ring-blue-500/25'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200/80'
            }`}
          >
            <Users size={14} />
            <span>Tất cả các con ({children.length} bé)</span>
          </button>

          {children.map((c) => {
            const isSelected = viewMode === 'single' && focusedChildId === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  haptics.light();
                  setFocusedChildId(c.id);
                  switchChild(c.id);
                  setViewMode('single');
                }}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 shrink-0 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <img
                  src={c.avatar}
                  alt={c.name}
                  className="w-4 h-4 rounded-full object-cover ring-1 ring-white shrink-0"
                />
                <span>{c.name}</span>
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    c.status === 'online'
                      ? 'bg-emerald-400'
                      : c.status === 'moving'
                      ? 'bg-blue-400'
                      : 'bg-amber-400'
                  }`}
                />
              </button>
            );
          })}
        </div>
      )}

      {/* ========================================================= */}
      {/* MODE 1: ALL CHILDREN SIMULTANEOUS TRACKING                 */}
      {/* ========================================================= */}
      {viewMode === 'all' ? (
        <div className="flex-1 flex flex-col space-y-3">
          {allLayoutMode === 'panorama' ? (
            /* Layout A: Panorama Unified Google Map + Children Cards */
            <>
              {/* Panorama Central Map */}
              <div className="p-3">
                <InteractiveMap
                  centerLat={centroidLat}
                  centerLng={centroidLng}
                  initialZoom={familyZoom}
                  allChildren={mapChildrenItems}
                  activeChildId="all"
                  onSelectChild={(id) => {
                    if (id !== 'all') {
                      handleFocusChild(id);
                    }
                  }}
                  childName="Tất cả các con"
                  childAddress={`Đang hiển thị vị trí của ${children.length} bé trong khu vực`}
                  className="w-full h-72 min-h-[280px]"
                />
              </div>

              {/* All Children Live Status Cards Section */}
              <div className="px-3 space-y-2.5">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Users size={14} className="text-blue-600" />
                    <span>Chi tiết vị trí từng con ({enrichedChildren.length} bé)</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    Cập nhật thời gian thực
                  </span>
                </div>

                <div className="space-y-3">
                  {enrichedChildren.map((kid) => (
                    <div
                      key={kid.id}
                      className="bg-white rounded-3xl p-3.5 border border-slate-200/80 shadow-xs hover:shadow-md transition space-y-3"
                    >
                      {/* Top row: Kid Profile & Geofence Status */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3 min-w-0">
                          <div className="relative shrink-0">
                            <img
                              src={kid.avatar}
                              alt={kid.name}
                              className="w-11 h-11 rounded-2xl object-cover ring-2 ring-blue-500 shadow-2xs"
                            />
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${
                                kid.status === 'online'
                                  ? 'bg-emerald-500'
                                  : kid.status === 'moving'
                                  ? 'bg-blue-500'
                                  : 'bg-amber-500'
                              }`}
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center space-x-1.5">
                              <h4 className="text-xs font-black text-slate-900 truncate">
                                {kid.name}
                              </h4>
                              <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-bold">
                                {kid.grade}
                              </span>
                            </div>
                            <div className="mt-0.5">
                              {childSettings[kid.id]?.trackingConfig?.enableGpsTracking === false ||
                              childSettings[kid.id]?.trackingConfig?.isMasterTrackingEnabled === false ? (
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-[10.5px] text-amber-600 font-bold flex items-center gap-1">
                                    <AlertTriangle size={12} className="shrink-0 text-amber-500" />
                                    <span>GPS đang tắt (Tiết kiệm pin)</span>
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      haptics.light();
                                      setTrackingCollectionConfig(kid.id, {
                                        isMasterTrackingEnabled: true,
                                        enableGpsTracking: true
                                      });
                                    }}
                                    className="text-[9px] font-black bg-amber-500 hover:bg-amber-600 text-white px-1.5 py-0.5 rounded cursor-pointer active:scale-95 transition"
                                  >
                                    Bật lại
                                  </button>
                                </div>
                              ) : kid.inZoneName ? (
                                <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                                  <ShieldCheck size={12} className="shrink-0" />
                                  <span>Trong {kid.inZoneName}</span>
                                </span>
                              ) : kid.hasValidNearestZone ? (
                                <span className="text-[11px] text-amber-600 font-semibold flex items-center gap-1">
                                  <AlertTriangle size={12} className="shrink-0" />
                                  <span>Ngoài vùng an toàn (Cách {kid.nearestZoneName} {kid.formattedDistance})</span>
                                </span>
                              ) : (
                                <span className="text-[11px] text-blue-600 font-semibold flex items-center gap-1">
                                  <ShieldCheck size={12} className="shrink-0" />
                                  <span>GPS vệ tinh ổn định</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Battery, Speed & Adaptive Sync Mode Pill */}
                        <div className="flex flex-col items-end space-y-1 shrink-0">
                          {/* Sync Mode Badge */}
                          {kid.isScreenOn === false || kid.screenState === 'screen_off' ? (
                            <span className="px-1.5 py-0.5 rounded-lg text-[9px] font-bold bg-teal-50 text-teal-700 border border-teal-200/90 flex items-center gap-1 shadow-2xs">
                              <span>🍃</span>
                              <span>Tiết kiệm pin</span>
                            </span>
                          ) : kid.appStatus === 'active_in_app' || kid.screenState === 'active' ? (
                            <span className="px-1.5 py-0.5 rounded-lg text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 shadow-2xs">
                              <span className="relative flex h-1.5 w-1.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-600"></span>
                              </span>
                              <span>Realtime 3s</span>
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded-lg text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-200/90 flex items-center gap-1">
                              <span>📱</span>
                              <span>Chạy nền</span>
                            </span>
                          )}

                          <span
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-black flex items-center gap-1 ${
                              kid.battery > 50
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                                : kid.battery > 20
                                ? 'bg-amber-50 text-amber-700 border border-amber-200/80'
                                : 'bg-rose-50 text-rose-700 border border-rose-200/80'
                            }`}
                          >
                            <BatteryCharging size={11} />
                            <span>{kid.battery}% Pin</span>
                          </span>
                          {kid.speed > 0 && (
                            <span className="px-1.5 py-0.3 bg-blue-50 text-blue-700 rounded text-[9px] font-black border border-blue-100 flex items-center gap-0.5">
                              <Gauge size={10} />
                              <span>{kid.speed} km/h</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Address Line */}
                      <div className="bg-slate-50 rounded-2xl p-2.5 border border-slate-100 flex items-start space-x-2">
                        <MapPin size={14} className="text-rose-500 shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-bold text-slate-800 leading-snug line-clamp-2">
                            {kid.address}
                          </p>
                          <span className="text-[9px] font-mono text-slate-400 mt-0.5 block">
                            Tọa độ: {kid.lat.toFixed(4)}, {kid.lng.toFixed(4)}
                          </span>
                        </div>
                      </div>

                      {/* 4 Action Buttons for this child */}
                      <div className="grid grid-cols-4 gap-1.5 pt-0.5">
                        <button
                          type="button"
                          onClick={() => handleFocusChild(kid.id)}
                          className="py-2 px-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl flex flex-col items-center justify-center transition active:scale-95 cursor-pointer font-bold"
                          title="Xem vị trí cận cảnh"
                        >
                          <Eye size={14} className="mb-0.5 text-blue-600" />
                          <span className="text-[9.5px]">Cận cảnh</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleBuzzChild(kid.id, kid.name)}
                          disabled={buzzingChildId === kid.id}
                          className={`py-2 px-1.5 rounded-xl flex flex-col items-center justify-center transition active:scale-95 cursor-pointer font-bold ${
                            buzzingChildId === kid.id
                              ? 'bg-amber-500 text-white animate-bounce'
                              : 'bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200/80'
                          }`}
                          title="Rung chuông tìm máy bé này"
                        >
                          <Volume2 size={14} className="mb-0.5" />
                          <span className="text-[9.5px]">{buzzingChildId === kid.id ? 'Đang rung...' : 'Tìm máy'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => makePhoneCall(kid.phone || '0987654321')}
                          className="py-2 px-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/80 rounded-xl flex flex-col items-center justify-center transition active:scale-95 cursor-pointer font-bold text-center"
                          title="Gọi cho con"
                        >
                          <PhoneCall size={14} className="mb-0.5 text-emerald-600" />
                          <span className="text-[9.5px]">Gọi con</span>
                        </button>

                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${kid.lat},${kid.lng}`}
                          target="_blank"
                          rel="noreferrer"
                          className="py-2 px-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl flex flex-col items-center justify-center transition active:scale-95 text-center font-bold"
                          title="Mở Google Maps chỉ đường"
                        >
                          <Navigation2 size={14} className="mb-0.5" />
                          <span className="text-[9.5px]">Chỉ đường</span>
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            /* Layout B: Multi-Map Feed (Direct live Google Map per child) */
            <div className="p-3 space-y-3.5">
              {enrichedChildren.map((kid) => (
                <div
                  key={kid.id}
                  className="bg-white rounded-3xl overflow-hidden border border-slate-200/90 shadow-sm space-y-2"
                >
                  {/* Card Header with child details */}
                  <div className="p-3.5 pb-2 flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <img
                        src={kid.avatar}
                        alt={kid.name}
                        className="w-10 h-10 rounded-2xl object-cover ring-2 ring-blue-500 shadow-2xs"
                      />
                      <div>
                        <div className="flex items-center space-x-1.5">
                          <h4 className="text-xs font-black text-slate-900">{kid.name}</h4>
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-bold">
                            {kid.grade}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium line-clamp-1 mt-0.5">
                          {kid.address}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end">
                      <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        {kid.battery}% Pin
                      </span>
                    </div>
                  </div>

                  {/* Individual Live Google Maps for this child - On-demand mount to prevent multi-iframe WebView OOM */}
                  <div className="px-3">
                    {expandedChildMapId === kid.id ? (
                      <div className="space-y-2">
                        <InteractiveMap
                          centerLat={kid.lat}
                          centerLng={kid.lng}
                          childAddress={kid.address}
                          childName={kid.name}
                          childAvatar={kid.avatar}
                          battery={kid.battery}
                          speed={kid.speed}
                          initialZoom={16}
                          className="w-full h-56 rounded-2xl"
                        />
                        <div className="text-right">
                          <button
                            type="button"
                            onClick={() => setExpandedChildMapId(null)}
                            className="text-[10.5px] font-bold text-slate-500 hover:text-slate-800 transition cursor-pointer"
                          >
                            ▲ Thu gọn bản đồ
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => setExpandedChildMapId(kid.id)}
                        className="w-full h-24 rounded-2xl bg-gradient-to-r from-blue-50/80 via-slate-50 to-indigo-50/80 border border-blue-100/80 flex items-center justify-between px-4 cursor-pointer hover:border-blue-300 transition group active:scale-[0.99]"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition">
                            <MapIcon size={20} />
                          </div>
                          <div>
                            <span className="text-xs font-black text-slate-900 group-hover:text-blue-600 transition flex items-center gap-1.5">
                              <span>Mở bản đồ trực tiếp</span>
                              <Sparkles size={12} className="text-amber-500" />
                            </span>
                            <span className="text-[10px] text-slate-500 block mt-0.5">
                              Vệ tinh / Đường phố thời gian thực
                            </span>
                          </div>
                        </div>
                        <span className="text-[11px] font-bold text-blue-600 bg-white px-2.5 py-1 rounded-xl shadow-2xs border border-blue-200/80 group-hover:bg-blue-50">
                          Xem ➔
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Action row */}
                  <div className="p-3 pt-1 flex items-center justify-between gap-2">
                    <div className="text-[10px] text-slate-500 font-mono">
                      GPS: {kid.lat.toFixed(4)}, {kid.lng.toFixed(4)}
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => handleBuzzChild(kid.id, kid.name)}
                        className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-xl text-xs font-bold flex items-center gap-1 active:scale-95 transition cursor-pointer"
                      >
                        <Volume2 size={13} />
                        <span>Tìm máy</span>
                      </button>

                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${kid.lat},${kid.lng}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 active:scale-95 transition"
                      >
                        <Navigation2 size={13} />
                        <span>Chỉ đường</span>
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* ========================================================= */
        /* MODE 2: SINGLE CHILD FOCUSED TRACKING                     */
        /* ========================================================= */
        <div className="flex-1 flex flex-col">
          {/* Back to All Children Banner */}
          {children.length > 1 && (
            <div className="bg-blue-600 bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-white flex items-center justify-between shadow-xs">
              <span className="text-xs font-bold flex items-center gap-1.5">
                <Users size={14} />
                <span>Đang xem cận cảnh {currentChild.name}</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  haptics.light();
                  setViewMode('all');
                }}
                className="px-2.5 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-[11px] font-black transition active:scale-95 cursor-pointer"
              >
                🌐 Xem tất cả các con
              </button>
            </div>
          )}

          {/* Child Status Mini Bar */}
          <div className="bg-white/95 backdrop-blur-md px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="relative shrink-0">
                <img
                  src={currentChild.avatar}
                  alt={currentChild.name}
                  className="w-10 h-10 rounded-2xl object-cover ring-2 ring-blue-500 shadow-xs"
                />
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center space-x-2">
                  <h4 className="text-xs font-bold text-slate-900 truncate">{currentChild.name}</h4>
                  <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.2 rounded font-medium">
                    {currentChild.grade}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 truncate mt-0.5">
                  {currentChild.inZoneName ? (
                    <span className="text-emerald-600 font-bold flex items-center gap-1">
                      <ShieldCheck size={13} className="shrink-0" />
                      <span>Trong {currentChild.inZoneName}</span>
                    </span>
                  ) : currentChild.hasValidNearestZone ? (
                    <span className="text-amber-600 font-semibold flex items-center gap-1">
                      <AlertTriangle size={13} className="shrink-0" />
                      <span>Ngoài vùng an toàn (Cách {currentChild.nearestZoneName} {currentChild.formattedDistance})</span>
                    </span>
                  ) : (
                    <span className="text-emerald-600 font-semibold flex items-center gap-1">
                      <ShieldCheck size={13} className="shrink-0" />
                      <span>GPS vệ tinh hoạt động ổn định</span>
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-1.5">
              {/* Buzzer Button */}
              <button
                onClick={() => handleBuzzChild(currentChild.id, currentChild.name)}
                disabled={buzzingChildId === currentChild.id}
                className={`px-2.5 py-1.5 rounded-xl font-bold text-xs flex items-center space-x-1.5 transition cursor-pointer ${
                  buzzingChildId === currentChild.id
                    ? 'bg-amber-500 text-white animate-bounce'
                    : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200/80'
                }`}
                title="Rung chuông tìm máy"
              >
                <Volume2 size={15} />
                <span>{buzzingChildId === currentChild.id ? 'Đang rung...' : 'Tìm máy'}</span>
              </button>

              <button
                type="button"
                onClick={() => makePhoneCall(currentChild.phone || '0987654321')}
                className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-xl transition cursor-pointer"
                title="Gọi cho con"
              >
                <PhoneCall size={17} />
              </button>
            </div>
          </div>

          {/* GPS Tracking Disabled Alert Banner */}
          {isCurrentGpsDisabled && (
            <div className="bg-amber-500 text-white px-4 py-2.5 flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-2 shrink-0">
              <div className="flex items-center space-x-2 min-w-0">
                <AlertTriangle size={16} className="shrink-0 animate-pulse text-amber-100" />
                <div className="min-w-0">
                  <span className="text-xs font-black block truncate">
                    GPS đang tắt để tiết kiệm pin trên máy {currentChild.name}
                  </span>
                  <span className="text-[10px] text-amber-100 block truncate">
                    {currentChildSettings?.trackingConfig?.isMasterTrackingEnabled === false
                      ? 'Đang bật chế độ Ngủ Đông Tiết Kiệm Pin'
                      : 'Đang tạm dừng thu thập vị trí GPS'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  haptics.medium();
                  setTrackingCollectionConfig(currentChild.id, {
                    isMasterTrackingEnabled: true,
                    enableGpsTracking: true
                  });
                }}
                className="shrink-0 px-3 py-1.5 bg-white hover:bg-amber-50 text-amber-800 font-black text-xs rounded-xl shadow-xs transition active:scale-95 cursor-pointer ml-2"
              >
                Bật lại ngay
              </button>
            </div>
          )}

          {/* Multi-device Switcher Strip (If child has multiple devices) */}
          {childDevices.length > 1 && (
            <div className="bg-slate-100/90 px-3 py-1.5 border-b border-slate-200 flex items-center space-x-2 overflow-x-auto">
              <span className="text-[10px] font-bold text-slate-500 uppercase shrink-0">Thiết bị:</span>
              {childDevices.map((dev) => {
                const devKey = dev.deviceId || dev.id || 'dev_default';
                const isSelected = devKey === selectedDeviceId;
                return (
                  <button
                    key={devKey}
                    type="button"
                    onClick={() => {
                      setSelectedDeviceId(devKey);
                      if (switchActiveChildDevice) {
                        switchActiveChildDevice(currentChild.id, devKey);
                      }
                    }}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center space-x-1.5 shrink-0 transition cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
                    }`}
                  >
                    <Smartphone size={12} />
                    <span>{dev.deviceName}</span>
                    {dev.isPrimary && <span className="text-[9px] opacity-80">(Chính)</span>}
                  </button>
                );
              })}
            </div>
          )}

          {/* Live Single Child Map Area */}
          <div className="flex-1 relative p-3">
            <InteractiveMap
              centerLat={activeDeviceLat}
              centerLng={activeDeviceLng}
              childAddress={activeDeviceAddress}
              childName={activeDevice ? `${currentChild.name} (${activeDevice.deviceName})` : currentChild.name}
              childAvatar={currentChild.avatar}
              battery={activeDeviceBattery}
              speed={activeDeviceSpeed}
              accuracyMeters={12}
              safeZones={safeZones}
              devices={childDevices}
              activeDeviceId={selectedDeviceId}
              onSelectDevice={(devId) => setSelectedDeviceId(devId)}
              allChildren={mapChildrenItems}
              activeChildId={currentChild.id}
              onSelectChild={(id) => {
                if (id === 'all') {
                  setViewMode('all');
                } else {
                  handleFocusChild(id);
                }
              }}
              className="w-full h-full min-h-[300px]"
            />
          </div>

          {/* Bottom Information & Control Card */}
          <div className="bg-white rounded-t-3xl p-4 shadow-xl border-t border-slate-100 space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Vị trí thực tế của con
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {currentChild.lat.toFixed(4)}, {currentChild.lng.toFixed(4)}
                </span>
              </div>
              <p className="text-xs font-bold text-slate-900 mt-1 line-clamp-2 leading-relaxed">
                {currentChild.address}
              </p>
            </div>

            {/* Telemetry Stats */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-slate-50 rounded-2xl p-2.5 border border-slate-100 flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <BatteryCharging size={17} />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-medium">Pin thiết bị</span>
                  <p className="text-xs font-bold text-slate-900">{currentChild.battery}%</p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-2xl p-2.5 border border-slate-100 flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Gauge size={17} />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-medium">Tốc độ di chuyển</span>
                  <p className="text-xs font-bold text-slate-900">{currentChild.speed} km/h</p>
                </div>
              </div>
            </div>

            {/* 3 Action Buttons */}
            <div className="grid grid-cols-3 gap-2 pt-0.5">
              <button
                onClick={() => onNavigate('history')}
                className="py-2.5 px-2 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-xl flex flex-col items-center justify-center text-slate-700 transition active:scale-95 cursor-pointer"
              >
                <History size={16} className="text-slate-600 mb-0.5" />
                <span className="text-[10px] font-bold">Lịch sử</span>
              </button>

              <button
                onClick={() => onNavigate('safezone')}
                className="py-2.5 px-2 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-xl flex flex-col items-center justify-center text-slate-700 transition active:scale-95 cursor-pointer"
              >
                <Shield size={16} className="text-blue-600 mb-0.5" />
                <span className="text-[10px] font-bold">Vùng an toàn</span>
              </button>

              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${currentChild.lat},${currentChild.lng}`}
                target="_blank"
                rel="noreferrer"
                className="py-2.5 px-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex flex-col items-center justify-center transition shadow-md shadow-blue-500/20 active:scale-95 text-center"
              >
                <Navigation2 size={16} className="mb-0.5" />
                <span className="text-[10px] font-black">Chỉ đường</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
