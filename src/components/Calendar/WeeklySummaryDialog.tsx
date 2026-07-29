import { format, eachDayOfInterval, getWeek } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { DayData, UserConfig } from '@/types';
import { 
  getTheoreticalHoursForDate, 
  getDayTypeForDate, 
  calculateDayWorkedHours, 
  calculateTotalWorkedHours,
  capDailyHours,
  isHoliday, 
  isWeekend,
  formatHoursDisplay,
  formatHoursMinutes
} from '@/lib/timeCalculations';
import { DAY_NAMES_CA, MONTH_NAMES_CA } from '@/lib/constants';
import { Home, Building2, Plane, Clock, Sparkles, Calendar, Check, MoreHorizontal, AlertTriangle } from 'lucide-react';
import { getDayAbsences, getTotalPartialAbsenceHours, hasAbsence } from '@/lib/absences';

interface WeeklySummaryDialogProps {
  weekStart: Date | null;
  weekEnd: Date | null;
  daysData: Record<string, DayData>;
  config: UserConfig;
  onClose: () => void;
}

export function WeeklySummaryDialog({ 
  weekStart, 
  weekEnd, 
  daysData, 
  config, 
  onClose
}: WeeklySummaryDialogProps) {
  if (!weekStart || !weekEnd) return null;

  const days = eachDayOfInterval({ start: weekStart, end: weekEnd }).filter(
    (day) => day.getFullYear() === config.calendarYear
  );
  const hasAnyData = days.some((day) => !!daysData[format(day, 'yyyy-MM-dd')]);
  if (!hasAnyData) return null;
  const displayStart = days[0] ?? weekStart;
  const displayEnd = days[days.length - 1] ?? weekEnd;
  const weekNumber = getWeek(displayStart, { weekStartsOn: 1 });

  const getDayName = (date: Date) => {
    const dayIndex = date.getDay();
    const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return DAY_NAMES_CA[dayKeys[dayIndex]];
  };

  // Calculate weekly totals
  let totalTheoretical = 0;
  let totalWorked = 0;

  for (const day of days) {
    if (isWeekend(day) || isHoliday(day, config.holidays)) continue;
    
    const dateStr = format(day, 'yyyy-MM-dd');
    const dayData = daysData[dateStr];
    if (hasAbsence(dayData, 'vacances')) continue;

    const theoretical = getTheoreticalHoursForDate(day, config);
    totalTheoretical += theoretical;
    
    totalWorked += calculateTotalWorkedHours(dayData);
  }

  const difference = totalWorked - totalTheoretical;

  const getStatusCardClass = (dayData: DayData | undefined, holiday: boolean, worked: number, theoretical: number) => {
    if (holiday) return 'bg-[hsl(var(--status-holiday)/0.15)] border-[hsl(var(--status-holiday)/0.4)]';
    if (hasAbsence(dayData, 'vacances')) {
      return 'bg-[hsl(var(--status-vacation)/0.15)] border-[hsl(var(--status-vacation)/0.4)]';
    }
    const absences = getDayAbsences(dayData);
    if (absences.length > 0) {
      return absences.every((absence) => absence.requestStatus === 'aprovat')
        ? 'bg-[hsl(var(--status-complete)/0.15)] border-[hsl(var(--status-complete)/0.4)]'
        : 'bg-[hsl(var(--status-deficit)/0.15)] border-[hsl(var(--status-deficit)/0.4)]';
    }
    const hasAnyShift = Boolean(
      (dayData?.startTime && dayData?.endTime) || (dayData?.startTime2 && dayData?.endTime2)
    );
    if (!hasAnyShift) {
      return 'bg-[hsl(var(--status-weekday-empty)/0.4)] border-[hsl(var(--status-weekday-empty))]';
    }
    return worked >= theoretical
      ? 'bg-[hsl(var(--status-complete)/0.15)] border-[hsl(var(--status-complete)/0.4)]'
      : 'bg-[hsl(var(--status-deficit)/0.15)] border-[hsl(var(--status-deficit)/0.4)]';
  };

  const getScheduleDisplay = (dayData: DayData | undefined) => {
    if (!dayData) return [];
    const shifts: string[] = [];
    if (dayData.startTime && dayData.endTime) {
      shifts.push(`${dayData.startTime} - ${dayData.endTime}`);
    }
    if (dayData.startTime2 && dayData.endTime2) {
      shifts.push(`${dayData.startTime2} - ${dayData.endTime2}`);
    }
    return shifts;
  };

  return (
    <Dialog open={!!weekStart} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex flex-wrap items-baseline gap-3">
            <DialogTitle className="text-2xl font-semibold tracking-tight text-foreground">
              Resum Setmana {weekNumber}
            </DialogTitle>
            <p className="text-base font-medium text-muted-foreground">
              {format(displayStart, 'd')} - {format(displayEnd, 'd')} de {MONTH_NAMES_CA[displayStart.getMonth()]}
            </p>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="p-4 bg-card rounded-lg border">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-sm text-muted-foreground">Hores teòriques</p>
                <p className="text-2xl font-bold">{formatHoursMinutes(totalTheoretical)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Hores treballades</p>
                <p className="text-2xl font-bold">{formatHoursMinutes(totalWorked)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Diferència</p>
                <p className={`text-2xl font-bold ${difference >= 0 ? 'text-[hsl(var(--status-complete))]' : 'text-[hsl(var(--status-deficit))]'}`}>
                  {formatHoursDisplay(difference)}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {days.map((day) => {
            if (isWeekend(day)) return null;
            
            const dateStr = format(day, 'yyyy-MM-dd');
            const dayData = daysData[dateStr];
            const holiday = isHoliday(day, config.holidays);
            const dayType = getDayTypeForDate(day, config);
            const theoretical = getTheoreticalHoursForDate(day, config);
            const baseWorked = calculateDayWorkedHours(dayData);
            const absences = getDayAbsences(dayData);
            const partialAbsences = absences.filter((absence) => absence.type !== 'vacances');
            const extraHours = getTotalPartialAbsenceHours(dayData);
            const worked = capDailyHours(baseWorked + extraHours);
            const excludedFromTotals = holiday || hasAbsence(dayData, 'vacances');
            const summaryTheoretical = excludedFromTotals ? 0 : theoretical;
            const summaryWorked = excludedFromTotals ? 0 : worked;
            const dayDifference = summaryWorked - summaryTheoretical;
            const DayIcon = dayType === 'teletreball' ? Home : Building2;
            const statusCardClass = getStatusCardClass(dayData, holiday, worked, theoretical);
            const schedule = getScheduleDisplay(dayData);
            
            return (
              <div
                key={dateStr}
                className={`p-4 rounded-lg border ${statusCardClass}`}
              >
                <div className="grid grid-cols-1 md:grid-cols-[1fr_1.2fr] gap-4">
                  <div className="flex flex-col gap-2">
                    <div className="text-lg font-semibold">
                      {getDayName(day)}, {format(day, 'd')}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">{formatHoursMinutes(summaryTheoretical)}</Badge>
                      <Badge variant={dayType === 'presencial' ? 'default' : 'secondary'} className="text-xs">
                        <DayIcon className="w-3 h-3 mr-1" />
                        {dayType === 'presencial' ? 'Presencial' : 'Teletreball'}
                      </Badge>
                      {holiday && (
                        <Badge variant="outline" className="text-xs flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Festiu
                        </Badge>
                      )}
                      {!holiday && absences.map((absence) => {
                        const label = absence.type === 'vacances'
                          ? 'Vacances'
                          : absence.type === 'assumpte_propi'
                            ? 'AP'
                            : absence.type === 'flexibilitat'
                              ? 'FX'
                              : 'Altres';
                        const StatusIcon = absence.type === 'vacances'
                          ? Plane
                          : absence.type === 'assumpte_propi'
                            ? Clock
                            : absence.type === 'flexibilitat'
                              ? Sparkles
                              : MoreHorizontal;
                        const ApprovalIcon = absence.requestStatus === 'aprovat' ? Check : AlertTriangle;
                        return (
                          <Badge
                            key={absence.type}
                            variant={absence.requestStatus === 'aprovat' ? 'outline' : 'destructive'}
                            className="text-xs flex items-center gap-1"
                          >
                            <StatusIcon className="w-3 h-3" />
                            {label}
                            <ApprovalIcon className="w-3 h-3" />
                            {absence.requestStatus === 'aprovat' ? 'Aprovat' : 'Falta aprovar'}
                          </Badge>
                        );
                      })}
                      {excludedFromTotals && (
                        <Badge variant="secondary" className="text-xs">
                          No computa
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                    <div className="space-y-1">
                      <p className="text-muted-foreground">Horari</p>
                      {holiday || hasAbsence(dayData, 'vacances') ? (
                        <p className="font-medium">—</p>
                      ) : schedule.length > 0 ? (
                        <div className="font-medium space-y-1">
                          {schedule.map((shift) => (
                            <div key={shift}>{shift}</div>
                          ))}
                        </div>
                      ) : (
                        <p className="font-medium text-muted-foreground">Sense horari</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground">Hores treballades</p>
                      <p className="font-medium">{formatHoursMinutes(summaryWorked)}</p>
                      {partialAbsences.map((absence) => (
                        <p key={absence.type} className="text-xs text-muted-foreground">
                          +{formatHoursMinutes(absence.hours || 0)} {
                            absence.type === 'assumpte_propi'
                              ? 'AP'
                              : absence.type === 'flexibilitat'
                                ? 'FX'
                                : 'Altres'
                          }
                        </p>
                      ))}
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground">Diferència</p>
                      <p className={`font-semibold ${dayDifference >= 0 ? 'text-[hsl(var(--status-complete))]' : 'text-[hsl(var(--status-deficit))]'}`}>
                        {formatHoursDisplay(dayDifference)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter>
          <Button onClick={onClose}>
            Tancar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
