export type DayType = 'presencial' | 'teletreball';
export type DayStatus = 'laboral' | 'festiu' | 'vacances' | 'assumpte_propi' | 'flexibilitat' | 'altres';
export type RequestStatus = 'pendent' | 'aprovat' | null;
export type ScheduleType = 'hivern' | 'estiu';
export type AbsenceType = 'vacances' | 'assumpte_propi' | 'flexibilitat' | 'altres';

export interface DayAbsence {
  type: AbsenceType;
  hours?: number;
  comment?: string;
  requestStatus: RequestStatus;
}

export interface DayData {
  date: string; // YYYY-MM-DD
  startTime: string | null; // HH:mm
  endTime: string | null; // HH:mm
  startTime2?: string | null; // HH:mm
  endTime2?: string | null; // HH:mm
  dayType: DayType;
  dayStatus: DayStatus;
  requestStatus: RequestStatus;
  apHours?: number; // Hours used for assumptes propis
  flexHours?: number; // Hours used from flexibility
  otherHours?: number; // Hours used for other absences
  otherComment?: string; // Short comment for other absences
  absences?: DayAbsence[]; // Up to two independently approved absences
  notes?: string;
}

export interface WeeklyConfig {
  monday: { dayType: DayType };
  tuesday: { dayType: DayType };
  wednesday: { dayType: DayType };
  thursday: { dayType: DayType };
  friday: { dayType: DayType };
}

export interface SchedulePeriod {
  id: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  scheduleType: ScheduleType;
}

export interface UserConfig {
  calendarYear: number;
  firstName: string;
  defaultStartTime: string;
  defaultEndTime: string;
  weeklyConfig: WeeklyConfig;
  schedulePeriods: SchedulePeriod[];
  totalVacationDays: number;
  usedVacationDays: number;
  totalAPHours: number;
  usedAPHours: number;
  flexibilityHours: number; // Accumulated (max 25)
  usedFlexHours: number; // Used from accumulated
  otherNotes: string; // Free-form notes for pending schedule-related items
  holidays: string[]; // Array of YYYY-MM-DD
}

export interface WeeklySummary {
  weekNumber: number;
  startDate: string;
  endDate: string;
  theoreticalHours: number;
  workedHours: number;
  difference: number;
  flexibilityGained: number;
}
