import type { AbsenceType, DayAbsence, DayData, DayStatus, RequestStatus } from '@/types';

const ABSENCE_TYPES: AbsenceType[] = ['vacances', 'assumpte_propi', 'flexibilitat', 'altres'];

export function isAbsenceType(status: DayStatus): status is AbsenceType {
  return ABSENCE_TYPES.includes(status as AbsenceType);
}

export function getDayAbsences(dayData: DayData | null | undefined): DayAbsence[] {
  if (!dayData) return [];
  if (dayData.absences?.length) return dayData.absences;
  if (!isAbsenceType(dayData.dayStatus)) return [];

  const hours = dayData.dayStatus === 'assumpte_propi'
    ? dayData.apHours
    : dayData.dayStatus === 'flexibilitat'
      ? dayData.flexHours
      : dayData.dayStatus === 'altres'
        ? dayData.otherHours
        : undefined;

  return [{
    type: dayData.dayStatus,
    hours,
    comment: dayData.dayStatus === 'altres' ? dayData.otherComment : undefined,
    requestStatus: dayData.requestStatus,
  }];
}

export function getAbsence(
  dayData: DayData | null | undefined,
  type: AbsenceType
): DayAbsence | undefined {
  return getDayAbsences(dayData).find((absence) => absence.type === type);
}

export function hasAbsence(dayData: DayData | null | undefined, type: AbsenceType): boolean {
  return Boolean(getAbsence(dayData, type));
}

export function getAbsenceHours(dayData: DayData | null | undefined, type: AbsenceType): number {
  return getAbsence(dayData, type)?.hours || 0;
}

export function getTotalPartialAbsenceHours(dayData: DayData | null | undefined): number {
  return getDayAbsences(dayData)
    .filter((absence) => absence.type !== 'vacances')
    .reduce((total, absence) => total + (absence.hours || 0), 0);
}

export function hasPendingAbsence(dayData: DayData | null | undefined): boolean {
  return getDayAbsences(dayData).some((absence) => absence.requestStatus === 'pendent');
}

export function hasApprovedAbsence(dayData: DayData | null | undefined): boolean {
  const absences = getDayAbsences(dayData);
  return absences.length > 0 && absences.every((absence) => absence.requestStatus === 'aprovat');
}

export function getLegacyRequestStatus(absences: DayAbsence[]): RequestStatus {
  if (absences.length === 0) return null;
  return absences.every((absence) => absence.requestStatus === 'aprovat') ? 'aprovat' : 'pendent';
}
