import { format } from 'date-fns';
import type { AnnualArchive, DayData, SchedulePeriod, UserConfig } from '@/types';
import { getDayAbsences } from './absences';

export function isAnnualRolloverDue(config: UserConfig, today: Date): boolean {
  return today.getFullYear() > config.calendarYear;
}

export function isCarryoverSelectable(sourceYear: number, absenceDate: Date): boolean {
  return absenceDate.getFullYear() === sourceYear + 1
    && absenceDate.getMonth() === 0
    && absenceDate.getDate() <= 15;
}

export function isCarryoverSummaryVisible(sourceYear: number, today: Date): boolean {
  return today.getFullYear() === sourceYear + 1 && today.getMonth() === 0;
}

function shiftDate(date: string, targetYear: number): string {
  const [, month, day] = date.split('-').map(Number);
  const shifted = new Date(targetYear, month - 1, day);
  if (shifted.getMonth() !== month - 1) shifted.setDate(0);
  return format(shifted, 'yyyy-MM-dd');
}

function shiftPeriods(periods: SchedulePeriod[], targetYear: number): SchedulePeriod[] {
  return periods.map((period, index) => ({
    ...period,
    id: `annual-${targetYear}-${index + 1}`,
    startDate: shiftDate(period.startDate, targetYear),
    endDate: shiftDate(period.endDate, targetYear),
  }));
}

export function getFixedCataloniaHolidays(year: number): string[] {
  return [
    '01-01',
    '01-06',
    '05-01',
    '06-24',
    '09-11',
    '10-12',
    '11-01',
    '12-06',
    '12-08',
    '12-25',
  ].map(monthDay => `${year}-${monthDay}`);
}

export function createAnnualArchive(
  config: UserConfig,
  closedAt: Date,
  daysData: Record<string, DayData> = {},
): AnnualArchive {
  const januaryPrefix = `${config.calendarYear + 1}-01-`;
  const januaryAbsences = Object.entries(daysData)
    .filter(([date]) => date.startsWith(januaryPrefix))
    .flatMap(([, day]) => getDayAbsences(day));
  const januaryAPHours = januaryAbsences
    .filter(absence => absence.type === 'assumpte_propi')
    .reduce((sum, absence) => sum + (absence.hours || 0), 0);
  const januaryFlexHours = januaryAbsences
    .filter(absence => absence.type === 'flexibilitat')
    .reduce((sum, absence) => sum + (absence.hours || 0), 0);
  const remainingAPHours = Math.max(0, config.totalAPHours - config.usedAPHours);
  const remainingFlexHours = Math.max(0, config.flexibilityHours - config.usedFlexHours);
  const transferredAPHours = remainingAPHours + januaryAPHours;
  const transferredFlexHours = remainingFlexHours + januaryFlexHours;
  return {
    year: config.calendarYear,
    totalVacationDays: config.totalVacationDays,
    usedVacationDays: config.usedVacationDays,
    totalAPHours: config.totalAPHours,
    usedAPHours: config.usedAPHours,
    totalFlexHours: config.flexibilityHours,
    usedFlexHours: config.usedFlexHours,
    transferredAPHours,
    transferredFlexHours,
    remainingAPHours,
    remainingFlexHours,
    closedAt: closedAt.toISOString(),
  };
}

export function createNextYearConfig(
  config: UserConfig,
  targetYear: number,
  totals: { totalVacationDays: number; totalAPHours: number },
  closedAt: Date,
  daysData: Record<string, DayData> = {},
): UserConfig {
  const archive = createAnnualArchive(config, closedAt, daysData);
  return {
    ...config,
    calendarYear: targetYear,
    totalVacationDays: totals.totalVacationDays,
    usedVacationDays: 0,
    totalAPHours: totals.totalAPHours,
    usedAPHours: 0,
    flexibilityHours: 0,
    usedFlexHours: 0,
    schedulePeriods: shiftPeriods(config.schedulePeriods, targetYear),
    holidays: getFixedCataloniaHolidays(targetYear),
    manualWeeklySummaries: {},
    annualArchives: [...(config.annualArchives || []).filter(item => item.year !== archive.year), archive],
  };
}

export function markJanuaryCarryovers(
  daysData: Record<string, DayData>,
  sourceYear: number,
): Record<string, DayData> {
  const prefix = `${sourceYear + 1}-01-`;
  return Object.fromEntries(Object.entries(daysData).map(([date, day]) => {
    if (!date.startsWith(prefix)) return [date, day];
    return [date, {
      ...day,
      absences: day.absences?.map(absence =>
        (absence.type === 'assumpte_propi' || absence.type === 'flexibilitat')
          ? { ...absence, sourceYear }
          : absence
      ),
    }];
  }));
}

export function prepareDaysForNewYear(
  daysData: Record<string, DayData>,
  sourceYear: number,
  targetYear: number,
): Record<string, DayData> {
  const markedDays = markJanuaryCarryovers(daysData, sourceYear);
  return Object.fromEntries(Object.entries(markedDays).filter(([date]) => {
    const year = Number(date.slice(0, 4));
    const month = Number(date.slice(5, 7));
    return year === targetYear || (year === targetYear + 1 && month === 1);
  }));
}
