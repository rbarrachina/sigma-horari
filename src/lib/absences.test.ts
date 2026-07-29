import { describe, expect, it } from 'vitest';
import type { DayData } from '@/types';
import {
  getAbsenceHours,
  getDayAbsences,
  getLegacyRequestStatus,
  getTotalPartialAbsenceHours,
  hasApprovedAbsence,
  hasPendingAbsence,
} from './absences';
import { calculateTotalWorkedHours } from './timeCalculations';

const baseDay: DayData = {
  date: '2026-08-28',
  startTime: null,
  endTime: null,
  dayType: 'teletreball',
  dayStatus: 'flexibilitat',
  requestStatus: 'pendent',
};

describe('multiple absences', () => {
  it('keeps legacy single-absence days compatible', () => {
    const legacyDay = { ...baseDay, flexHours: 3 };

    expect(getDayAbsences(legacyDay)).toEqual([{
      type: 'flexibilitat',
      hours: 3,
      comment: undefined,
      requestStatus: 'pendent',
    }]);
  });

  it('adds both absence types to the worked total', () => {
    const day: DayData = {
      ...baseDay,
      absences: [
        { type: 'flexibilitat', hours: 3, requestStatus: 'aprovat' },
        { type: 'altres', hours: 4, requestStatus: 'pendent' },
      ],
    };

    expect(getAbsenceHours(day, 'flexibilitat')).toBe(3);
    expect(getAbsenceHours(day, 'altres')).toBe(4);
    expect(getTotalPartialAbsenceHours(day)).toBe(7);
    expect(calculateTotalWorkedHours(day)).toBe(7);
  });

  it('tracks approval independently while preserving a legacy aggregate status', () => {
    const absences = [
      { type: 'flexibilitat' as const, hours: 3, requestStatus: 'aprovat' as const },
      { type: 'altres' as const, hours: 4, requestStatus: 'pendent' as const },
    ];
    const day: DayData = { ...baseDay, absences };

    expect(hasPendingAbsence(day)).toBe(true);
    expect(hasApprovedAbsence(day)).toBe(false);
    expect(getLegacyRequestStatus(absences)).toBe('pendent');
  });
});
