import { describe, expect, it } from 'vitest';
import { createAnnualArchive, createNextYearConfig, getFixedCataloniaHolidays, isAnnualRolloverDue, isCarryoverSelectable, isCarryoverSummaryVisible, prepareDaysForNewYear } from './annualRollover';
import { DEFAULT_USER_CONFIG } from './constants';

describe('annual rollover dates', () => {
  it('asks only after the configured year', () => {
    expect(isAnnualRolloverDue(DEFAULT_USER_CONFIG, new Date(2026, 11, 31))).toBe(false);
    expect(isAnnualRolloverDue(DEFAULT_USER_CONFIG, new Date(2027, 0, 1))).toBe(true);
  });

  it('allows carryover on dated entries through January 15', () => {
    expect(isCarryoverSelectable(2026, new Date(2027, 0, 15))).toBe(true);
    expect(isCarryoverSelectable(2026, new Date(2027, 0, 16))).toBe(false);
  });

  it('keeps the summary for all January and hides it in February', () => {
    expect(isCarryoverSummaryVisible(2026, new Date(2027, 0, 31))).toBe(true);
    expect(isCarryoverSummaryVisible(2026, new Date(2027, 1, 1))).toBe(false);
  });

  it('restores January entries into the maximum transferable balance', () => {
    const config = { ...DEFAULT_USER_CONFIG, usedAPHours: 84 };
    const archive = createAnnualArchive(config, new Date(2027, 0, 10), {
      '2027-01-08': {
        date: '2027-01-08', startTime: null, endTime: null, dayType: 'presencial',
        dayStatus: 'assumpte_propi', requestStatus: 'aprovat',
        absences: [{ type: 'assumpte_propi', hours: 2, requestStatus: 'aprovat' }],
      },
    });
    expect(archive.remainingAPHours).toBe(6);
    expect(archive.transferredAPHours).toBe(8);
  });

  it('removes old daily records but keeps days relevant to the new calendar', () => {
    const makeDay = (date: string) => ({
      date, startTime: null, endTime: null, dayType: 'presencial' as const,
      dayStatus: 'laboral' as const, requestStatus: null,
    });
    const prepared = prepareDaysForNewYear({
      '2026-12-27': makeDay('2026-12-27'),
      '2026-12-28': makeDay('2026-12-28'),
      '2026-12-31': makeDay('2026-12-31'),
      '2027-01-10': {
        ...makeDay('2027-01-10'),
        dayStatus: 'assumpte_propi',
        absences: [{ type: 'assumpte_propi', hours: 2, requestStatus: 'aprovat' }],
      },
      '2027-03-01': makeDay('2027-03-01'),
      '2028-01-05': makeDay('2028-01-05'),
      '2028-02-01': makeDay('2028-02-01'),
    }, 2026, 2027);

    expect(Object.keys(prepared)).toEqual(['2026-12-28', '2026-12-31', '2027-01-10', '2027-03-01', '2028-01-05']);
    expect(prepared['2027-01-10'].absences?.[0].sourceYear).toBe(2026);
  });

  it('preloads only the Catalonia holidays with a fixed calendar date', () => {
    expect(getFixedCataloniaHolidays(2027)).toEqual([
      '2027-01-01', '2027-01-06', '2027-05-01', '2027-06-24', '2027-09-11',
      '2027-10-12', '2027-11-01', '2027-12-06', '2027-12-08', '2027-12-25',
    ]);
    expect(DEFAULT_USER_CONFIG.holidays).toEqual(getFixedCataloniaHolidays(2026));
  });

  it('keeps only the manual summary shared with the first week of the new year', () => {
    const config = {
      ...DEFAULT_USER_CONFIG,
      manualWeeklySummaries: {
        '2026-12-21': { weekStart: '2026-12-21', theoreticalHours: 35, workedHours: 35 },
        '2026-12-28': { weekStart: '2026-12-28', theoreticalHours: 28, workedHours: 28 },
      },
    };

    const next = createNextYearConfig(config, 2027, {
      totalVacationDays: 25,
      totalAPHours: 90,
    }, new Date(2027, 0, 1));

    expect(Object.keys(next.manualWeeklySummaries || {})).toEqual(['2026-12-28']);
  });

  it('keeps January AP, FX and other entries while charging carryovers to the previous year', () => {
    const config = {
      ...DEFAULT_USER_CONFIG,
      usedAPHours: 12,
      flexibilityHours: 20,
      usedFlexHours: 5,
    };
    const makeJanuaryDay = (date: string, absence: {
      type: 'assumpte_propi' | 'flexibilitat' | 'altres';
      hours: number;
      comment?: string;
      requestStatus: 'aprovat';
    }) => ({
      date,
      startTime: null,
      endTime: null,
      dayType: 'presencial' as const,
      dayStatus: absence.type,
      requestStatus: 'aprovat' as const,
      absences: [absence],
    });
    const januaryDays = {
      '2027-01-08': makeJanuaryDay('2027-01-08', { type: 'assumpte_propi', hours: 2, requestStatus: 'aprovat' }),
      '2027-01-11': makeJanuaryDay('2027-01-11', { type: 'flexibilitat', hours: 1, requestStatus: 'aprovat' }),
      '2027-01-12': makeJanuaryDay('2027-01-12', { type: 'altres', hours: 1, comment: 'Visita mèdica', requestStatus: 'aprovat' }),
    };

    const next = createNextYearConfig(config, 2027, {
      totalVacationDays: 25,
      totalAPHours: 90,
    }, new Date(2027, 0, 8), januaryDays);
    const prepared = prepareDaysForNewYear(januaryDays, 2026, 2027);
    const archive = next.annualArchives?.find(item => item.year === 2026);

    expect(next.usedAPHours).toBe(0);
    expect(next.usedFlexHours).toBe(0);
    expect(archive?.remainingAPHours).toBe(78);
    expect(archive?.transferredAPHours).toBe(80);
    expect(archive?.remainingFlexHours).toBe(15);
    expect(archive?.transferredFlexHours).toBe(16);
    expect(prepared['2027-01-08'].absences?.[0].sourceYear).toBe(2026);
    expect(prepared['2027-01-11'].absences?.[0].sourceYear).toBe(2026);
    expect(prepared['2027-01-12'].absences?.[0].comment).toBe('Visita mèdica');
  });
});
