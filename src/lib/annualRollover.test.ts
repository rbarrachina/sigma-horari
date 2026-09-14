import { describe, expect, it } from 'vitest';
import { createAnnualArchive, getFixedCataloniaHolidays, isAnnualRolloverDue, isCarryoverSelectable, isCarryoverSummaryVisible, prepareDaysForNewYear } from './annualRollover';
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

    expect(Object.keys(prepared)).toEqual(['2027-01-10', '2027-03-01', '2028-01-05']);
    expect(prepared['2027-01-10'].absences?.[0].sourceYear).toBe(2026);
  });

  it('preloads only the Catalonia holidays with a fixed calendar date', () => {
    expect(getFixedCataloniaHolidays(2027)).toEqual([
      '2027-01-01', '2027-01-06', '2027-05-01', '2027-06-24', '2027-09-11',
      '2027-10-12', '2027-11-01', '2027-12-06', '2027-12-08', '2027-12-25',
    ]);
    expect(DEFAULT_USER_CONFIG.holidays).toEqual(getFixedCataloniaHolidays(2026));
  });
});
