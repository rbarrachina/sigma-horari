import {
  addWeeks,
  eachDayOfInterval,
  endOfWeek,
  format,
  startOfWeek,
} from 'date-fns';
import type { DayData, UserConfig } from '@/types';
import { MIN_WEEKLY_SURPLUS_FOR_FLEXIBILITY } from './constants';
import {
  calculateWeeklySummary,
  getDayTypeForDate,
  isHoliday,
  isWeekend,
  normalizeHoursDifference,
} from './timeCalculations';
import { hasAbsence } from './absences';

export function calculateMonthlyFlexibility(
  year: number,
  daysData: Record<string, DayData>,
  config: UserConfig,
  today = new Date()
): number[] {
  const monthlyFlexibility = Array.from({ length: 12 }, () => 0);
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31);
  const normalizedToday = new Date(today);
  normalizedToday.setHours(0, 0, 0, 0);

  for (
    let weekStart = startOfWeek(yearStart, { weekStartsOn: 1 });
    weekStart <= yearEnd && weekStart <= normalizedToday;
    weekStart = addWeeks(weekStart, 1)
  ) {
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    const lastComputablePresenceDay = eachDayOfInterval({ start: weekStart, end: weekEnd })
      .filter((day) => {
        if (isWeekend(day) || isHoliday(day, config.holidays)) return false;

        const dayData = daysData[format(day, 'yyyy-MM-dd')];
        if (hasAbsence(dayData, 'vacances')) return false;

        return (dayData?.dayType ?? getDayTypeForDate(day, config)) === 'presencial';
      })
      .at(-1);

    if (
      !lastComputablePresenceDay
      || lastComputablePresenceDay > normalizedToday
      || lastComputablePresenceDay.getFullYear() !== year
    ) {
      continue;
    }

    const difference = normalizeHoursDifference(
      calculateWeeklySummary(weekStart, daysData, config).difference
    );
    if (difference >= MIN_WEEKLY_SURPLUS_FOR_FLEXIBILITY) {
      monthlyFlexibility[lastComputablePresenceDay.getMonth()] += difference;
    }
  }

  return monthlyFlexibility.map(normalizeHoursDifference);
}
