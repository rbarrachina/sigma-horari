import type { UserConfig, DayData, DayType, DayStatus } from '@/types';
import { APP_INFO, DEFAULT_USER_CONFIG } from './constants';
import { getDayTypeForDate } from './timeCalculations';
import { parseISO } from 'date-fns';

const USER_CONFIG_KEY = 'control-horari-config';
const DAYS_DATA_KEY = 'control-horari-days';
const ONBOARDING_STEP_KEY = 'control-horari-onboarding-step';
const LAST_VERSION_KEY = 'control-horari-last-version';

export function hasStoredUserConfig(): boolean {
  try {
    return localStorage.getItem(USER_CONFIG_KEY) !== null;
  } catch (error) {
    console.error('Error checking user config:', error);
    return false;
  }
}

export function getOnboardingStep(): number {
  try {
    const stored = localStorage.getItem(ONBOARDING_STEP_KEY);
    if (!stored) return 0;
    const parsed = Number(stored);
    return Number.isFinite(parsed) ? parsed : 0;
  } catch (error) {
    console.error('Error loading onboarding step:', error);
    return 0;
  }
}

export function saveOnboardingStep(step: number): void {
  try {
    if (step <= 0) {
      localStorage.removeItem(ONBOARDING_STEP_KEY);
      return;
    }
    localStorage.setItem(ONBOARDING_STEP_KEY, String(step));
  } catch (error) {
    console.error('Error saving onboarding step:', error);
  }
}

export function getLastSeenVersion(): string | null {
  try {
    return localStorage.getItem(LAST_VERSION_KEY);
  } catch (error) {
    console.error('Error loading last version:', error);
    return null;
  }
}

export function saveLastSeenVersion(version: string): void {
  try {
    localStorage.setItem(LAST_VERSION_KEY, version);
  } catch (error) {
    console.error('Error saving last version:', error);
  }
}

export function getUserConfig(): UserConfig {
  try {
    const stored = localStorage.getItem(USER_CONFIG_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Migrate old config without schedulePeriods
      if (!parsed.schedulePeriods) {
        parsed.schedulePeriods = DEFAULT_USER_CONFIG.schedulePeriods;
      }
      if (typeof parsed.calendarYear !== 'number') {
        parsed.calendarYear = DEFAULT_USER_CONFIG.calendarYear;
      }
      // Migrate old weeklyConfig with theoreticalHours
      if (parsed.weeklyConfig && 'theoreticalHours' in (parsed.weeklyConfig.monday || {})) {
        parsed.weeklyConfig = {
          monday: { dayType: parsed.weeklyConfig.monday?.dayType || 'presencial' },
          tuesday: { dayType: parsed.weeklyConfig.tuesday?.dayType || 'presencial' },
          wednesday: { dayType: parsed.weeklyConfig.wednesday?.dayType || 'presencial' },
          thursday: { dayType: parsed.weeklyConfig.thursday?.dayType || 'teletreball' },
          friday: { dayType: parsed.weeklyConfig.friday?.dayType || 'teletreball' },
        };
      }
      if (typeof parsed.usedFlexHours !== 'number') {
        parsed.usedFlexHours = DEFAULT_USER_CONFIG.usedFlexHours;
      }
      return parsed;
    }
  } catch (error) {
    console.error('Error loading user config:', error);
  }
  return DEFAULT_USER_CONFIG;
}

export function saveUserConfig(config: UserConfig): void {
  try {
    localStorage.setItem(USER_CONFIG_KEY, JSON.stringify(config));
  } catch (error) {
    console.error('Error saving user config:', error);
  }
}

function inferDayStatus(dayData: Partial<DayData>): DayStatus {
  if (dayData.dayStatus) return dayData.dayStatus;
  if (dayData.apHours != null) return 'assumpte_propi';
  if (dayData.flexHours != null) return 'flexibilitat';
  if (dayData.otherHours != null || dayData.otherComment != null) return 'altres';
  if (dayData.requestStatus != null) return 'vacances';
  return 'laboral';
}

function normalizeDayData(date: string, raw: Partial<DayData>, config: UserConfig): DayData {
  return {
    date,
    startTime: raw.startTime ?? null,
    endTime: raw.endTime ?? null,
    startTime2: raw.startTime2 ?? null,
    endTime2: raw.endTime2 ?? null,
    dayType: getDayTypeForDate(parseISO(date), config),
    dayStatus: inferDayStatus(raw),
    requestStatus: raw.requestStatus ?? null,
    apHours: raw.apHours,
    flexHours: raw.flexHours,
    otherHours: raw.otherHours,
    otherComment: raw.otherComment,
    notes: raw.notes,
  };
}

function sanitizeDayDataForStorage(date: string, dayData: DayData): Partial<DayData> & { date: string } {
  const cleaned: Partial<DayData> & { date: string } = { date };

  if (dayData.startTime != null) cleaned.startTime = dayData.startTime;
  if (dayData.endTime != null) cleaned.endTime = dayData.endTime;
  if (dayData.startTime2 != null) cleaned.startTime2 = dayData.startTime2;
  if (dayData.endTime2 != null) cleaned.endTime2 = dayData.endTime2;
  if (dayData.dayStatus === 'vacances') cleaned.dayStatus = dayData.dayStatus;
  if (dayData.requestStatus != null) cleaned.requestStatus = dayData.requestStatus;
  if (dayData.apHours != null) cleaned.apHours = dayData.apHours;
  if (dayData.flexHours != null) cleaned.flexHours = dayData.flexHours;
  if (dayData.otherHours != null) cleaned.otherHours = dayData.otherHours;
  if (dayData.otherComment != null && dayData.otherComment !== '') cleaned.otherComment = dayData.otherComment;
  if (dayData.notes != null) cleaned.notes = dayData.notes;

  return cleaned;
}

export function getDaysData(config: UserConfig = getUserConfig()): Record<string, DayData> {
  try {
    const stored = localStorage.getItem(DAYS_DATA_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Record<string, Partial<DayData>>;
      return Object.fromEntries(
        Object.entries(parsed).map(([date, dayData]) => [date, normalizeDayData(date, dayData, config)])
      );
    }
  } catch (error) {
    console.error('Error loading days data:', error);
  }
  return {};
}

export function saveDaysData(data: Record<string, DayData | null | undefined>): void {
  try {
    const sanitized = Object.fromEntries(
      Object.entries(data)
        .filter(([, value]) => value != null)
        .map(([date, value]) => [date, sanitizeDayDataForStorage(date, value as DayData)])
        .filter(([, value]) => Object.keys(value).length > 1)
    ) as Record<string, Partial<DayData> & { date: string }>;
    localStorage.setItem(DAYS_DATA_KEY, JSON.stringify(sanitized));
  } catch (error) {
    console.error('Error saving days data:', error);
  }
}

export function getDayData(date: string): DayData | null {
  const allDays = getDaysData();
  return allDays[date] || null;
}

export function saveDayData(dayData: DayData): void {
  const allDays = getDaysData();
  allDays[dayData.date] = dayData;
  saveDaysData(allDays);
}

type ExportDayData = Omit<DayData, 'startTime' | 'endTime' | 'startTime2' | 'endTime2' | 'dayType' | 'requestStatus'> & {
  startTime?: string | null;
  endTime?: string | null;
  startTime2?: string | null;
  endTime2?: string | null;
  dayType?: DayType;
  requestStatus?: DayData['requestStatus'];
};

export interface ExportData {
  config: UserConfig;
  daysData: Record<string, ExportDayData>;
  exportDate: string;
  version: string;
}

export function exportAllData(): ExportData {
  const config = getUserConfig();
  const daysData = getDaysData(config);
  const sanitizedDaysData = Object.fromEntries(
    Object.entries(daysData).map(([date, dayData]) => {
      const { theoreticalHours: _unused, dayType: _dayType, requestStatus, ...rest } = dayData as DayData & {
        theoreticalHours?: number;
      };
      const cleaned: ExportDayData = { ...rest };

      if (cleaned.startTime === null) delete cleaned.startTime;
      if (cleaned.endTime === null) delete cleaned.endTime;
      if (cleaned.startTime2 == null) delete cleaned.startTime2;
      if (cleaned.endTime2 == null) delete cleaned.endTime2;
      if (requestStatus != null) {
        cleaned.requestStatus = requestStatus;
      }

      return [date, cleaned];
    })
  );

  return {
    config: getUserConfig(),
    daysData: sanitizedDaysData,
    exportDate: new Date().toISOString(),
    version: APP_INFO.version,
  };
}

export function importAllData(data: ExportData): boolean {
  try {
    if (data.config && data.daysData) {
      saveUserConfig(data.config);
      const sanitizedDaysData = Object.fromEntries(
        Object.entries(data.daysData).map(([date, dayData]) => {
          const { theoreticalHours: _unused, ...rest } = dayData as DayData & { theoreticalHours?: number };
          const normalized: DayData = {
            ...rest,
            startTime: rest.startTime ?? null,
            endTime: rest.endTime ?? null,
            startTime2: rest.startTime2 ?? null,
            endTime2: rest.endTime2 ?? null,
            requestStatus: rest.requestStatus ?? null,
            dayType: rest.dayType ?? getDayTypeForDate(parseISO(date), data.config),
          };
          return [date, normalized];
        })
      ) as Record<string, DayData>;
      saveDaysData(sanitizedDaysData);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error importing data:', error);
    return false;
  }
}

export function resetAllData(): void {
  localStorage.removeItem(USER_CONFIG_KEY);
  localStorage.removeItem(DAYS_DATA_KEY);
}
