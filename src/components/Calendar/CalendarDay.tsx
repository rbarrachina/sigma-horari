import { cn } from '@/lib/utils';
import type { DayData, UserConfig } from '@/types';
import { calculateTotalWorkedHours, isWeekend, isHoliday, getTheoreticalHoursForDate, getDayTypeForDate, normalizeHoursDifference } from '@/lib/timeCalculations';
import { format } from 'date-fns';
import { Home, Building2, Plane, Clock, Sparkles, Calendar, Check, MoreHorizontal } from 'lucide-react';
import { getDayAbsences, hasAbsence, hasApprovedAbsence } from '@/lib/absences';

interface CalendarDayProps {
  date: Date;
  dayData: DayData | null;
  config: UserConfig;
  isCurrentMonth: boolean;
  isInCalendarYear: boolean;
  isToday: boolean;
  onClick: () => void;
}

export function CalendarDay({ date, dayData, config, isCurrentMonth, isInCalendarYear, isToday, onClick }: CalendarDayProps) {
  const weekend = isWeekend(date);
  const holiday = isHoliday(date, config.holidays);
  const dateStr = format(date, 'yyyy-MM-dd');
  
  const getStatusColor = () => {
    // Weekend with holiday = purple
    if (weekend && holiday) return 'bg-[hsl(var(--status-holiday))] text-[hsl(var(--status-holiday-foreground))]';
    // Weekend = dark grey
    if (weekend) return 'bg-[hsl(var(--status-weekend))] text-foreground';
    // Holiday = purple
    if (holiday) return 'bg-[hsl(var(--status-holiday))] text-[hsl(var(--status-holiday-foreground))]';
    
    // Vacances = blue
    if (hasAbsence(dayData, 'vacances')) {
      return 'bg-[hsl(var(--status-vacation))] text-[hsl(var(--status-vacation-foreground))]';
    }
    
    // AP or FX with approval status
    if (getDayAbsences(dayData).length > 0) {
      const theoretical = getTheoreticalHoursForDate(date, config);
      const totalWorked = calculateTotalWorkedHours(dayData);
      const difference = normalizeHoursDifference(totalWorked - theoretical);
      if (hasApprovedAbsence(dayData) && difference >= 0) {
        return 'bg-[hsl(var(--status-complete))] text-[hsl(var(--status-complete-foreground))]';
      }
      return 'bg-[hsl(var(--status-deficit))] text-[hsl(var(--status-deficit-foreground))]';
    }
    
    // No data = light grey
    const hasAnyShift = Boolean(
      (dayData?.startTime && dayData?.endTime) || (dayData?.startTime2 && dayData?.endTime2)
    );
    if (!hasAnyShift) {
      return 'bg-[hsl(var(--status-weekday-empty))] text-[hsl(var(--status-pending-foreground))]';
    }
    
    const worked = calculateTotalWorkedHours(dayData);
    const theoretical = getTheoreticalHoursForDate(date, config);
    
    const difference = normalizeHoursDifference(worked - theoretical);
    if (difference >= 0) {
      return 'bg-[hsl(var(--status-complete))] text-[hsl(var(--status-complete-foreground))]';
    }
    return 'bg-[hsl(var(--status-deficit))] text-[hsl(var(--status-deficit-foreground))]';
  };

  const dayType = isInCalendarYear ? getDayTypeForDate(date, config) : null;
  const DayIcon = dayType === 'teletreball' ? Home : Building2;

  const getStatusIcons = () => {
    const icons = getDayAbsences(dayData).map((absence) => {
      if (absence.type === 'vacances') return <Plane key={absence.type} className="w-3 h-3" />;
      if (absence.type === 'assumpte_propi') return <Clock key={absence.type} className="w-3 h-3" />;
      if (absence.type === 'flexibilitat') return <Sparkles key={absence.type} className="w-3 h-3" />;
      return <MoreHorizontal key={absence.type} className="w-3 h-3" />;
    });
    if (icons.length > 0) return icons;
    if (holiday) return <Calendar className="w-3 h-3" />;
    return null;
  };

  const getApprovalIcon = () => {
    if (hasApprovedAbsence(dayData)) {
      return <Check className="w-3 h-3" />;
    }
    return null;
  };

  const formatAbsenceHours = (hours: number): string => {
    const h = Math.floor(hours);
    let m = Math.round((hours % 1) * 60);
    let adjustedHours = h;
    if (m === 60) {
      adjustedHours += 1;
      m = 0;
    }
    if (adjustedHours > 0 && m > 0) {
      return `${adjustedHours}h ${m}min`;
    }
    if (adjustedHours > 0) {
      return `${adjustedHours}h`;
    }
    return `${m} min`;
  };

  const absenceDisplays = getDayAbsences(dayData)
    .filter((absence) => absence.type !== 'vacances' && absence.hours)
    .map((absence) => {
      const label = absence.type === 'assumpte_propi'
        ? 'AP'
        : absence.type === 'flexibilitat'
          ? 'FX'
          : 'Altres';
      return `${label} = ${formatAbsenceHours(absence.hours || 0)}`;
    });

  const getShiftDisplay = () => {
    const shifts: string[] = [];
    if (dayData?.startTime && dayData?.endTime) {
      shifts.push(`${dayData.startTime} - ${dayData.endTime}`);
    }
    if (dayData?.startTime2 && dayData?.endTime2) {
      shifts.push(`${dayData.startTime2} - ${dayData.endTime2}`);
    }
    return shifts;
  };

  const shifts = getShiftDisplay();

  return (
    <button
      onClick={onClick}
      disabled={weekend || !isInCalendarYear}
      className={cn(
        'relative p-2 h-20 w-full rounded-lg transition-all duration-200 border',
        'hover:shadow-md hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-primary',
        getStatusColor(),
        !isCurrentMonth && 'opacity-40',
        isToday && 'ring-2 ring-primary ring-offset-2',
        (weekend || !isInCalendarYear) && 'cursor-default hover:scale-100 hover:shadow-none'
      )}
    >
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between">
          <span className={cn('text-sm font-semibold', isToday && 'text-primary')}>
            {format(date, 'd')}
          </span>
          {!weekend && !holiday && isInCalendarYear && (
            <DayIcon className="w-3.5 h-3.5 opacity-70" />
          )}
        </div>
        
        {!weekend && isInCalendarYear && (
          <div className="flex-1 flex flex-col justify-end">
            {shifts.length > 0 && (
              <div className="text-xs opacity-80 space-y-0.5">
                {shifts.map((shift) => (
                  <div key={shift}>{shift}</div>
                ))}
              </div>
            )}
            {absenceDisplays.map((display) => (
              <div key={display} className="text-xs opacity-80 font-medium">
                {display}
              </div>
            ))}
            <div className="absolute bottom-2 right-2 flex items-center gap-1">
              {getApprovalIcon()}
              {getStatusIcons()}
            </div>
          </div>
        )}
      </div>
    </button>
  );
}
