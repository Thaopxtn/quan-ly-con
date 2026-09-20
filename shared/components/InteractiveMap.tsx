import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  MapPin,
  Navigation,
  Compass,
  Plus,
  Minus,
  Layers,
  Smartphone,
  Tablet,
  Shield,
  Clock,
  Gauge,
  Info,
  Maximize2,
  Minimize2,
  LocateFixed,
  ExternalLink,
  Satellite,
  Mountain,
  Map as MapIcon,
  Check,
  Radio,
  Sparkles,
  RefreshCw,
  Eye
} from 'lucide-react';
import { SafeZone, RoutePoint, ChildDeviceInfo } from '../types';
import { haptics } from '../utils/haptics';

export type MapLayer = 'street' | 'satellite' | 'tactical';

export interface MapChildItem {
  id: string;
  name: string;
  avatar: string;
  lat: number;
  lng: number;
  battery?: number;
  speed?: number;
  currentAddress?: string;
  status?: string;
}

interface InteractiveMapProps {
  centerLat?: number;
  centerLng?: number;
  childAddress?: string;
  childName?: string;
  childAvatar?: string;
  battery?: number;
  speed?: number;
  accuracyMeters?: number;
  safeZones?: SafeZone[];
  routePoints?: RoutePoint[];
  isPlayingRoute?: boolean;
  playbackProgress?: number; // 0 to 100
  activePointIndex?: number;
  onSelectPoint?: (index: number) => void;
  devices?: ChildDeviceInfo[];
  activeDeviceId?: string;
  onSelectDevice?: (deviceId: string) => void;
  previewZone?: Partial<SafeZone> | null;
  className?: string;
  showDetailsOverlay?: boolean;
  initialZoom?: number;
  allChildren?: MapChildItem[];
  activeChildId?: string;
  onSelectChild?: (childId: string) => void;
  topControl?: React.ReactNode;
}

const TILE_SIZE = 256;

// Web Mercator projection formulas
function latLngToWorldPixel(lat: number, lng: number, zoom: number) {
  const scale = TILE_SIZE * Math.pow(2, zoom);
  const x = ((lng + 180) / 360) * scale;
  const latClamped = Math.max(-85, Math.min(85, lat));
  const latRad = (latClamped * Math.PI) / 180;
  const mercN = Math.log(Math.tan(Math.PI / 4 + latRad / 2));
  const y = (0.5 - mercN / (2 * Math.PI)) * scale;
  return { x, y };
}

function metersPerPixel(lat: number, zoom: number) {
  return (156543.03392 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom);
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  centerLat = 21.028511,
  centerLng = 105.854444,
  childAddress,
  childName = 'Bé',
  childAvatar,
  battery = 100,
  speed = 0,
  accuracyMeters = 12,
  safeZones = [],
  routePoints = [],
  isPlayingRoute = false,
  topControl,
  playbackProgress,
  activePointIndex = 0,
  onSelectPoint,
  devices = [],
  activeDeviceId,
  onSelectDevice,
  previewZone,
  className = 'h-64',
  showDetailsOverlay = false,
  initialZoom,
  allChildren = [],
  activeChildId,
  onSelectChild,
}) => {
  // Zoom levels: 12 (city), 15 (neighborhood), 16 (street), 18 (building)
  const [zoom, setZoom] = useState<number>(initialZoom || 16);
  const [activeLayer, setActiveLayer] = useState<MapLayer>('street');
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({ width: 400, height: 300 });

  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const initialOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Update container dimensions on resize
  useEffect(() => {
    if (!containerRef.current) return;
    const updateDims = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth || 400,
          height: containerRef.current.clientHeight || 300,
        });
      }
    };
    updateDims();
    const observer = new ResizeObserver(updateDims);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Update zoom if initialZoom changes
  useEffect(() => {
    if (initialZoom) setZoom(initialZoom);
  }, [initialZoom]);

  // Coordinates resolution
  const effectiveLat = useMemo(() => {
    if (previewZone && previewZone.lat) return previewZone.lat;
    if (!isPlayingRoute && routePoints && routePoints.length > 0 && routePoints[activePointIndex]?.lat) {
      return routePoints[activePointIndex].lat;
    }
    if (routePoints && routePoints.length > 0 && routePoints[0]?.lat) {
      return routePoints[0].lat;
    }
    return centerLat;
  }, [previewZone, routePoints, activePointIndex, isPlayingRoute, centerLat]);

  const effectiveLng = useMemo(() => {
    if (previewZone && previewZone.lng) return previewZone.lng;
    if (!isPlayingRoute && routePoints && routePoints.length > 0 && routePoints[activePointIndex]?.lng) {
      return routePoints[activePointIndex].lng;
    }
    if (routePoints && routePoints.length > 0 && routePoints[0]?.lng) {
      return routePoints[0].lng;
    }
    return centerLng;
  }, [previewZone, routePoints, activePointIndex, isPlayingRoute, centerLng]);

  // Center coordinate in world pixels
  const centerWorld = useMemo(() => {
    return latLngToWorldPixel(effectiveLat, effectiveLng, zoom);
  }, [effectiveLat, effectiveLng, zoom]);

  // Viewport center on screen
  const screenCenterX = dimensions.width / 2 + panOffset.x;
  const screenCenterY = dimensions.height / 2 + panOffset.y;

  // Convert any LatLng to screen coordinates
  const latLngToScreen = useCallback(
    (lat: number, lng: number) => {
      const world = latLngToWorldPixel(lat, lng, zoom);
      const x = screenCenterX + (world.x - centerWorld.x);
      const y = screenCenterY + (world.y - centerWorld.y);
      return { x, y };
    },
    [zoom, screenCenterX, screenCenterY, centerWorld]
  );

  // Tiles grid calculation
  const tiles = useMemo(() => {
    if (activeLayer === 'tactical') return [];

    const numTilesX = Math.ceil(dimensions.width / TILE_SIZE) + 2;
    const numTilesY = Math.ceil(dimensions.height / TILE_SIZE) + 2;

    const centerTileX = Math.floor(centerWorld.x / TILE_SIZE);
    const centerTileY = Math.floor(centerWorld.y / TILE_SIZE);

    const halfX = Math.floor(numTilesX / 2);
    const halfY = Math.floor(numTilesY / 2);

    const maxTile = Math.pow(2, zoom) - 1;
    const list: Array<{ key: string; x: number; y: number; left: number; top: number; url: string }> = [];

    for (let dx = -halfX; dx <= halfX; dx++) {
      for (let dy = -halfY; dy <= halfY; dy++) {
        const tx = (centerTileX + dx + (maxTile + 1) * 10) % (maxTile + 1);
        const ty = centerTileY + dy;
        if (ty < 0 || ty > maxTile) continue;

        const left = screenCenterX + ((centerTileX + dx) * TILE_SIZE - centerWorld.x);
        const top = screenCenterY + ((centerTileY + dy) * TILE_SIZE - centerWorld.y);

        let url = '';
        if (activeLayer === 'satellite') {
          url = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${ty}/${tx}`;
        } else {
          url = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/${zoom}/${ty}/${tx}`;
        }

        list.push({
          key: `${zoom}-${tx}-${ty}`,
          x: tx,
          y: ty,
          left,
          top,
          url,
        });
      }
    }
    return list;
  }, [centerWorld, zoom, dimensions, screenCenterX, screenCenterY, activeLayer]);

  // Drag / Touch gestures handling
  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    initialOffsetRef.current = { ...panOffset };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPanOffset({
      x: initialOffsetRef.current.x + dx,
      y: initialOffsetRef.current.y + dy,
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDraggingRef.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch (_) {}
  };

  const handleZoomIn = () => {
    haptics.light();
    setZoom((z) => Math.min(18, z + 1));
  };

  const handleZoomOut = () => {
    haptics.light();
    setZoom((z) => Math.max(11, z - 1));
  };

  const handleRecenter = () => {
    haptics.medium();
    setPanOffset({ x: 0, y: 0 });
    setZoom(16);
  };

  const googleMapsDirectionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${effectiveLat},${effectiveLng}`;

  const mPerPx = metersPerPixel(effectiveLat, zoom);
  const accuracyRadiusPx = Math.max(16, (accuracyMeters || 15) / mPerPx);

  const mainChildPos = latLngToScreen(effectiveLat, effectiveLng);

  const routePolylineSvg = useMemo(() => {
    if (!routePoints || routePoints.length < 2) return '';
    return routePoints
      .map((pt, idx) => {
        const p = latLngToScreen(pt.lat, pt.lng);
        return `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
      })
      .join(' ');
  }, [routePoints, latLngToScreen]);

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className={`relative w-full rounded-2xl overflow-hidden border border-slate-200/90 shadow-soft select-none bg-slate-100 touch-none cursor-grab active:cursor-grabbing ${className}`}
    >
      {/* ─── Layer 1: Tile Map / Tactical Radar Canvas ──────────────────────── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {activeLayer === 'tactical' ? (
          /* Tactical Radar Grid Background */
          <div className="w-full h-full bg-slate-900 relative">
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: `radial-gradient(#38bdf8 1px, transparent 1px), linear-gradient(to right, rgba(56, 189, 248, 0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(56, 189, 248, 0.1) 1px, transparent 1px)`,
                backgroundSize: '40px 40px',
              }}
            />
            {/* Concentric radar range circles */}
            <svg className="w-full h-full absolute inset-0">
              {[80, 160, 240, 320].map((r, i) => (
                <circle
                  key={i}
                  cx={mainChildPos.x}
                  cy={mainChildPos.y}
                  r={r}
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                  opacity={0.35 - i * 0.06}
                />
              ))}
              {/* Crosshairs */}
              <line x1={mainChildPos.x} y1={0} x2={mainChildPos.x} y2={dimensions.height} stroke="#38bdf8" strokeWidth="0.8" opacity="0.2" />
              <line x1={0} y1={mainChildPos.y} x2={dimensions.width} y2={mainChildPos.y} stroke="#38bdf8" strokeWidth="0.8" opacity="0.2" />
            </svg>
          </div>
        ) : (
          /* Raster Tile Layer (Voyager or Satellite) */
          tiles.map((tile) => (
            <img
              key={tile.key}
              src={tile.url}
              alt=""
              loading="lazy"
              draggable={false}
              className="absolute pointer-events-none transition-opacity duration-150"
              style={{
                left: `${tile.left}px`,
                top: `${tile.top}px`,
                width: `${TILE_SIZE}px`,
                height: `${TILE_SIZE}px`,
              }}
              onError={(e) => {
                (e.target as HTMLElement).style.opacity = '0.3';
              }}
            />
          ))
        )}
      </div>

      {/* Subtle vignette border */}
      <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_24px_rgba(0,0,0,0.12)] z-10" />

      {/* ─── Layer 2: Vector Overlay (Safe Zones & Route Line) ────────────────── */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-15">
        <defs>
          <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.9" />
          </linearGradient>
        </defs>

        {/* Route History Polyline */}
        {routePolylineSvg && (
          <path
            d={routePolylineSvg}
            fill="none"
            stroke="url(#routeGradient)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="6 3"
          />
        )}

        {/* Accuracy Circle */}
        <circle
          cx={mainChildPos.x}
          cy={mainChildPos.y}
          r={accuracyRadiusPx}
          fill="rgba(59, 130, 246, 0.12)"
          stroke="rgba(59, 130, 246, 0.45)"
          strokeWidth="1.5"
        />

        {/* Safe Zones Circles */}
        {safeZones.map((zone) => {
          if (!zone.isActive && !previewZone) return null;
          const pos = latLngToScreen(zone.lat, zone.lng);
          const rPx = Math.max(18, zone.radius / mPerPx);
          const strokeColor = zone.color || '#10b981';
          return (
            <g key={zone.id}>
              <circle
                cx={pos.x}
                cy={pos.y}
                r={rPx}
                fill={strokeColor}
                fillOpacity="0.15"
                stroke={strokeColor}
                strokeWidth="2"
                strokeDasharray="4 4"
              />
            </g>
          );
        })}

        {/* Preview Zone (When adding / editing safe zone) */}
        {previewZone && previewZone.lat && previewZone.lng && (
          (() => {
            const pPos = latLngToScreen(previewZone.lat, previewZone.lng);
            const pRadiusPx = Math.max(20, (previewZone.radius || 300) / mPerPx);
            return (
              <circle
                cx={pPos.x}
                cy={pPos.y}
                r={pRadiusPx}
                fill="rgba(16, 185, 129, 0.22)"
                stroke="#10b981"
                strokeWidth="2.5"
                strokeDasharray="6 4"
                className="animate-pulse"
              />
            );
          })()
        )}
      </svg>

      {/* ─── Layer 3: Interactive Markers (Safe Zone Labels, Child Pins) ─────── */}
      {/* Safe Zone Icon Labels */}
      {safeZones.map((zone) => {
        if (!zone.isActive) return null;
        const pos = latLngToScreen(zone.lat, zone.lng);
        return (
          <div
            key={`label-${zone.id}`}
            className="absolute z-18 pointer-events-none transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
            style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
          >
            <div className="bg-white/95 backdrop-blur-md px-2 py-0.5 rounded-full shadow-sm border border-emerald-500/40 flex items-center space-x-1 text-[10px] font-black text-emerald-800">
              <Shield size={10} className="text-emerald-600" />
              <span>{zone.name}</span>
            </div>
          </div>
        );
      })}

      {/* Route Point Markers */}
      {routePoints &&
        routePoints.length > 0 &&
        routePoints.map((pt, idx) => {
          const pos = latLngToScreen(pt.lat, pt.lng);
          const isSelected = idx === activePointIndex;
          return (
            <button
              key={pt.id || idx}
              type="button"
              onClick={() => onSelectPoint && onSelectPoint(idx)}
              className={`absolute z-19 transform -translate-x-1/2 -translate-y-1/2 transition-all cursor-pointer ${
                isSelected ? 'scale-125 z-25' : 'scale-90 hover:scale-110'
              }`}
              style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
            >
              <div
                className={`w-4 h-4 rounded-full flex items-center justify-center shadow-md border-2 border-white ${
                  idx === 0
                    ? 'bg-emerald-500 text-white'
                    : idx === routePoints.length - 1
                    ? 'bg-rose-500 text-white'
                    : isSelected
                    ? 'bg-blue-600 ring-2 ring-blue-400'
                    : 'bg-slate-700'
                }`}
              >
                <div className="w-1.5 h-1.5 bg-white rounded-full" />
              </div>
            </button>
          );
        })}

      {/* All Children Pins (When viewing all children) */}
      {allChildren &&
        allChildren.length > 1 &&
        allChildren.map((kid) => {
          const pos = latLngToScreen(kid.lat, kid.lng);
          const isFocused = activeChildId === kid.id;
          return (
            <button
              key={`kid-pin-${kid.id}`}
              type="button"
              onClick={() => onSelectChild && onSelectChild(kid.id)}
              className={`absolute z-22 transform -translate-x-1/2 -translate-y-1/2 transition-transform cursor-pointer group ${
                isFocused ? 'scale-110 z-30' : 'hover:scale-110'
              }`}
              style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
            >
              <div className="relative flex flex-col items-center">
                {isFocused && (
                  <span className="absolute -inset-2 rounded-full bg-blue-500/30 animate-ping pointer-events-none" />
                )}
                <div
                  className={`w-9 h-9 rounded-full p-0.5 shadow-lg flex items-center justify-center transition-all ${
                    isFocused
                      ? 'bg-gradient-to-tr from-blue-600 to-indigo-500 ring-3 ring-blue-400/80 shadow-blue-500/40'
                      : 'bg-white ring-2 ring-slate-300 hover:ring-blue-400'
                  }`}
                >
                  <img
                    src={kid.avatar}
                    alt={kid.name}
                    className="w-full h-full rounded-full object-cover"
                  />
                </div>
                <div className="mt-1 bg-slate-900/90 text-white px-2 py-0.5 rounded-full text-[10px] font-black shadow-md border border-white/20 whitespace-nowrap">
                  {kid.name} {kid.battery !== undefined && `• ${kid.battery}%`}
                </div>
              </div>
            </button>
          );
        })}

      {/* Main Single Child GPS Pin (When single child or fallback) */}
      {(!allChildren || allChildren.length <= 1) && (
        <div
          className="absolute z-24 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{ left: `${mainChildPos.x}px`, top: `${mainChildPos.y}px` }}
        >
          <div className="relative flex flex-col items-center">
            {/* Animated Pulsing Wave */}
            <span className="absolute -inset-3 rounded-full bg-blue-500/30 animate-ping" />
            <span className="absolute -inset-6 rounded-full bg-blue-400/15 animate-pulse" />

            {/* Avatar Ring */}
            <div className="relative w-11 h-11 rounded-full p-0.5 bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-400 shadow-xl ring-3 ring-white flex items-center justify-center">
              {childAvatar ? (
                <img
                  src={childAvatar}
                  alt={childName}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-blue-600 rounded-full flex items-center justify-center text-white font-black text-sm">
                  {childName.slice(0, 1).toUpperCase()}
                </div>
              )}
              {/* Online pulse dot */}
              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full" />
            </div>

            {/* Compass / Direction Pointer if moving */}
            {speed > 3 && (
              <div className="mt-0.5 bg-indigo-600 text-white px-1.5 py-0.2 rounded-full text-[9px] font-black flex items-center gap-0.5 shadow-sm">
                <Navigation size={9} className="rotate-45" />
                <span>{speed} km/h</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Layer 4: Top Floating Badges ───────────────────────────────────── */}
      {/* Top Left: Live Status Badge or Custom Top Control */}
      <div className="absolute top-3 left-3 z-25 pointer-events-auto">
        {topControl ? (
          topControl
        ) : (
          <div className="bg-white/95 backdrop-blur-md px-2.5 py-1.5 rounded-full shadow-md border border-slate-200/80 flex items-center space-x-2 text-[11px] font-black text-slate-800">
            {childAvatar ? (
              <img
                src={childAvatar}
                alt={childName}
                className="w-5 h-5 rounded-full object-cover ring-1 ring-blue-500 shrink-0"
              />
            ) : (
              <div className="relative flex items-center justify-center">
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
                <span className="w-2 h-2 absolute bg-emerald-500 rounded-full" />
              </div>
            )}
            <span className="text-slate-900 font-extrabold truncate max-w-[85px]">{childName}</span>
            <span className="text-slate-300">•</span>
            {routePoints && routePoints.length > 0 ? (
              <span className="text-blue-600 font-bold">
                Điểm {activePointIndex + 1}/{routePoints.length}
              </span>
            ) : previewZone ? (
              <span className="text-emerald-700 font-bold truncate max-w-[100px]">
                {previewZone.name || 'Vùng an toàn'}
              </span>
            ) : (
              <>
                <span className="text-emerald-700 font-bold">{battery}% Pin</span>
                <span className="text-slate-300">•</span>
                <span className="text-slate-500 font-medium">±{accuracyMeters}m</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Quick Child Selector Bar (When multiple children available) */}
      {allChildren && allChildren.length > 1 && (
        <div className="absolute top-12 left-3 right-16 z-25 flex items-center space-x-1.5 overflow-x-auto pointer-events-auto py-1 select-none scrollbar-none">
          <button
            type="button"
            onClick={() => onSelectChild && onSelectChild('all')}
            className={`px-2.5 py-1 rounded-full text-[10px] font-black shrink-0 transition-all cursor-pointer flex items-center space-x-1 shadow-md border ${
              activeChildId === 'all' || !activeChildId
                ? 'bg-blue-600 text-white border-blue-500 shadow-blue-500/30 ring-1 ring-white'
                : 'bg-white/95 text-slate-700 hover:bg-white border-slate-200/90'
            }`}
          >
            <span>Toàn cảnh ({allChildren.length})</span>
          </button>
          {allChildren.map((c) => {
            const isSelected = activeChildId === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onSelectChild && onSelectChild(c.id)}
                className={`px-2 py-0.8 rounded-full text-[10px] font-bold shrink-0 transition-all cursor-pointer flex items-center space-x-1.5 shadow-md border ${
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-500 shadow-blue-500/30 ring-1 ring-white'
                    : 'bg-white/95 text-slate-700 hover:bg-white border-slate-200/90'
                }`}
              >
                <img
                  src={c.avatar}
                  alt={c.name}
                  className="w-3.5 h-3.5 rounded-full object-cover ring-1 ring-white"
                />
                <span className="truncate max-w-[65px]">{c.name}</span>
                {c.battery !== undefined && (
                  <span className="text-[9px] opacity-90 font-mono">{c.battery}%</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* ─── Layer 5: Top Right Floating Map Controls ───────────────────────── */}
      <div className="absolute top-3 right-3 z-25 flex flex-col space-y-1.5 pointer-events-auto">
        {/* Layer Selector */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              haptics.light();
              setShowLayerMenu(!showLayerMenu);
            }}
            className="w-9 h-9 bg-white/95 backdrop-blur-md rounded-xl shadow-md border border-slate-200/80 flex items-center justify-center text-slate-700 hover:text-blue-600 hover:bg-white active:scale-95 transition cursor-pointer"
            title="Đổi kiểu bản đồ"
          >
            <Layers size={17} />
          </button>

          {/* Layer Menu Dropdown */}
          {showLayerMenu && (
            <div className="absolute top-0 right-11 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/80 p-1.5 space-y-1 min-w-[145px] animate-in fade-in zoom-in-95 duration-150">
              <button
                type="button"
                onClick={() => {
                  haptics.light();
                  setActiveLayer('street');
                  setShowLayerMenu(false);
                }}
                className={`w-full px-2.5 py-1.5 rounded-xl text-left text-xs font-bold flex items-center justify-between transition cursor-pointer ${
                  activeLayer === 'street' ? 'bg-blue-50 text-blue-600' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <MapIcon size={14} />
                  <span>Đường phố (OSM)</span>
                </div>
                {activeLayer === 'street' && <Check size={14} />}
              </button>

              <button
                type="button"
                onClick={() => {
                  haptics.light();
                  setActiveLayer('satellite');
                  setShowLayerMenu(false);
                }}
                className={`w-full px-2.5 py-1.5 rounded-xl text-left text-xs font-bold flex items-center justify-between transition cursor-pointer ${
                  activeLayer === 'satellite' ? 'bg-blue-50 text-blue-600' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Satellite size={14} />
                  <span>Ảnh vệ tinh (Esri)</span>
                </div>
                {activeLayer === 'satellite' && <Check size={14} />}
              </button>

              <button
                type="button"
                onClick={() => {
                  haptics.light();
                  setActiveLayer('tactical');
                  setShowLayerMenu(false);
                }}
                className={`w-full px-2.5 py-1.5 rounded-xl text-left text-xs font-bold flex items-center justify-between transition cursor-pointer ${
                  activeLayer === 'tactical' ? 'bg-blue-50 text-blue-600' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Radio size={14} />
                  <span>Radar chiến thuật</span>
                </div>
                {activeLayer === 'tactical' && <Check size={14} />}
              </button>
            </div>
          )}
        </div>

        {/* Zoom In */}
        <button
          type="button"
          onClick={handleZoomIn}
          className="w-9 h-9 bg-white/95 backdrop-blur-md rounded-xl shadow-md border border-slate-200/80 flex items-center justify-center text-slate-700 hover:text-blue-600 hover:bg-white active:scale-95 transition cursor-pointer"
          title="Phóng to bản đồ"
        >
          <Plus size={17} />
        </button>

        {/* Zoom Out */}
        <button
          type="button"
          onClick={handleZoomOut}
          className="w-9 h-9 bg-white/95 backdrop-blur-md rounded-xl shadow-md border border-slate-200/80 flex items-center justify-center text-slate-700 hover:text-blue-600 hover:bg-white active:scale-95 transition cursor-pointer"
          title="Thu nhỏ bản đồ"
        >
          <Minus size={17} />
        </button>

        {/* Re-center to Child */}
        <button
          type="button"
          onClick={handleRecenter}
          className="w-9 h-9 bg-white/95 backdrop-blur-md rounded-xl shadow-md border border-slate-200/80 flex items-center justify-center text-blue-600 hover:bg-blue-50 active:scale-95 transition cursor-pointer"
          title="Định tâm vị trí con"
        >
          <LocateFixed size={17} />
        </button>

        {/* Direct Google Maps Navigation Launcher (Never freezes current app!) */}
        <a
          href={googleMapsDirectionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-9 h-9 bg-blue-600 text-white rounded-xl shadow-md shadow-blue-500/25 flex items-center justify-center hover:bg-blue-700 active:scale-95 transition cursor-pointer"
          title="Mở Google Maps chỉ đường"
        >
          <Navigation size={16} />
        </a>
      </div>

      {/* ─── Layer 6: Bottom Floating Information Bar ───────────────────────── */}
      <div className="absolute bottom-2.5 left-3 right-3 z-25 pointer-events-none">
        <div className="bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-md border border-slate-200/80 flex items-center justify-between text-[11px] text-slate-700 pointer-events-auto">
          <div className="flex items-center space-x-1.5 truncate pr-2">
            <MapPin size={13} className="text-rose-500 shrink-0" />
            <span className="font-bold text-slate-900 truncate">
              {childAddress || `Tọa độ: ${effectiveLat.toFixed(4)}, ${effectiveLng.toFixed(4)}`}
            </span>
          </div>
          <div className="flex items-center space-x-2 shrink-0 text-[10px] font-mono text-slate-400 font-medium">
            <span>Zoom {zoom}x</span>
            <span>•</span>
            <span className="text-emerald-600 font-bold">Trực tiếp</span>
          </div>
        </div>
      </div>
    </div>
  );
};
