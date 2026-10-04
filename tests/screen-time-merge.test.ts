import { describe, it, expect } from 'vitest';
import {
  getTodayScreenTime,
  mergeScreenTime,
  createDefaultChildSettings,
  sanitizeRealChildSettings,
  DEFAULT_SCREEN_TIME_LIMIT,
} from '../shared/store';
import type { ScreenTimeData, ChildSpecificSettings } from '../shared/types';

describe('ScreenTime rollover and merge logic', () => {
  it('initializes clean today screen time when given undefined', () => {
    const today = '2026-10-04';
    const res = getTodayScreenTime(undefined, today);
    expect(res.todayTotalMinutes).toBe(0);
    expect(res.usageDate).toBe(today);
    expect(res.dailyLimitMinutes).toBe(DEFAULT_SCREEN_TIME_LIMIT);
    expect(res.hourlyUsage).toHaveLength(24);
  });

  it('preserves usage if usageDate is already today', () => {
    const today = '2026-10-04';
    const st: ScreenTimeData = {
      todayTotalMinutes: 75,
      usageDate: today,
      hourlyUsage: [0, 0, 0, 0, 0, 0, 10, 20, 45, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    };
    const res = getTodayScreenTime(st, today);
    expect(res.todayTotalMinutes).toBe(75);
    expect(res.usageDate).toBe(today);
  });

  it('rolls over yesterday minutes to 0 at midnight and archives in dailyHistory', () => {
    const yesterday = '2026-10-03';
    const today = '2026-10-04';
    const st: ScreenTimeData = {
      todayTotalMinutes: 130,
      usageDate: yesterday,
      dailyHistory: {
        '2026-10-02': 90,
      },
    };
    const res = getTodayScreenTime(st, today);
    expect(res.todayTotalMinutes).toBe(0);
    expect(res.yesterdayTotalMinutes).toBe(130);
    expect(res.usageDate).toBe(today);
    expect(res.dailyHistory?.[yesterday]).toBe(130);
    expect(res.dailyHistory?.['2026-10-02']).toBe(90);
  });

  it('merges screen time on the same date by taking max minutes and max hourly', () => {
    const today = '2026-10-04';
    const stA: ScreenTimeData = {
      todayTotalMinutes: 40,
      usageDate: today,
      hourlyUsage: [10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      appUsage: { 'com.youtube': 30 },
    };
    const stB: ScreenTimeData = {
      todayTotalMinutes: 65,
      usageDate: today,
      hourlyUsage: [5, 20, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      appUsage: { 'com.youtube': 40, 'com.zalo': 25 },
    };
    const merged = mergeScreenTime(stA, stB, today);
    expect(merged.todayTotalMinutes).toBe(65);
    expect(merged.hourlyUsage?.[0]).toBe(10);
    expect(merged.hourlyUsage?.[1]).toBe(20);
    expect(merged.appUsage?.['com.youtube']).toBe(40);
    expect(merged.appUsage?.['com.zalo']).toBe(25);
  });

  it('newer date wins when merging differing dates', () => {
    const yesterday = '2026-10-03';
    const today = '2026-10-04';
    const oldSt: ScreenTimeData = {
      todayTotalMinutes: 120,
      usageDate: yesterday,
    };
    const newSt: ScreenTimeData = {
      todayTotalMinutes: 15,
      usageDate: today,
    };
    const merged = mergeScreenTime(oldSt, newSt, today);
    expect(merged.todayTotalMinutes).toBe(15);
    expect(merged.usageDate).toBe(today);
    expect(merged.dailyHistory?.[yesterday]).toBe(120);
  });
});

describe('Sanitize real child settings and clean defaults', () => {
  it('creates clean defaults for a real child device', () => {
    const realChildId = 'child_muf02v3g6ce';
    const settings = createDefaultChildSettings(realChildId);
    expect(settings.apps).toEqual([]);
    expect(settings.kidStars).toBe(0);
    expect(settings.kidTasks).toEqual([]);
    expect(settings.alarms).toEqual([]);
    expect(settings.scheduleEvents).toEqual([]);
    expect(settings.emergencyContact?.parentPhone).toBe('');
    expect(settings.screenTimeLimitMinutes).toBe(DEFAULT_SCREEN_TIME_LIMIT);
  });

  it('strips mock alarms, mock tasks, and mock phone from real child settings', () => {
    const realChildId = 'child_muf02v3g6ce';
    const dirtySettings: Partial<ChildSpecificSettings> = {
      alarms: [
        { id: 'alarm_1', label: 'Thức dậy đi học', time: '06:00', repeatDays: [1, 2, 3], isEnabled: true, childId: realChildId },
        { id: 'custom_alarm', label: 'Báo thức của bé', time: '07:00', repeatDays: [1], isEnabled: true, childId: realChildId },
      ],
      kidTasks: [
        { id: 'tsk_1', title: 'Học bài', subject: 'Toán', stars: 5, completed: false },
        { id: 'real_task_99', title: 'Rửa bát', subject: 'Nhà', stars: 3, completed: false },
      ],
      emergencyContact: {
        parentPhone: '0987654321',
        allowedApps: ['phone'],
      },
      kidStars: 28,
      starHistory: [
        { id: 'tx_1', childId: realChildId, stars: 5, type: 'earned', timestamp: '12:00', title: 'Test' },
      ],
    };

    const cleaned = sanitizeRealChildSettings(dirtySettings, realChildId);
    expect(cleaned.alarms).toHaveLength(1);
    expect(cleaned.alarms?.[0].id).toBe('custom_alarm');
    expect(cleaned.kidTasks).toHaveLength(1);
    expect(cleaned.kidTasks?.[0].id).toBe('real_task_99');
    expect(cleaned.emergencyContact?.parentPhone).toBe('');
    expect(cleaned.kidStars).toBe(0);
    expect(cleaned.starHistory).toEqual([]);
  });
});
