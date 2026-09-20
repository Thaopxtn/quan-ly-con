import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { useAppState, syncWithCloudForChild, syncAllChildrenFromCloud, requestLatestDataFromAllChildren, isSimulatorMode, getActiveParentId } from '@shared/store';
import { ParentBottomNav, ParentTab } from './components/ParentBottomNav';
import { WelcomeAuthScreen } from './modules/auth/WelcomeAuthScreen';
import { DashboardScreen } from './modules/dashboard/DashboardScreen';

// Lazy load heavy hub modules to achieve instant cold start and minimal memory footprint
import type { TrackingTab } from './modules/tracking/TrackingHubScreen';
import type { UsageControlTab } from './modules/screentime/UsageControlHubScreen';
import type { ReportsTab } from './modules/reports/ReportsHubScreen';
import type { FamilyTab } from './modules/family/FamilyHubScreen';

const TrackingHubScreen = lazy(() => import('./modules/tracking/TrackingHubScreen').then((m) => ({ default: m.TrackingHubScreen })));
const UsageControlHubScreen = lazy(() => import('./modules/screentime/UsageControlHubScreen').then((m) => ({ default: m.UsageControlHubScreen })));
const ReportsHubScreen = lazy(() => import('./modules/reports/ReportsHubScreen').then((m) => ({ default: m.ReportsHubScreen })));
const FamilyHubScreen = lazy(() => import('./modules/family/FamilyHubScreen').then((m) => ({ default: m.FamilyHubScreen })));
const AlertsScreen = lazy(() => import('./modules/alerts/AlertsScreen').then((m) => ({ default: m.AlertsScreen })));
const AIAssistantScreen = lazy(() => import('./modules/ai/AIAssistantScreen').then((m) => ({ default: m.AIAssistantScreen })));
const SosMonitorScreen = lazy(() => import('./modules/sos/SosMonitorScreen').then((m) => ({ default: m.SosMonitorScreen })));
const PremiumScreen = lazy(() => import('./modules/premium/PremiumScreen').then((m) => ({ default: m.PremiumScreen })));
const SettingsScreen = lazy(() => import('./modules/settings/SettingsScreen').then((m) => ({ default: m.SettingsScreen })));
const RemoteControlCenter = lazy(() => import('./modules/remote/RemoteControlCenter').then((m) => ({ default: m.RemoteControlCenter })));
const PcControlCenter = lazy(() => import('./modules/pc/PcControlCenter').then((m) => ({ default: m.PcControlCenter })));

import { SystemNotificationBanner } from './components/SystemNotificationBanner';
import { CommandFeedbackBanner } from './components/CommandFeedbackBanner';
import { notifyEmergencyAlert, requestSystemNotificationPermission } from '@shared/services/systemNotificationService';
import { PrivacyPolicyModal } from '../../shared/components/PrivacyPolicyModal';
import { OfflineBanner } from '@shared/components/OfflineBanner';
import { haptics } from '@shared/utils/haptics';
import { BellRing, FileText } from 'lucide-react';
import { getCurrentParentAccount, logoutParentAccount } from '@shared/firebase/firebaseService';
import { DebugLogModal } from '@shared/components/DebugLogModal';
import { debugLogService } from '@shared/services/debugLogService';
import { ErrorBoundary } from '@shared/components/ErrorBoundary';

export type ScreenId =
  | 'welcome'
  | 'dashboard'
  | 'tracking'
  | 'screentime'
  | 'reports'
  | 'alerts'
  | 'family'
  | 'ai'
  | 'sos'
  | 'premium'
  | 'settings'
  | 'remote'
  | 'pc_control';

export const ScreenShimmer: React.FC = () => (
  <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-4 animate-pulse">
    <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center shadow-sm">
      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
    <div className="h-4 bg-slate-200 rounded-full w-36" />
    <div className="h-3 bg-slate-100 rounded-full w-52" />
  </div>
);

export interface ParentAppProps {
  initialScreen?: ScreenId;
  onScreenChangeExternal?: (screenId: ScreenId) => void;
  isDesktopWeb?: boolean;
  activeScreenExternal?: ScreenId;
}

export const ParentApp: React.FC<ParentAppProps> = ({
  initialScreen = 'dashboard',
  onScreenChangeExternal,
  isDesktopWeb = false,
  activeScreenExternal,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!getCurrentParentAccount());
  const [currentScreen, setCurrentScreen] = useState<ScreenId>(activeScreenExternal || initialScreen);
  const [trackingTab, setTrackingTab] = useState<TrackingTab>('live');
  const [usageTab, setUsageTab] = useState<UsageControlTab>('screentime');
  const [reportsTab, setReportsTab] = useState<ReportsTab>('overview');
  const [familyTab, setFamilyTab] = useState<FamilyTab>('members');

  const [isPrivacyAccepted, setIsPrivacyAccepted] = useState(() => {
    return localStorage.getItem('parentpro_privacy_policy_accepted_v1') === 'true';
  });
  const { state, decideTimeRequest, cancelSOS, switchChild } = useAppState();

  const handleLogout = () => {
    logoutParentAccount();
    setIsAuthenticated(false);
  };
  const { activeSOS, alerts, timeRequests, selectedChildId, children, child, sosDetails } = state;
  const currentChild = children?.find((c) => c.id === selectedChildId) || child;
  const [isSosBannerDismissed, setIsSosBannerDismissed] = useState(false);
  const [showDebugModal, setShowDebugModal] = useState(false);
  const [errorCount, setErrorCount] = useState(() => debugLogService.getErrorCount());

  useEffect(() => {
    return debugLogService.subscribe(() => {
      setErrorCount(debugLogService.getErrorCount());
    });
  }, []);

  // Reset banner dismissal when SOS is deactivated
  useEffect(() => {
    if (!activeSOS) {
      setIsSosBannerDismissed(false);
    }
  }, [activeSOS]);

  // Sync with Cloud for active parent and children (deferred 300ms to free up launch thread)
  useEffect(() => {
    const parentId = getActiveParentId();
    
    let timer: any = null;
    if (parentId) {
      timer = setTimeout(() => {
        syncWithCloudForChild(parentId, selectedChildId);
        const childrenToSync = state.children && state.children.length > 0 ? state.children : (state.child ? [state.child] : []);
        if (childrenToSync.length > 0) {
          requestLatestDataFromAllChildren(parentId, childrenToSync);
        }
        syncAllChildrenFromCloud(parentId).then((cloudChildren) => {
          if (cloudChildren && cloudChildren.length > 0) {
            requestLatestDataFromAllChildren(parentId, cloudChildren);
          }
        });
      }, 300);
    }

    // Auto re-sync and request fresh data when app resumes or gains focus (throttled to at most once every 30s)
    let lastFocusSync = 0;
    const handleFocus = () => {
      if (document.visibilityState === 'hidden') return;
      const now = Date.now();
      if (now - lastFocusSync < 30000) return;
      lastFocusSync = now;

      if (parentId) {
        const childrenToSync = state.children && state.children.length > 0 ? state.children : (state.child ? [state.child] : []);
        if (childrenToSync.length > 0) {
          requestLatestDataFromAllChildren(parentId, childrenToSync);
        }
      }
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [selectedChildId, isAuthenticated]);

  useEffect(() => {
    if (activeScreenExternal && activeScreenExternal !== currentScreen) {
      setCurrentScreen(activeScreenExternal);
    }
  }, [activeScreenExternal]);

  useEffect(() => {
    if (initialScreen) {
      setCurrentScreen(initialScreen);
    }
  }, [initialScreen]);

  // Request system notification permission when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      requestSystemNotificationPermission().catch(() => {});
    }
  }, [isAuthenticated]);

  const lastEmergencyNotifiedTimeRef = useRef<number>(0);

  // When child triggers SOS, post standard system notification & show floating banner
  useEffect(() => {
    if (activeSOS) {
      setIsSosBannerDismissed(false);
      const now = Date.now();
      // Debounce siren & notification popups: fire only once per SOS episode (minimum 15s interval)
      if (now - lastEmergencyNotifiedTimeRef.current > 15000) {
        lastEmergencyNotifiedTimeRef.current = now;
        notifyEmergencyAlert(
          sosDetails?.childName || currentChild?.name || 'Bé',
          sosDetails?.address,
          sosDetails?.time
        );
      }
    } else {
      lastEmergencyNotifiedTimeRef.current = 0;
    }
  }, [activeSOS, sosDetails?.childName, currentChild?.name, sosDetails?.address, sosDetails?.time]);

  // Intelligent navigation router supporting both direct screens and sub-tab targets
  const handleNavigate = (screen: string) => {
    haptics.light();

    // 1. Location & Tracking Hub sub-routes
    if (screen === 'safezone') {
      setTrackingTab('safezone');
      setCurrentScreen('tracking');
      if (onScreenChangeExternal) onScreenChangeExternal('tracking');
      return;
    }
    if (screen === 'history') {
      setTrackingTab('history');
      setCurrentScreen('tracking');
      if (onScreenChangeExternal) onScreenChangeExternal('tracking');
      return;
    }
    if (screen === 'tracking') {
      setTrackingTab('live');
      setCurrentScreen('tracking');
      if (onScreenChangeExternal) onScreenChangeExternal('tracking');
      return;
    }

    // 2. Usage & App Control Hub sub-routes
    if (screen === 'apps') {
      setUsageTab('apps');
      setCurrentScreen('screentime');
      if (onScreenChangeExternal) onScreenChangeExternal('screentime');
      return;
    }
    if (screen === 'content') {
      setUsageTab('content');
      setCurrentScreen('screentime');
      if (onScreenChangeExternal) onScreenChangeExternal('screentime');
      return;
    }
    if (screen === 'screentime') {
      setUsageTab('screentime');
      setCurrentScreen('screentime');
      if (onScreenChangeExternal) onScreenChangeExternal('screentime');
      return;
    }

    // 3. Reports, Learning & Health Hub sub-routes
    if (screen === 'learning') {
      setReportsTab('learning');
      setCurrentScreen('reports');
      if (onScreenChangeExternal) onScreenChangeExternal('reports');
      return;
    }
    if (screen === 'health') {
      setReportsTab('health');
      setCurrentScreen('reports');
      if (onScreenChangeExternal) onScreenChangeExternal('reports');
      return;
    }
    if (screen === 'reports') {
      setReportsTab('overview');
      setCurrentScreen('reports');
      if (onScreenChangeExternal) onScreenChangeExternal('reports');
      return;
    }

    // 4. Family & Devices Hub sub-routes
    if (screen === 'devices') {
      setFamilyTab('devices');
      setCurrentScreen('family');
      if (onScreenChangeExternal) onScreenChangeExternal('family');
      return;
    }
    if (screen === 'family') {
      setFamilyTab('members');
      setCurrentScreen('family');
      if (onScreenChangeExternal) onScreenChangeExternal('family');
      return;
    }

    if (screen === 'pc_control' || screen === 'pc') {
      setCurrentScreen('pc_control');
      if (onScreenChangeExternal) onScreenChangeExternal('pc_control');
      return;
    }

    const s = screen as ScreenId;
    setCurrentScreen(s);
    if (onScreenChangeExternal) onScreenChangeExternal(s);
  };

  const handleTabChange = (tab: ParentTab) => {
    haptics.light();
    setCurrentScreen(tab as ScreenId);
    if (tab === 'tracking') setTrackingTab('live');
    if (tab === 'reports') setReportsTab('overview');
    if (onScreenChangeExternal) onScreenChangeExternal(tab as ScreenId);
  };

  // Determine active bottom tab based on current screen
  const getActiveTab = (): ParentTab => {
    if (currentScreen === 'dashboard') return 'dashboard';
    if (currentScreen === 'tracking') return 'tracking';
    if (currentScreen === 'reports' || currentScreen === 'screentime') return 'reports';
    if (currentScreen === 'alerts') return 'alerts';
    if (currentScreen === 'settings') return 'settings';
    return 'dashboard';
  };

  const unreadAlertCount = alerts.filter((a) => !a.isRead).length;
  const pendingTimeRequests = timeRequests.filter((r) => r.status === 'pending');
  const pendingTimeRequest = pendingTimeRequests[0];

  // If user is authenticated, ensure we are not on welcome screen
  useEffect(() => {
    if (isAuthenticated && currentScreen === 'welcome') {
      setCurrentScreen('dashboard');
    }
  }, [isAuthenticated, currentScreen]);

  if (!isAuthenticated || !getCurrentParentAccount()) {
    return (
      <WelcomeAuthScreen
        onLoginSuccess={() => {
          setIsAuthenticated(true);
          setCurrentScreen('dashboard');
        }}
      />
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 relative overflow-hidden">
      {/* Smart Offline Detection Banner */}
      <OfflineBanner />

      {/* Native Status Bar Spacer for Android status bar, notch & hole-punch camera */}
      {!isSimulatorMode() && (
        <div
          className="w-full shrink-0 bg-slate-50 transition-all pointer-events-none"
          style={{ height: 'var(--status-bar-height, 42px)' }}
        />
      )}

      {/* Standard Non-blocking Floating Emergency Alert Banner */}
      {(() => {
        const sosChild = sosDetails?.childId ? (children?.find(c => c.id === sosDetails.childId) || currentChild) : currentChild;
        const sosName = sosDetails?.childName || sosChild?.name || 'Bé';
        return (
          <SystemNotificationBanner
            isVisible={!!activeSOS && !isSosBannerDismissed}
            childName={sosName}
            childAvatar={sosChild?.avatar}
            childPhone={sosChild?.phone || '0987654321'}
            time={sosDetails?.time}
            address={sosDetails?.address}
            onDismiss={() => {
              setIsSosBannerDismissed(true);
              cancelSOS(sosDetails?.childId);
            }}
            onOpenMap={() => {
              if (sosDetails?.childId) {
                switchChild(sosDetails.childId);
              }
              setTrackingTab('live');
              setCurrentScreen('tracking');
              if (onScreenChangeExternal) onScreenChangeExternal('tracking');
            }}
          />
        );
      })()}

      {/* Real-time Command Feedback Banner */}
      <CommandFeedbackBanner />

      {/* Pending Child Time Request Banner */}
      {pendingTimeRequest && currentScreen !== 'sos' && (
        <div className="bg-amber-500 text-white px-4 py-2 flex items-center justify-between text-xs z-30 shadow-md animate-bounce">
          <div className="flex items-center space-x-2 truncate">
            <BellRing size={15} className="shrink-0" />
            <span className="truncate">
              <strong>{pendingTimeRequest.childName}</strong> xin {pendingTimeRequest.requestedMinutes === -1 ? 'mở máy đến khi khóa' : `thêm ${pendingTimeRequest.requestedMinutes}p`} ({pendingTimeRequest.appName})
              {pendingTimeRequests.length > 1 && (
                <span className="ml-1.5 px-1.5 py-0.5 bg-amber-700/80 text-[10px] rounded-full font-bold">
                  +{pendingTimeRequests.length - 1} bé khác
                </span>
              )}
            </span>
          </div>
          <div className="flex items-center space-x-1.5 shrink-0 ml-2">
            <button
              onClick={() => decideTimeRequest(pendingTimeRequest.id, 'approved')}
              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] shadow-xs active:scale-95 transition"
            >
              {pendingTimeRequest.requestedMinutes === -1 ? 'Mở máy' : `Duyệt +${pendingTimeRequest.requestedMinutes}p`}
            </button>
            <button
              onClick={() => decideTimeRequest(pendingTimeRequest.id, 'rejected')}
              className="px-2.5 py-1 bg-white/20 hover:bg-white/30 text-white rounded-lg font-bold text-[11px] active:scale-95 transition"
            >
              Từ chối
            </button>
          </div>
        </div>
      )}

      {/* Screen Views - Clean Unified Hubs with Code-Splitting */}
      <div className={`flex-1 flex flex-col overflow-y-auto ${isDesktopWeb ? 'pb-6' : 'pb-[max(84px,calc(68px+env(safe-area-inset-bottom)))]'}`}>
        <ErrorBoundary
          fallbackTitle="Lỗi hiển thị màn hình"
          fallbackMessage="Đang xảy ra sự cố hiển thị. Vui lòng bấm Thử lại hoặc Quay về Trang chủ."
          onGoHome={() => setCurrentScreen('dashboard')}
        >
          <Suspense fallback={<ScreenShimmer />}>
            {(currentScreen === 'welcome' || currentScreen === 'dashboard') && (
              <DashboardScreen onNavigate={handleNavigate} />
            )}

            {/* 1. Location & Safety Hub */}
            {currentScreen === 'tracking' && (
              <ErrorBoundary
                fallbackTitle="Không thể tải Bản đồ Vị trí"
                fallbackMessage="Đang kết nối lại với vệ tinh GPS của bé..."
                onGoHome={() => setCurrentScreen('dashboard')}
              >
                <TrackingHubScreen
                  onBack={() => setCurrentScreen('dashboard')}
                  initialTab={trackingTab}
                  onNavigate={handleNavigate}
                />
              </ErrorBoundary>
            )}

            {/* 2. Screen Time & App Usage Control Hub */}
            {currentScreen === 'screentime' && (
              <UsageControlHubScreen
                onBack={() => setCurrentScreen('dashboard')}
                initialTab={usageTab}
                onNavigate={handleNavigate}
              />
            )}

            {/* 3. Reports, Learning & Health Hub */}
            {currentScreen === 'reports' && (
              <ReportsHubScreen
                onBack={() => setCurrentScreen('dashboard')}
                initialTab={reportsTab}
                onNavigate={handleNavigate}
              />
            )}

            {/* 4. Family Members & Smart Devices Hub */}
            {currentScreen === 'family' && (
              <FamilyHubScreen
                onBack={() => setCurrentScreen('dashboard')}
                initialTab={familyTab}
                onNavigate={handleNavigate}
              />
            )}

            {/* 5. Alerts & Notifications */}
            {currentScreen === 'alerts' && (
              <AlertsScreen
                onBack={() => setCurrentScreen('dashboard')}
                onNavigate={handleNavigate}
              />
            )}

            {/* 6. Remote Control & Live Inspection Center */}
            {currentScreen === 'remote' && (
              <RemoteControlCenter onBack={() => setCurrentScreen('dashboard')} />
            )}

            {/* 6.5. PC Remote Control & Management */}
            {currentScreen === 'pc_control' && (
              <PcControlCenter onBack={() => setCurrentScreen('dashboard')} />
            )}

            {/* 7. AI Assistant */}
            {currentScreen === 'ai' && (
              <AIAssistantScreen onBack={() => setCurrentScreen('dashboard')} />
            )}

            {/* 8. Emergency SOS Screen */}
            {currentScreen === 'sos' && (
              <SosMonitorScreen
                onBack={() => setCurrentScreen('dashboard')}
                onNavigate={handleNavigate}
              />
            )}

            {/* 9. Premium Membership */}
            {currentScreen === 'premium' && (
              <PremiumScreen onBack={() => setCurrentScreen('dashboard')} />
            )}

            {/* 10. Settings & Account */}
            {currentScreen === 'settings' && (
              <SettingsScreen
                onBack={() => setCurrentScreen('dashboard')}
                onLogout={handleLogout}
              />
            )}
          </Suspense>
        </ErrorBoundary>
      </div>

      {/* Bottom Navigation (Visible on main screens for mobile, hidden on desktop web) */}
      {!isDesktopWeb && currentScreen !== 'sos' && currentScreen !== 'welcome' && currentScreen !== 'premium' && (
        <ParentBottomNav
          activeTab={getActiveTab()}
          onTabChange={handleTabChange}
          unreadAlertCount={unreadAlertCount}
        />
      )}

      {/* Mandatory Privacy Policy Acceptance for Parent */}
      <PrivacyPolicyModal
        isOpen={!isPrivacyAccepted}
        role="parent"
        isViewOnly={false}
        onAccept={() => setIsPrivacyAccepted(true)}
      />

      {/* Floating Diagnostics / Debug Button for Mobile Parent App */}
      {!isDesktopWeb && currentScreen !== 'welcome' && (
        <button
          type="button"
          onClick={() => setShowDebugModal(true)}
          className="relative fixed bottom-20 right-4 z-40 p-2.5 bg-slate-900/90 hover:bg-slate-900 text-white rounded-2xl shadow-xl backdrop-blur-md border border-slate-700/50 flex items-center gap-1.5 text-[11px] font-bold cursor-pointer active:scale-95 transition-all"
          title="Nhật ký truyền nhận dữ liệu 2 chiều & Gỡ lỗi"
        >
          <FileText size={15} className={errorCount > 0 ? "text-rose-400" : "text-emerald-400"} />
          <span className="text-[10px]">Debug</span>
          {errorCount > 0 && (
            <span className="px-1.5 py-0.2 bg-rose-500 text-white rounded-full text-[9px] font-black animate-pulse">
              {errorCount}
            </span>
          )}
        </button>
      )}

      {/* Real-time Diagnostics & Debug Log Modal */}
      <DebugLogModal
        isOpen={showDebugModal}
        onClose={() => setShowDebugModal(false)}
        childId={currentChild?.id}
        childName={currentChild?.name}
      />
    </div>
  );
};
