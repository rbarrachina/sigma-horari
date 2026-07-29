import { useState, useEffect, useCallback, useRef } from 'react';
import type { UserConfig, DayData } from '@/types';
import { getUserConfig, saveUserConfig, getDaysData, saveDayData } from '@/lib/storage';
import { DEFAULT_USER_CONFIG, MAX_FLEXIBILITY_HOURS, MIN_WEEKLY_SURPLUS_FOR_FLEXIBILITY } from '@/lib/constants';
import { calculateWeeklySummary } from '@/lib/timeCalculations';
import { startOfWeek } from 'date-fns';
import { getAbsenceHours } from '@/lib/absences';

export function useTimeTracking() {
  const [config, setConfig] = useState<UserConfig>(DEFAULT_USER_CONFIG);
  const [daysData, setDaysData] = useState<Record<string, DayData>>({});
  const [isLoading, setIsLoading] = useState(true);
  const previousDaysDataRef = useRef<Record<string, DayData>>({});

  useEffect(() => {
    const loadedConfig = getUserConfig();
    const loadedDays = getDaysData(loadedConfig);
    setConfig(loadedConfig);
    setDaysData(loadedDays);
    previousDaysDataRef.current = loadedDays;
    setIsLoading(false);
  }, []);

  const updateConfig = useCallback((newConfig: UserConfig) => {
    const flexibilityHours = Math.min(MAX_FLEXIBILITY_HOURS, Math.max(0, newConfig.flexibilityHours));
    const updatedConfig = {
      ...newConfig,
      flexibilityHours,
      usedFlexHours: Math.min(newConfig.usedFlexHours, flexibilityHours),
    };
    setConfig(updatedConfig);
    saveUserConfig(updatedConfig);
  }, []);

  const updateDayData = useCallback((dayData: DayData) => {
    const previousDaysData = previousDaysDataRef.current;
    const previousDayData = previousDaysData[dayData.date];
    const updatedDaysData = { ...previousDaysData, [dayData.date]: dayData };

    setDaysData(updatedDaysData);
    saveDayData(dayData);
    previousDaysDataRef.current = updatedDaysData;

    // Handle vacation/AP approval changes
    setConfig(prev => {
      const updatedConfig = { ...prev };
      
      // Check if vacation status changed to approved
      const vacation = dayData.absences?.find((absence) => absence.type === 'vacances');
      const previousVacation = previousDayData?.absences?.find((absence) => absence.type === 'vacances');
      const vacationApproved = vacation
        ? vacation.requestStatus === 'aprovat'
        : dayData.dayStatus === 'vacances' && dayData.requestStatus === 'aprovat';
      const previousVacationApproved = previousVacation
        ? previousVacation.requestStatus === 'aprovat'
        : previousDayData?.dayStatus === 'vacances' && previousDayData.requestStatus === 'aprovat';

      if (vacationApproved) {
        // Only add if wasn't already approved
        if (!previousVacationApproved) {
          updatedConfig.usedVacationDays = Math.min(updatedConfig.totalVacationDays, updatedConfig.usedVacationDays + 1);
        }
      }
      
      // If vacation was approved but now it's not vacation or not approved, restore the day
      if (previousVacationApproved && !vacationApproved) {
        updatedConfig.usedVacationDays = Math.max(0, updatedConfig.usedVacationDays - 1);
      }
      
      // Track AP hours usage regardless of approval
      const previousAPHours = getAbsenceHours(previousDayData, 'assumpte_propi');
      const newAPHours = getAbsenceHours(dayData, 'assumpte_propi');
      const difference = newAPHours - previousAPHours;
      if (difference !== 0) {
        updatedConfig.usedAPHours = Math.max(0, Math.min(updatedConfig.totalAPHours, updatedConfig.usedAPHours + difference));
      }
      
      // Check if flexibility was used
      const previousFlexUsed = getAbsenceHours(previousDayData, 'flexibilitat');
      const newFlexUsed = getAbsenceHours(dayData, 'flexibilitat');
      const flexDifference = newFlexUsed - previousFlexUsed;
      if (flexDifference !== 0) {
        updatedConfig.usedFlexHours = Math.max(
          0,
          Math.min(MAX_FLEXIBILITY_HOURS, updatedConfig.usedFlexHours + flexDifference)
        );
      }

      const weekStart = startOfWeek(new Date(dayData.date), { weekStartsOn: 1 });
      const previousSummary = calculateWeeklySummary(weekStart, previousDaysData, prev);
      const newSummary = calculateWeeklySummary(weekStart, updatedDaysData, prev);
      const previousEligible = previousSummary.difference >= MIN_WEEKLY_SURPLUS_FOR_FLEXIBILITY ? previousSummary.difference : 0;
      const newEligible = newSummary.difference >= MIN_WEEKLY_SURPLUS_FOR_FLEXIBILITY ? newSummary.difference : 0;
      const weeklyDelta = newEligible - previousEligible;

      if (weeklyDelta !== 0) {
        updatedConfig.flexibilityHours = Math.min(
          MAX_FLEXIBILITY_HOURS,
          Math.max(0, updatedConfig.flexibilityHours + weeklyDelta)
        );
      }

      if (updatedConfig.usedFlexHours > updatedConfig.flexibilityHours) {
        updatedConfig.usedFlexHours = updatedConfig.flexibilityHours;
      }
      
      if (JSON.stringify(updatedConfig) !== JSON.stringify(prev)) {
        saveUserConfig(updatedConfig);
        return updatedConfig;
      }
      return prev;
    });
  }, []);

  const updateFlexibility = useCallback((hours: number) => {
    setConfig(prev => {
      const flexibilityHours = Math.min(MAX_FLEXIBILITY_HOURS, Math.max(0, hours));
      const updated = { 
        ...prev, 
        flexibilityHours,
        usedFlexHours: Math.min(prev.usedFlexHours, flexibilityHours),
      };
      saveUserConfig(updated);
      return updated;
    });
  }, []);

  const addVacationDay = useCallback(() => {
    setConfig(prev => {
      const updated = { ...prev, usedVacationDays: prev.usedVacationDays + 1 };
      saveUserConfig(updated);
      return updated;
    });
  }, []);

  const removeVacationDay = useCallback(() => {
    setConfig(prev => {
      const updated = { ...prev, usedVacationDays: Math.max(0, prev.usedVacationDays - 1) };
      saveUserConfig(updated);
      return updated;
    });
  }, []);

  const addAPHours = useCallback((hours: number) => {
    setConfig(prev => {
      const updated = { ...prev, usedAPHours: prev.usedAPHours + hours };
      saveUserConfig(updated);
      return updated;
    });
  }, []);

  const toggleHoliday = useCallback((date: string) => {
    setConfig(prev => {
      const holidays = prev.holidays.includes(date)
        ? prev.holidays.filter(h => h !== date)
        : [...prev.holidays, date];
      const updated = { ...prev, holidays };
      saveUserConfig(updated);
      return updated;
    });
  }, []);

  return {
    config,
    daysData,
    isLoading,
    updateConfig,
    updateDayData,
    updateFlexibility,
    addVacationDay,
    removeVacationDay,
    addAPHours,
    toggleHoliday,
  };
}
