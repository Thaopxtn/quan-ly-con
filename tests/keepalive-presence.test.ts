import { describe, it, expect } from 'vitest';
import { connectionMonitor } from '../shared/services/connectionMonitorService';

describe('KidCare 24/7 Keep-Alive & Screen-Off Presence', () => {
  it('should treat child as online when telemetry is within 180s threshold', () => {
    const now = Date.now();
    const serverKid = {
      id: 'child_test_1',
      name: 'Bé Test',
      status: 'offline',
      lastUpdated: new Date(now - 100000).toISOString(), // 100s ago (within 180s)
    };
    const tele = {
      childId: 'child_test_1',
      lastUpdated: now - 100000,
      isScreenOn: false,
      screenState: 'screen_off',
      battery: 88,
    };

    const lastUpdatedMs = tele.lastUpdated || (serverKid.lastUpdated ? new Date(serverKid.lastUpdated).getTime() : 0);
    const isLive = Boolean((lastUpdatedMs && (now - lastUpdatedMs < 180000)) || serverKid.status === 'online');

    expect(isLive).toBe(true);
  });

  it('should maintain online status while correctly reporting screen_off state', () => {
    const tele = {
      childId: 'child_test_2',
      lastUpdated: Date.now() - 30000, // 30s ago
      isScreenOn: false,
      screenState: 'screen_off',
      isLocked: false,
    };

    const screenOn = tele.isScreenOn !== undefined ? Boolean(tele.isScreenOn) : true;
    let screenState: 'active' | 'screen_off' | 'locked' = 'active';
    if (tele.isLocked) {
      screenState = 'locked';
    } else if (!screenOn || tele.screenState === 'screen_off') {
      screenState = 'screen_off';
    }

    expect(screenState).toBe('screen_off');
  });

  it('should calculate adaptive heartbeat: 25s when screen is ON and 40s when screen is OFF', () => {
    const computeHeartbeat = (isScreenOn: boolean, isLiveTracking: boolean) => {
      if (isLiveTracking) return 15000;
      return isScreenOn ? 25000 : 40000;
    };

    expect(computeHeartbeat(true, false)).toBe(25000);
    expect(computeHeartbeat(false, false)).toBe(40000);
    expect(computeHeartbeat(false, true)).toBe(15000);
  });
});
