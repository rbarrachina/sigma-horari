import { cn } from '@/lib/utils';
import type { DayData, UserConfig } from '@/types';
import { isWeekend, isHoliday, calculateTotalWorkedHours, getTheoreticalHoursForDate, calculateWeeklySummary } from '@/lib/timeCalculations';
import { format, eachDayOfInterval, startOfDay } from 'date-fns';
import { CheckCircle, AlertCircle, XCircle, FilePenLine } from 'lucide-react';
import { hasAbsence, hasApprovedAbsence, hasPendingAbsence } from '@/lib/absences';
import { getAppDate } from '@/lib/appDate';

interface WeeklySummaryIconProps {
  weekStart: Date;
  weekEnd: Date;
  daysData: Record<string, DayData>;
  config: UserConfig;
  onClick: () => void;
}

export function WeeklySummaryIcon({ weekStart, weekEnd, daysData, config, onClick }: WeeklySummaryIconProps) {
  if (startOfDay(weekStart) > startOfDay(getAppDate())) {
    return null;
  }

  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const manualSummary = config.manualWeeklySummaries?.[format(weekStart, 'yyyy-MM-dd')];
  const hasAnyData = days.some((day) => !!daysData[format(day, 'yyyy-MM-dd')]);
  
  // Check if all workdays have data or are properly handled
  let allComplete = true;
  let totalTheoretical = 0;
  let totalWorked = 0;
  
  for (const day of days) {
    if (manualSummary) break;
    if (isWeekend(day)) continue;
    if (isHoliday(day, config.holidays)) continue;
    
    const dateStr = format(day, 'yyyy-MM-dd');
    const dayData = daysData[dateStr];

    if (!hasAbsence(dayData, 'vacances')) {
      const theoretical = getTheoreticalHoursForDate(day, config);
      totalTheoretical += theoretical;

      totalWorked += calculateTotalWorkedHours(dayData);
    }
    
    if (!dayData) {
      allComplete = false;
      continue;
    }

    // Check if pending approval
    if (hasPendingAbsence(dayData)) {
      allComplete = false;
    }
    
    // Check if laboral day has times
    const hasAnyShift = Boolean(
      (dayData.startTime && dayData.endTime) || (dayData.startTime2 && dayData.endTime2)
    );
    if (!hasAbsence(dayData, 'vacances') && !hasApprovedAbsence(dayData) && !hasAnyShift) {
      allComplete = false;
    }
  }
  
  const difference = manualSummary
    ? calculateWeeklySummary(weekStart, daysData, config).difference
    : totalWorked - totalTheoretical;
  const hasNegativeDifference = difference < 0;
  
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center justify-center w-8 h-8 rounded-full transition-all hover:scale-110',
        !hasAnyData && !manualSummary
          ? 'border border-muted-foreground/30 bg-muted/40 text-muted-foreground'
          : manualSummary
          ? 'bg-[hsl(var(--status-complete))] text-[hsl(var(--status-complete-foreground))]'
          : hasNegativeDifference
          ? 'bg-destructive text-destructive-foreground'
          : allComplete 
            ? 'bg-[hsl(var(--status-complete))] text-[hsl(var(--status-complete-foreground))]' 
            : 'bg-[hsl(var(--status-deficit))] text-[hsl(var(--status-deficit-foreground))]'
      )}
      title={
        !hasAnyData && !manualSummary
          ? 'Introduir resum setmanal'
          : manualSummary
          ? 'Resum setmanal introduït manualment'
          : hasNegativeDifference
          ? "Setmana amb dèficit d'hores"
          : allComplete
            ? 'Setmana completa'
            : 'Setmana amb pendents'
      }
    >
      {manualSummary ? (
        <FilePenLine className="h-4 w-4" />
      ) : !hasAnyData ? (
        <FilePenLine className="h-4 w-4" />
      ) : hasNegativeDifference ? (
        <XCircle className="w-5 h-5" />
      ) : allComplete ? (
          <CheckCircle className="w-5 h-5" />
        ) : (
          <AlertCircle className="w-5 h-5" />
        )}
    </button>
  );
}
