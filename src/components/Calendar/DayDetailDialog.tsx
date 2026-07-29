import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import type { DayAbsence, DayData, UserConfig, DayStatus } from '@/types';
import { getTheoreticalHoursForDate, getDayTypeForDate, calculateWorkedHours, isHoliday, formatHoursToTime, parseTimeToHours, normalizeHoursDifference, capDailyHours } from '@/lib/timeCalculations';
import { DAY_NAMES_CA, MAX_DAILY_WORK_HOURS, MAX_FLEXIBILITY_HOURS, MONTH_NAMES_CA } from '@/lib/constants';
import { Home, Building2, Plus, Trash2 } from 'lucide-react';
import { getAbsenceHours, getDayAbsences, getLegacyRequestStatus, hasAbsence } from '@/lib/absences';

interface DayDetailDialogProps {
  date: Date | null;
  dayData: DayData | null;
  config: UserConfig;
  requestedVacationDays: number;
  onClose: () => void;
  onSave: (dayData: DayData) => void;
}

type AbsenceType = 'cap' | 'vacances' | 'assumpte_propi' | 'flexibilitat' | 'altres';
type SecondaryAbsenceType = 'cap' | 'assumpte_propi' | 'flexibilitat' | 'altres';

export function DayDetailDialog({ date, dayData, config, requestedVacationDays, onClose, onSave }: DayDetailDialogProps) {
  const [startTime, setStartTime] = useState(config.defaultStartTime);
  const [endTime, setEndTime] = useState('');
  const [startTime2, setStartTime2] = useState('');
  const [endTime2, setEndTime2] = useState('');
  const [showSecondShift, setShowSecondShift] = useState(false);
  const [isEndTimeAuto, setIsEndTimeAuto] = useState(true);
  const [absenceType, setAbsenceType] = useState<AbsenceType>('cap');
  const [isApproved, setIsApproved] = useState(false);
  const [absenceHours, setAbsenceHours] = useState(0);
  const [absenceMinutes, setAbsenceMinutes] = useState(0);
  const [otherComment, setOtherComment] = useState('');
  const [secondaryAbsenceType, setSecondaryAbsenceType] = useState<SecondaryAbsenceType>('cap');
  const [secondaryAbsenceHours, setSecondaryAbsenceHours] = useState(0);
  const [secondaryAbsenceMinutes, setSecondaryAbsenceMinutes] = useState(0);
  const [secondaryOtherComment, setSecondaryOtherComment] = useState('');
  const [isSecondaryApproved, setIsSecondaryApproved] = useState(false);
  const [vacationError, setVacationError] = useState('');
  const [apError, setApError] = useState('');
  const [dateRuleError, setDateRuleError] = useState('');

  const theoreticalHours = date ? getTheoreticalHoursForDate(date, config) : 0;

  const getCalculatedEndTime = (start: string) => {
    if (!start) return '';
    const endHours = parseTimeToHours(start) + theoreticalHours;
    return formatHoursToTime(endHours);
  };

  useEffect(() => {
    if (dayData) {
      const resolvedStart = dayData.startTime === null ? '' : (dayData.startTime ?? config.defaultStartTime);
      const resolvedStart2 = dayData.startTime2 === null ? '' : (dayData.startTime2 ?? '');
      const resolvedEnd2 = dayData.endTime2 === null ? '' : (dayData.endTime2 ?? '');
      setStartTime(resolvedStart);
      setStartTime2(resolvedStart2);
      setEndTime2(resolvedEnd2);
      setShowSecondShift(Boolean(resolvedStart2 || resolvedEnd2));

      if (dayData.endTime === null) {
        setEndTime('');
        setIsEndTimeAuto(false);
      } else if (dayData.endTime) {
        setEndTime(dayData.endTime);
        setIsEndTimeAuto(false);
      } else {
        setEndTime(getCalculatedEndTime(resolvedStart));
        setIsEndTimeAuto(true);
      }
      
      const storedAbsences = getDayAbsences(dayData);
      const primaryAbsence = storedAbsences[0];
      const secondaryAbsence = storedAbsences[1];

      // Determine absence type from the first stored absence
      if (primaryAbsence?.type === 'vacances') {
        setAbsenceType('vacances');
        setOtherComment('');
      } else if (primaryAbsence?.type === 'assumpte_propi') {
        setAbsenceType('assumpte_propi');
        const hours = primaryAbsence.hours || 0;
        setAbsenceHours(Math.floor(hours));
        setAbsenceMinutes(Math.round((hours % 1) * 60));
        setOtherComment('');
      } else if (primaryAbsence?.type === 'flexibilitat') {
        setAbsenceType('flexibilitat');
        const hours = primaryAbsence.hours || 0;
        setAbsenceHours(Math.floor(hours));
        setAbsenceMinutes(Math.round((hours % 1) * 60));
        setOtherComment('');
      } else if (primaryAbsence?.type === 'altres') {
        setAbsenceType('altres');
        const hours = primaryAbsence.hours || 0;
        setAbsenceHours(Math.floor(hours));
        setAbsenceMinutes(Math.round((hours % 1) * 60));
        setOtherComment(primaryAbsence.comment || '');
      } else {
        setAbsenceType('cap');
        setAbsenceHours(0);
        setAbsenceMinutes(0);
        setOtherComment('');
      }

      if (secondaryAbsence && secondaryAbsence.type !== 'vacances') {
        const hours = secondaryAbsence.hours || 0;
        setSecondaryAbsenceType(secondaryAbsence.type);
        setSecondaryAbsenceHours(Math.floor(hours));
        setSecondaryAbsenceMinutes(Math.round((hours % 1) * 60));
        setSecondaryOtherComment(secondaryAbsence.type === 'altres' ? (secondaryAbsence.comment || '') : '');
        setIsSecondaryApproved(secondaryAbsence.requestStatus === 'aprovat');
      } else {
        setSecondaryAbsenceType('cap');
        setSecondaryAbsenceHours(0);
        setSecondaryAbsenceMinutes(0);
        setSecondaryOtherComment('');
        setIsSecondaryApproved(false);
      }

      setIsApproved(primaryAbsence?.requestStatus === 'aprovat');
    } else {
      setStartTime(config.defaultStartTime);
      setEndTime(getCalculatedEndTime(config.defaultStartTime));
      setStartTime2('');
      setEndTime2('');
      setShowSecondShift(false);
      setIsEndTimeAuto(true);
      setAbsenceType('cap');
      setIsApproved(false);
      setAbsenceHours(0);
      setAbsenceMinutes(0);
      setOtherComment('');
      setSecondaryAbsenceType('cap');
      setSecondaryAbsenceHours(0);
      setSecondaryAbsenceMinutes(0);
      setSecondaryOtherComment('');
      setIsSecondaryApproved(false);
    }
    setVacationError('');
    setApError('');
    setDateRuleError('');
  }, [dayData, config, date]);

  if (!date) return null;

  const dayType = getDayTypeForDate(date, config);
  const actualWorkedHours = calculateWorkedHours(startTime, endTime)
    + calculateWorkedHours(startTime2, endTime2);
  const absenceHoursDecimal = absenceHours + (absenceMinutes / 60);
  const secondaryAbsenceHoursDecimal = secondaryAbsenceHours + (secondaryAbsenceMinutes / 60);
  const previousFlexHours = getAbsenceHours(dayData, 'flexibilitat');
  const previousAPHours = getAbsenceHours(dayData, 'assumpte_propi');
  const availableFlexHours = Math.min(
    MAX_FLEXIBILITY_HOURS,
    Math.max(0, config.flexibilityHours - config.usedFlexHours + previousFlexHours)
  );
  const availableAPHours = Math.max(0, config.totalAPHours - config.usedAPHours + previousAPHours);
  const maxFlexHours = Math.min(theoreticalHours, availableFlexHours);
  const maxFlexHoursInt = Math.floor(maxFlexHours);
  const maxFlexMinutes = Math.min(59, Math.round((maxFlexHours - maxFlexHoursInt) * 60));
  const getFlexMinutesLimit = (hoursValue: number) => (hoursValue >= maxFlexHoursInt ? maxFlexMinutes : 59);
  
  const primaryPartialHours = absenceType === 'assumpte_propi'
    || absenceType === 'flexibilitat'
    || absenceType === 'altres'
    ? absenceHoursDecimal
    : 0;
  const secondaryPartialHours = secondaryAbsenceType !== 'cap'
    ? secondaryAbsenceHoursDecimal
    : 0;

  // Total worked hours = actual worked + all partial absence hours
  const rawTotalWorkedHours = absenceType === 'vacances' 
    ? theoreticalHours  // Vacances counts as full day
    : actualWorkedHours + primaryPartialHours + secondaryPartialHours;
  const totalWorkedHours = absenceType === 'vacances'
    ? rawTotalWorkedHours
    : capDailyHours(rawTotalWorkedHours);
  const exceedsDailyMax = absenceType !== 'vacances' && rawTotalWorkedHours > MAX_DAILY_WORK_HOURS;
  
  const difference = normalizeHoursDifference(totalWorkedHours - theoreticalHours);
  const holiday = isHoliday(date, config.holidays);
  const isCalendarYear = date.getFullYear() === config.calendarYear;
  const isNextYearJanuary = date.getFullYear() === config.calendarYear + 1 && date.getMonth() === 0;
  const januaryDay = date.getDate();
  const canUseVacation = isCalendarYear;
  const canUseAP = isCalendarYear || isNextYearJanuary;
  const isAPExceptionalPeriod = isNextYearJanuary && januaryDay > 15;
  const canUseFlexibility = isCalendarYear || (isNextYearJanuary && januaryDay <= 15);

  const getDayName = () => {
    const dayIndex = date.getDay();
    const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return DAY_NAMES_CA[dayKeys[dayIndex]];
  };

  const formatHoursMinutes = (hours: number): string => {
    const h = Math.floor(Math.abs(hours));
    const m = Math.round((Math.abs(hours) % 1) * 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  const getDayStatus = (): DayStatus => {
    if (holiday) return 'festiu';
    if (absenceType === 'vacances') return 'vacances';
    if (absenceType === 'assumpte_propi') return 'assumpte_propi';
    if (absenceType === 'flexibilitat') return 'flexibilitat';
    if (absenceType === 'altres') return 'altres';
    return 'laboral';
  };

  const getAbsenceHoursDecimal = (): number => {
    return absenceHours + (absenceMinutes / 60);
  };

  const buildAbsences = (): DayAbsence[] => {
    if (absenceType === 'cap') return [];

    const primary: DayAbsence = {
      type: absenceType,
      hours: absenceType === 'vacances' ? undefined : getAbsenceHoursDecimal(),
      comment: absenceType === 'altres' ? otherComment.trim().slice(0, 50) || undefined : undefined,
      requestStatus: isApproved ? 'aprovat' : 'pendent',
    };
    if (secondaryAbsenceType === 'cap' || absenceType === 'vacances') return [primary];

    return [
      primary,
      {
        type: secondaryAbsenceType,
        hours: secondaryAbsenceHoursDecimal,
        comment: secondaryAbsenceType === 'altres'
          ? secondaryOtherComment.trim().slice(0, 50) || undefined
          : undefined,
        requestStatus: isSecondaryApproved ? 'aprovat' : 'pendent',
      },
    ];
  };

  const getDateRuleError = (nextAbsenceType: AbsenceType): string => {
    if (nextAbsenceType === 'vacances' && !canUseVacation) {
      return 'Els dies de vacances només es poden fer servir fins al 31 de desembre.';
    }
    if (nextAbsenceType === 'assumpte_propi' && !canUseAP) {
      return 'Els assumptes personals només es poden fer servir fins al 31 de gener de l’any següent.';
    }
    if (nextAbsenceType === 'flexibilitat' && !canUseFlexibility) {
      return 'La flexibilitat horària només es pot fer servir fins al 15 de gener de l’any següent.';
    }
    return '';
  };

  const handleSave = () => {
    const ruleError = getDateRuleError(absenceType);
    const secondaryRuleError = getDateRuleError(secondaryAbsenceType);
    if (ruleError || secondaryRuleError) {
      setDateRuleError(ruleError || secondaryRuleError);
      return;
    }

    const isCurrentlyVacation = hasAbsence(dayData, 'vacances');
    const effectiveRequestedVacations = requestedVacationDays - (isCurrentlyVacation ? 1 : 0);
    const exceedsVacationLimit = absenceType === 'vacances' && !isCurrentlyVacation
      && effectiveRequestedVacations >= config.totalVacationDays;

    if (exceedsVacationLimit) {
      setVacationError('Ja has demanat el màxim de dies de vacances.');
      return;
    }

    const absences = buildAbsences();
    const requestedAP = absences.find((absence) => absence.type === 'assumpte_propi')?.hours || 0;
    if (requestedAP > availableAPHours) {
      setApError('No queden prou hores d’AP disponibles.');
      return;
    }

    const normalizedAbsences = absences.map((absence) => absence.type === 'flexibilitat'
      ? { ...absence, hours: Math.min(absence.hours || 0, maxFlexHours) }
      : absence
    );
    const newDayData: DayData = {
      date: format(date, 'yyyy-MM-dd'),
      startTime: absenceType === 'vacances' ? null : (startTime || null),
      endTime: absenceType === 'vacances' ? null : (endTime || null),
      startTime2: absenceType === 'vacances' ? null : (startTime2 || null),
      endTime2: absenceType === 'vacances' ? null : (endTime2 || null),
      dayType,
      dayStatus: getDayStatus(),
      requestStatus: getLegacyRequestStatus(normalizedAbsences),
      apHours: normalizedAbsences.find((absence) => absence.type === 'assumpte_propi')?.hours,
      flexHours: normalizedAbsences.find((absence) => absence.type === 'flexibilitat')?.hours,
      otherHours: normalizedAbsences.find((absence) => absence.type === 'altres')?.hours,
      otherComment: normalizedAbsences.find((absence) => absence.type === 'altres')?.comment,
      absences: normalizedAbsences,
    };
    onSave(newDayData);
    onClose();
  };

  return (
    <Dialog open={!!date} onOpenChange={() => onClose()}>
      <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {getDayName()}, {format(date, 'd')} de {MONTH_NAMES_CA[date.getMonth()]}
          </DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto py-4 pr-1">
          {/* Day type and theoretical hours */}
          <div className="flex items-center gap-3">
            <Badge variant={dayType === 'presencial' ? 'default' : 'secondary'} className="flex items-center gap-1.5">
              {dayType === 'presencial' ? (
                <><Building2 className="w-3 h-3" /> Presencial</>
              ) : (
                <><Home className="w-3 h-3" /> Teletreball</>
              )}
            </Badge>
            <Badge variant="outline">{formatHoursMinutes(theoreticalHours)}</Badge>
            {holiday && <Badge variant="destructive">Festiu</Badge>}
          </div>

          {/* Start and end time */}
          {absenceType !== 'vacances' && (startTime || endTime || showSecondShift) && (
            <div className="space-y-3">
              <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-4 items-end">
              <div className="space-y-2">
                <Label htmlFor="startTime">Hora d'inici</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={startTime}
                  onChange={(e) => {
                    const nextStart = e.target.value;
                    setStartTime(nextStart);
                    if (isEndTimeAuto) {
                      setEndTime(getCalculatedEndTime(nextStart));
                    }
                  }}
                  min="07:30"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">Hora de fi</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={endTime}
                  onChange={(e) => {
                    setEndTime(e.target.value);
                    setIsEndTimeAuto(false);
                  }}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => {
                  setStartTime('');
                  setEndTime('');
                  setStartTime2('');
                  setEndTime2('');
                  setShowSecondShift(false);
                  setIsEndTimeAuto(false);
                }}
                className="text-muted-foreground hover:text-destructive"
                title="Esborrar horari"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              {!showSecondShift && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setShowSecondShift(true);
                    setStartTime2('');
                    setEndTime2('');
                  }}
                  className="text-muted-foreground hover:text-foreground"
                  title="Afegir segon tram"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              )}
              </div>
              {showSecondShift && (
                <div className="grid grid-cols-[1fr_1fr_auto] gap-4 items-end">
                  <div className="space-y-2">
                    <Label htmlFor="startTime2">Hora d'inici (2n tram)</Label>
                    <Input
                      id="startTime2"
                      type="time"
                      value={startTime2}
                      onChange={(e) => {
                        setStartTime2(e.target.value);
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endTime2">Hora de fi (2n tram)</Label>
                    <Input
                      id="endTime2"
                      type="time"
                      value={endTime2}
                      onChange={(e) => {
                        setEndTime2(e.target.value);
                      }}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setStartTime2('');
                      setEndTime2('');
                      setShowSecondShift(false);
                    }}
                    className="text-muted-foreground hover:text-destructive"
                    title="Esborrar segon tram"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
              {exceedsDailyMax && (
                <p className="text-sm text-destructive">
                  La jornada diària total no pot superar les 9 hores i 30 minuts.
                </p>
              )}
            </div>
          )}

          {/* Show add time button when no times */}
          {absenceType !== 'vacances' && !startTime && !endTime && !showSecondShift && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setStartTime(config.defaultStartTime);
                setEndTime(getCalculatedEndTime(config.defaultStartTime));
                setStartTime2('');
                setEndTime2('');
                setShowSecondShift(false);
                setIsEndTimeAuto(true);
              }}
              className="w-full"
            >
              Afegir horari presencial
            </Button>
          )}

          {/* Primary absence type selector */}
          <div className="space-y-3">
            <Label>{secondaryAbsenceType === 'cap' ? 'Absència' : 'Absència 1'}</Label>
            <div className="flex items-center gap-2">
              <Select value={absenceType} onValueChange={(v) => {
                const nextAbsenceType = v as AbsenceType;
                setAbsenceType(nextAbsenceType);
                setDateRuleError(getDateRuleError(nextAbsenceType));
                if (v !== 'vacances') {
                  setVacationError('');
                } else if (!hasAbsence(dayData, 'vacances') && requestedVacationDays >= config.totalVacationDays) {
                  setVacationError('Ja has demanat el màxim de dies de vacances.');
                } else {
                  setVacationError('');
                }
                if (v !== 'assumpte_propi') {
                  setApError('');
                }
                if (v === 'cap' || v === 'vacances') {
                  setSecondaryAbsenceType('cap');
                  setSecondaryAbsenceHours(0);
                  setSecondaryAbsenceMinutes(0);
                  setSecondaryOtherComment('');
                  setIsSecondaryApproved(false);
                }
                if (v === 'cap') {
                  setIsApproved(false);
                  setAbsenceHours(0);
                  setAbsenceMinutes(0);
                }
                if (v !== 'altres') {
                  setOtherComment('');
                }
                if (v === secondaryAbsenceType) {
                  setSecondaryAbsenceType('cap');
                }
              }}>
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cap">Cap absència</SelectItem>
                  <SelectItem value="vacances" disabled={!canUseVacation}>Vacances</SelectItem>
                  <SelectItem value="assumpte_propi" disabled={!canUseAP}>Assumpte propi (AP)</SelectItem>
                  <SelectItem value="flexibilitat" disabled={!canUseFlexibility}>Flexibilitat horària (FX)</SelectItem>
                  <SelectItem value="altres">Altres</SelectItem>
                </SelectContent>
              </Select>
              {secondaryAbsenceType === 'cap'
                && ['assumpte_propi', 'flexibilitat', 'altres'].includes(absenceType) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setSecondaryAbsenceType(
                      absenceType === 'assumpte_propi'
                        ? (canUseFlexibility ? 'flexibilitat' : 'altres')
                        : 'assumpte_propi'
                    )}
                    title="Afegir una segona absència"
                    aria-label="Afegir una segona absència"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                )}
            </div>
            {dateRuleError && (
              <p className="text-sm text-destructive">{dateRuleError}</p>
            )}
            {absenceType === 'assumpte_propi' && isAPExceptionalPeriod && (
              <p className="text-sm text-muted-foreground">
                Del 16 al 31 de gener els AP només s’han de fer servir excepcionalment si no s’han pogut fer per necessitats del servei.
              </p>
            )}
            {vacationError && (
              <p className="text-sm text-destructive">{vacationError}</p>
            )}
            {apError && (
              <p className="text-sm text-destructive">{apError}</p>
            )}
          </div>

          {/* Hours/minutes input for AP, FX, or altres */}
          {(absenceType === 'assumpte_propi' || absenceType === 'flexibilitat' || absenceType === 'altres') && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="absenceHours">Hores</Label>
                  <Input
                    id="absenceHours"
                    type="number"
                    min="0"
                    max={absenceType === 'flexibilitat' ? Math.floor(maxFlexHours) : Math.floor(theoreticalHours)}
                    step="1"
                    value={absenceHours}
                    onChange={(e) => {
                      const nextHours = parseInt(e.target.value) || 0;
                      const cappedHours = absenceType === 'flexibilitat'
                        ? Math.min(nextHours, maxFlexHoursInt)
                        : nextHours;
                      setAbsenceHours(cappedHours);
                      if (absenceType === 'flexibilitat') {
                        const minutesLimit = getFlexMinutesLimit(cappedHours);
                        if (absenceMinutes > minutesLimit) {
                          setAbsenceMinutes(minutesLimit);
                        }
                      }
                      if (absenceType === 'assumpte_propi') {
                        setApError('');
                      }
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="absenceMinutes">Minuts</Label>
                  <Input
                    id="absenceMinutes"
                    type="number"
                    min="0"
                    max={absenceType === 'flexibilitat' ? getFlexMinutesLimit(absenceHours) : 59}
                    step="1"
                    value={absenceMinutes}
                    onChange={(e) => {
                      const nextMinutes = parseInt(e.target.value) || 0;
                      const minutesLimit = absenceType === 'flexibilitat'
                        ? getFlexMinutesLimit(absenceHours)
                        : 59;
                      setAbsenceMinutes(Math.min(nextMinutes, minutesLimit));
                      if (absenceType === 'assumpte_propi') {
                        setApError('');
                      }
                    }}
                  />
                </div>
              </div>

              {absenceType === 'altres' && (
                <div className="space-y-2">
                  <Label htmlFor="otherComment">Comentari (màx. 50 caràcters)</Label>
                  <Input
                    id="otherComment"
                    type="text"
                    maxLength={50}
                    value={otherComment}
                    onChange={(e) => setOtherComment(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    {otherComment.length}/50
                  </p>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="approved"
                  checked={isApproved}
                  onCheckedChange={(checked) => setIsApproved(checked === true)}
                />
                <Label htmlFor="approved" className="text-sm cursor-pointer">
                  Aprovat
                </Label>
              </div>
            </div>
          )}

          {/* Secondary absence */}
          {secondaryAbsenceType !== 'cap' && (
            <div className="space-y-3 rounded-lg border p-3">
              <Label>Absència 2</Label>
              <div className="flex items-center gap-2">
                <Select
                  value={secondaryAbsenceType}
                  onValueChange={(value) => {
                    const nextType = value as SecondaryAbsenceType;
                    setSecondaryAbsenceType(nextType);
                    setDateRuleError(getDateRuleError(nextType));
                    setApError('');
                    if (nextType !== 'altres') setSecondaryOtherComment('');
                  }}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      value="assumpte_propi"
                      disabled={!canUseAP || absenceType === 'assumpte_propi'}
                    >
                      Assumpte propi (AP)
                    </SelectItem>
                    <SelectItem
                      value="flexibilitat"
                      disabled={!canUseFlexibility || absenceType === 'flexibilitat'}
                    >
                      Flexibilitat horària (FX)
                    </SelectItem>
                    <SelectItem value="altres" disabled={absenceType === 'altres'}>
                      Altres
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setSecondaryAbsenceType('cap');
                    setSecondaryAbsenceHours(0);
                    setSecondaryAbsenceMinutes(0);
                    setSecondaryOtherComment('');
                    setIsSecondaryApproved(false);
                  }}
                  className="text-muted-foreground hover:text-destructive"
                  title="Eliminar la segona absència"
                  aria-label="Eliminar la segona absència"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="secondaryAbsenceHours">Hores</Label>
                  <Input
                    id="secondaryAbsenceHours"
                    type="number"
                    min="0"
                    max={secondaryAbsenceType === 'flexibilitat'
                      ? Math.floor(maxFlexHours)
                      : Math.floor(theoreticalHours)}
                    step="1"
                    value={secondaryAbsenceHours}
                    onChange={(event) => {
                      const nextHours = parseInt(event.target.value) || 0;
                      const cappedHours = secondaryAbsenceType === 'flexibilitat'
                        ? Math.min(nextHours, maxFlexHoursInt)
                        : nextHours;
                      setSecondaryAbsenceHours(cappedHours);
                      if (secondaryAbsenceType === 'flexibilitat') {
                        const minutesLimit = getFlexMinutesLimit(cappedHours);
                        if (secondaryAbsenceMinutes > minutesLimit) {
                          setSecondaryAbsenceMinutes(minutesLimit);
                        }
                      }
                      setApError('');
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="secondaryAbsenceMinutes">Minuts</Label>
                  <Input
                    id="secondaryAbsenceMinutes"
                    type="number"
                    min="0"
                    max={secondaryAbsenceType === 'flexibilitat'
                      ? getFlexMinutesLimit(secondaryAbsenceHours)
                      : 59}
                    step="1"
                    value={secondaryAbsenceMinutes}
                    onChange={(event) => {
                      const nextMinutes = parseInt(event.target.value) || 0;
                      const minutesLimit = secondaryAbsenceType === 'flexibilitat'
                        ? getFlexMinutesLimit(secondaryAbsenceHours)
                        : 59;
                      setSecondaryAbsenceMinutes(Math.min(nextMinutes, minutesLimit));
                      setApError('');
                    }}
                  />
                </div>
              </div>

              {secondaryAbsenceType === 'altres' && (
                <div className="space-y-2">
                  <Label htmlFor="secondaryOtherComment">Comentari (màx. 50 caràcters)</Label>
                  <Input
                    id="secondaryOtherComment"
                    type="text"
                    maxLength={50}
                    value={secondaryOtherComment}
                    onChange={(event) => setSecondaryOtherComment(event.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    {secondaryOtherComment.length}/50
                  </p>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="secondaryApproved"
                  checked={isSecondaryApproved}
                  onCheckedChange={(checked) => setIsSecondaryApproved(checked === true)}
                />
                <Label htmlFor="secondaryApproved" className="text-sm cursor-pointer">
                  Aprovat
                </Label>
              </div>
            </div>
          )}

          {/* Approval checkbox for vacances */}
          {absenceType === 'vacances' && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="approvedVacances"
                checked={isApproved}
                onCheckedChange={(checked) => setIsApproved(checked === true)}
              />
              <Label htmlFor="approvedVacances" className="text-sm cursor-pointer">
                Aprovat
              </Label>
            </div>
          )}

          {/* Summary */}
          <div className="p-4 bg-muted rounded-lg">
             <div className="text-[17px] font-semibold space-y-1">
              <p>Hores totals: <strong>{formatHoursMinutes(totalWorkedHours)}</strong></p>
              <p className={difference >= 0 ? 'text-[hsl(var(--status-complete))]' : 'text-[hsl(var(--status-deficit))]'}>
                Diferència: <strong>{difference >= 0 ? '+' : '-'}{formatHoursMinutes(difference)}</strong>
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="shrink-0 border-t pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel·lar
          </Button>
          <Button onClick={handleSave}>
            Desar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
