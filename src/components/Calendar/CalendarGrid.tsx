import { useEffect, useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isToday, addMonths, subMonths, getDay } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CalendarDay } from './CalendarDay';
import { DayDetailDialog } from './DayDetailDialog';
import { WeeklySummaryIcon } from './WeeklySummaryIcon';
import { WeeklySummaryDialog } from './WeeklySummaryDialog';
import { MONTH_NAMES_CA } from '@/lib/constants';
import type { DayData, UserConfig } from '@/types';

interface CalendarGridProps {
  daysData: Record<string, DayData>;
  config: UserConfig;
  onDayUpdate: (dayData: DayData) => void;
}

export function CalendarGrid({ daysData, config, onDayUpdate }: CalendarGridProps) {
  const getInitialDate = (year: number) => {
    const today = new Date();
    return today.getFullYear() === year ? today : new Date(year, 0, 1);
  };

  const [currentDate, setCurrentDate] = useState(getInitialDate(config.calendarYear));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<{ start: Date; end: Date } | null>(null);
  const calendarYear = config.calendarYear;

  useEffect(() => {
    setCurrentDate(getInitialDate(calendarYear));
  }, [calendarYear]);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const goToPreviousMonth = () => {
    const newDate = subMonths(currentDate, 1);
    if (newDate.getFullYear() >= calendarYear) {
      setCurrentDate(newDate);
    }
  };

  const goToNextMonth = () => {
    const newDate = addMonths(currentDate, 1);
    if (newDate.getFullYear() <= calendarYear) {
      setCurrentDate(newDate);
    }
  };

  // Group days by week for rendering
  const weeks: Date[][] = [];
  let currentWeek: Date[] = [];
  
  days.forEach((day, index) => {
    currentWeek.push(day);
    if (getDay(day) === 0) { // Sunday
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });
  if (currentWeek.length > 0) {
    weeks.push(currentWeek);
  }

  const weekDayHeaders = ['Dl', 'Dt', 'Dc', 'Dj', 'Dv', 'Ds', 'Dg', ''];
  const requestedVacationDays = Object.values(daysData).filter((day) => day.dayStatus === 'vacances').length;

  return (
    <div className="bg-card rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <Button
          variant="outline"
          size="icon"
          onClick={goToPreviousMonth}
          disabled={currentDate.getMonth() === 0 && currentDate.getFullYear() === calendarYear}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <h2 className="text-2xl font-bold text-foreground">
          {MONTH_NAMES_CA[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h2>
        
        <Button
          variant="outline"
          size="icon"
          onClick={goToNextMonth}
          disabled={currentDate.getMonth() === 11 && currentDate.getFullYear() === calendarYear}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-8 gap-2 mb-2">
        {weekDayHeaders.map((day, index) => (
          <div
            key={`header-${index}`}
            className="text-center text-sm font-medium text-muted-foreground py-2"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="space-y-2">
        {weeks.map((week, weekIndex) => {
          const weekStart = startOfWeek(week[0], { weekStartsOn: 1 });
          const weekEnd = endOfWeek(week[0], { weekStartsOn: 1 });
          
          return (
            <div key={weekIndex} className="grid grid-cols-8 gap-2">
              {week.map((day) => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const isInCalendarYear = day.getFullYear() === calendarYear;
                return (
                  <CalendarDay
                    key={dateStr}
                    date={day}
                    dayData={isInCalendarYear ? daysData[dateStr] || null : null}
                    config={config}
                    isCurrentMonth={isSameMonth(day, currentDate)}
                    isInCalendarYear={isInCalendarYear}
                    isToday={isToday(day)}
                    onClick={() => setSelectedDate(day)}
                  />
                );
              })}
              {/* Fill missing days in partial weeks */}
              {week.length < 7 && Array(7 - week.length).fill(null).map((_, i) => (
                <div key={`empty-${i}`} className="h-20" />
              ))}
              {/* Weekly summary icon */}
              <div className="flex items-center justify-center">
                <WeeklySummaryIcon
                  weekStart={weekStart}
                  weekEnd={weekEnd}
                  daysData={daysData}
                  config={config}
                  onClick={() => setSelectedWeek({ start: weekStart, end: weekEnd })}
                />
              </div>
            </div>
          );
        })}
      </div>

      <DayDetailDialog
        date={selectedDate}
        dayData={selectedDate ? daysData[format(selectedDate, 'yyyy-MM-dd')] || null : null}
        config={config}
        requestedVacationDays={requestedVacationDays}
        onClose={() => setSelectedDate(null)}
        onSave={onDayUpdate}
      />
      
      <WeeklySummaryDialog
        weekStart={selectedWeek?.start || null}
        weekEnd={selectedWeek?.end || null}
        daysData={daysData}
        config={config}
        onClose={() => setSelectedWeek(null)}
      />
    </div>
  );
}
