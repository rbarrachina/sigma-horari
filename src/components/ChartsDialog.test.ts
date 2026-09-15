import { describe, expect, it } from 'vitest';
import { DEFAULT_USER_CONFIG } from '@/lib/constants';
import type { DayData, UserConfig } from '@/types';
import { calculateMonthlyBalance } from './ChartsDialog';

describe('calculateMonthlyBalance', () => {
  it('replaces daily worked hours with the manual weekly summary without duplicating them', () => {
    const weekDates = ['2026-09-14', '2026-09-15', '2026-09-16', '2026-09-17', '2026-09-18'];
    const daysData = Object.fromEntries(weekDates.map((date) => [date, {
      date,
      startTime: '08:00',
      endTime: '15:00',
      dayType: 'presencial',
      dayStatus: 'laboral',
      requestStatus: null,
    } satisfies DayData]));
    const config: UserConfig = {
      ...DEFAULT_USER_CONFIG,
      manualWeeklySummaries: {
        '2026-09-14': {
          weekStart: '2026-09-14',
          theoreticalHours: 35,
          workedHours: 35.85,
        },
      },
    };

    const september = calculateMonthlyBalance(config, daysData, new Date(2026, 8, 30))[8];

    expect(september.worked).toBe(35.85);
  });
});
