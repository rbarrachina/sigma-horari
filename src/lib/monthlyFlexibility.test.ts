import { describe, expect, it } from 'vitest';
import type { DayData, UserConfig } from '@/types';
import { calculateMonthlyFlexibility } from './monthlyFlexibility';

const config: UserConfig = {
  calendarYear: 2026,
  firstName: '',
  defaultStartTime: '08:00',
  defaultEndTime: '15:30',
  weeklyConfig: {
    monday: { dayType: 'presencial' },
    tuesday: { dayType: 'teletreball' },
    wednesday: { dayType: 'presencial' },
    thursday: { dayType: 'teletreball' },
    friday: { dayType: 'presencial' },
  },
  schedulePeriods: [],
  totalVacationDays: 0,
  usedVacationDays: 0,
  totalAPHours: 0,
  usedAPHours: 0,
  flexibilityHours: 0,
  usedFlexHours: 0,
  otherNotes: '',
  holidays: [],
};

function workingDay(date: string, endTime = '15:30'): DayData {
  const day = new Date(`${date}T00:00:00`);
  const keys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const key = keys[day.getDay()] as keyof UserConfig['weeklyConfig'];
  return {
    date,
    startTime: '08:00',
    endTime,
    dayType: config.weeklyConfig[key]?.dayType ?? 'presencial',
    dayStatus: 'laboral',
    requestStatus: null,
  };
}

describe('calculateMonthlyFlexibility', () => {
  it('assigns a cross-month week to the month of its last computable presence day', () => {
    const daysData = Object.fromEntries(
      ['2026-01-26', '2026-01-27', '2026-01-28', '2026-01-29', '2026-01-30']
        .map((date) => [date, workingDay(date, date === '2026-01-30' ? '16:00' : '15:30')])
    );

    const result = calculateMonthlyFlexibility(
      2026,
      daysData,
      config,
      new Date('2026-02-02T12:00:00')
    );

    expect(result[0]).toBe(0.5);
    expect(result[1]).toBe(0);
  });

  it('waits until the last computable presence day has arrived', () => {
    const daysData = Object.fromEntries(
      ['2026-02-02', '2026-02-03', '2026-02-04', '2026-02-05']
        .map((date) => [date, workingDay(date, date === '2026-02-02' ? '16:00' : '15:30')])
    );

    const result = calculateMonthlyFlexibility(
      2026,
      daysData,
      config,
      new Date('2026-02-05T12:00:00')
    );

    expect(result[1]).toBe(0);
  });

  it('uses the previous presence day when Friday is a holiday', () => {
    const holidayConfig = { ...config, holidays: ['2026-02-06'] };
    const daysData = Object.fromEntries(
      ['2026-02-02', '2026-02-03', '2026-02-04', '2026-02-05']
        .map((date) => [date, workingDay(date, date === '2026-02-04' ? '16:00' : '15:30')])
    );

    const result = calculateMonthlyFlexibility(
      2026,
      daysData,
      holidayConfig,
      new Date('2026-02-05T12:00:00')
    );

    expect(result[1]).toBe(0.5);
  });
});
