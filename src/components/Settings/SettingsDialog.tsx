import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { X, Plus, Download, Upload, Trash2, AlertTriangle, AlertCircle, Info, Github } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import type { UserConfig, DayType, SchedulePeriod, ScheduleType } from '@/types';
import { APP_INFO, DAYS_OF_WEEK, DAY_NAMES_CA, MONTH_NAMES_CA, SCHEDULE_HOURS } from '@/lib/constants';
import { format, parseISO, eachDayOfInterval, isWithinInterval, endOfMonth } from 'date-fns';
import { exportAllData, importAllData, resetAllData, type ExportData } from '@/lib/storage';
import { safeValidateExportData, MAX_IMPORT_FILE_SIZE } from '@/lib/validation';
import { toast } from 'sonner';

const ONBOARDING_TABS = {
  1: 'personal',
  2: 'schedule',
  3: 'holidays',
} as const;

const MAX_AP_HOURS = 500;

const SETTINGS_TABS = [
  { value: 'personal', label: 'Personal' },
  { value: 'schedule', label: 'Horari' },
  { value: 'holidays', label: 'Festius' },
  { value: 'data', label: 'Dades' },
  { value: 'authorship', label: 'Autoria' },
] as const;

interface SettingsDialogProps {
  open: boolean;
  config: UserConfig;
  onClose: () => void;
  onSave: (config: UserConfig) => void;
  onDataReset?: () => void;
  onboardingStep?: number;
  onOnboardingStepChange?: (step: number) => void;
}

export function SettingsDialog({
  open,
  config,
  onClose,
  onSave,
  onDataReset,
  onboardingStep = 0,
  onOnboardingStepChange,
}: SettingsDialogProps) {
  const [localConfig, setLocalConfig] = useState<UserConfig>(config);
  const [apTotalHours, setApTotalHours] = useState(0);
  const [apTotalMinutes, setApTotalMinutes] = useState(0);
  const [newHoliday, setNewHoliday] = useState('');
  const [activeTab, setActiveTab] = useState<'personal' | 'schedule' | 'holidays' | 'data' | 'authorship'>('personal');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isOnboarding = onboardingStep > 0;
  const visibleTabs = SETTINGS_TABS;
  const isTabEnabled = (value: typeof SETTINGS_TABS[number]['value']) => {
    if (!isOnboarding) return true;
    if (value === 'personal') return true;
    if (value === 'schedule') return onboardingStep >= 2;
    if (value === 'holidays') return onboardingStep >= 3;
    if (value === 'data' || value === 'authorship') return onboardingStep >= 3;
    return false;
  };

  useEffect(() => {
    setLocalConfig(config);
    const totalMinutes = Math.round(config.totalAPHours * 60);
    setApTotalHours(Math.floor(totalMinutes / 60));
    setApTotalMinutes(totalMinutes % 60);
  }, [config]);

  useEffect(() => {
    if (!open) return;
    if (isOnboarding) {
      setActiveTab(ONBOARDING_TABS[onboardingStep] ?? 'personal');
      return;
    }
    setActiveTab('personal');
  }, [open, isOnboarding, onboardingStep]);

  const getYearBounds = (year: number) => ({
    start: new Date(year, 0, 1),
    end: new Date(year, 11, 31),
    startString: format(new Date(year, 0, 1), 'yyyy-MM-dd'),
    endString: format(new Date(year, 11, 31), 'yyyy-MM-dd'),
  });

  const getHolidayBounds = (year: number) => ({
    startString: format(new Date(year, 0, 1), 'yyyy-MM-dd'),
    endString: format(new Date(year + 1, 0, 31), 'yyyy-MM-dd'),
  });

  const shiftDateToYear = (date: string, year: number) => {
    const parsed = parseISO(date);
    const monthIndex = parsed.getMonth();
    const day = parsed.getDate();
    let shifted = new Date(year, monthIndex, day);
    if (shifted.getMonth() !== monthIndex) {
      shifted = endOfMonth(new Date(year, monthIndex, 1));
    }
    return format(shifted, 'yyyy-MM-dd');
  };

  const handleCalendarYearChange = (year: number) => {
    setLocalConfig(prev => {
      if (prev.calendarYear === year || Number.isNaN(year)) {
        return prev;
      }
      const updatedPeriods = prev.schedulePeriods.map(period => ({
        ...period,
        startDate: shiftDateToYear(period.startDate, year),
        endDate: shiftDateToYear(period.endDate, year),
      }));
      const updatedHolidays = prev.holidays.map(holiday => shiftDateToYear(holiday, year));
      return {
        ...prev,
        calendarYear: year,
        schedulePeriods: sortSchedulePeriods(updatedPeriods),
        holidays: Array.from(new Set(updatedHolidays)).sort(),
      };
    });
  };

  // Validate that all days of the selected year are covered by schedule periods
  const validateScheduleCoverage = (periods: SchedulePeriod[]): { isValid: boolean; missingDays: number } => {
    const { start: yearStart, end: yearEnd } = getYearBounds(localConfig.calendarYear);
    const allDays = eachDayOfInterval({ start: yearStart, end: yearEnd });
    
    let coveredDays = 0;
    allDays.forEach(day => {
      for (const period of periods) {
        const start = parseISO(period.startDate);
        const end = parseISO(period.endDate);
        const [rangeStart, rangeEnd] = start > end ? [end, start] : [start, end];
        if (isWithinInterval(day, { start: rangeStart, end: rangeEnd })) {
          coveredDays++;
          break;
        }
      }
    });
    
    return {
      isValid: coveredDays === allDays.length,
      missingDays: allDays.length - coveredDays,
    };
  };

  const sortSchedulePeriods = (periods: SchedulePeriod[]): SchedulePeriod[] =>
    [...periods].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

  const sortedSchedulePeriods = sortSchedulePeriods(localConfig.schedulePeriods);
  const scheduleValidation = validateScheduleCoverage(sortedSchedulePeriods);
  const yearBounds = getYearBounds(localConfig.calendarYear);
  const holidayBounds = getHolidayBounds(localConfig.calendarYear);

  const handleSave = () => {
    if (!scheduleValidation.isValid) {
      toast.error(`Falten ${scheduleValidation.missingDays} dies per definir`);
      return;
    }
    onSave({ ...localConfig, schedulePeriods: sortedSchedulePeriods });
    if (isOnboarding) {
      if (onboardingStep < 3) {
        onOnboardingStepChange?.(onboardingStep + 1);
        return;
      }
      onOnboardingStepChange?.(0);
    }
    onClose();
  };

  const updateWeeklyConfig = (day: keyof typeof localConfig.weeklyConfig, value: DayType) => {
    setLocalConfig(prev => ({
      ...prev,
      weeklyConfig: {
        ...prev.weeklyConfig,
        [day]: {
          dayType: value,
        },
      },
    }));
  };

  const updateAPTotalHours = (nextHours: number, nextMinutes: number) => {
    const safeHours = Number.isNaN(nextHours) ? 0 : Math.max(0, nextHours);
    const safeMinutes = Number.isNaN(nextMinutes) ? 0 : Math.max(0, nextMinutes);
    let adjustedHours = safeHours;
    let adjustedMinutes = Math.min(safeMinutes, 59);

    if (adjustedHours >= MAX_AP_HOURS) {
      adjustedHours = MAX_AP_HOURS;
      adjustedMinutes = 0;
    }

    if (adjustedHours + adjustedMinutes / 60 > MAX_AP_HOURS) {
      adjustedMinutes = 0;
    }

    setApTotalHours(adjustedHours);
    setApTotalMinutes(adjustedMinutes);
    setLocalConfig(prev => ({ ...prev, totalAPHours: adjustedHours + adjustedMinutes / 60 }));
  };

  const updateSchedulePeriod = (id: string, field: 'startDate' | 'endDate' | 'scheduleType', value: string) => {
    setLocalConfig(prev => {
      const periodIndex = prev.schedulePeriods.findIndex(p => p.id === id);
      if (periodIndex === -1) return prev;

      const updatedPeriod = { ...prev.schedulePeriods[periodIndex] };
      const { startString: yearStart } = getYearBounds(prev.calendarYear);

      if (field === 'scheduleType') {
        updatedPeriod.scheduleType = value as ScheduleType;
      } else if (field === 'startDate' && updatedPeriod.startDate === yearStart) {
        return prev;
      } else {
        updatedPeriod[field] = value;
      }

      const updatedPeriods = [...prev.schedulePeriods];
      updatedPeriods[periodIndex] = updatedPeriod;
      return { ...prev, schedulePeriods: sortSchedulePeriods(updatedPeriods) };
    });
  };

  const addSchedulePeriod = () => {
    setLocalConfig(prev => {
      const sorted = sortSchedulePeriods(prev.schedulePeriods);
      const { endString: yearEnd, startString: yearStart } = getYearBounds(prev.calendarYear);
      const lastPeriod = sorted[sorted.length - 1];
      const lastEndDate = lastPeriod ? parseISO(lastPeriod.endDate) : parseISO(yearStart);
      if (lastPeriod && lastPeriod.endDate >= yearEnd) {
        return prev;
      }
      const nextStartDate = new Date(lastEndDate);
      nextStartDate.setDate(nextStartDate.getDate() + 1);
      const nextType: ScheduleType = lastPeriod?.scheduleType === 'estiu' ? 'hivern' : 'estiu';
      const newPeriod: SchedulePeriod = {
        id: `period-${Date.now()}`,
        startDate: format(nextStartDate, 'yyyy-MM-dd'),
        endDate: yearEnd,
        scheduleType: nextType,
      };
      return { ...prev, schedulePeriods: [...sorted, newPeriod] };
    });
  };

  const removeSchedulePeriod = (id: string) => {
    setLocalConfig(prev => {
      const remaining = prev.schedulePeriods.filter(period => period.id !== id);
      if (remaining.length === 0) {
        return prev;
      }
      return { ...prev, schedulePeriods: sortSchedulePeriods(remaining) };
    });
  };

  const addHoliday = () => {
    const isWithinHolidayBounds = newHoliday >= holidayBounds.startString && newHoliday <= holidayBounds.endString;
    if (newHoliday && isWithinHolidayBounds && !localConfig.holidays.includes(newHoliday)) {
      setLocalConfig(prev => ({
        ...prev,
        holidays: [...prev.holidays, newHoliday].sort(),
      }));
      setNewHoliday('');
    }
  };

  const removeHoliday = (holiday: string) => {
    setLocalConfig(prev => ({
      ...prev,
      holidays: prev.holidays.filter(h => h !== holiday),
    }));
  };

  // Sort holidays by date
  const sortedHolidays = [...localConfig.holidays].sort((a, b) => 
    new Date(a).getTime() - new Date(b).getTime()
  );

  const handleExport = () => {
    const data = exportAllData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `control-horari-${format(new Date(), 'yyyy-MM-dd')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Dades exportades correctament');
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file size limit
    if (file.size > MAX_IMPORT_FILE_SIZE) {
      toast.error(`El fitxer és massa gran. Màxim: ${MAX_IMPORT_FILE_SIZE / 1024 / 1024}MB`);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const rawData = JSON.parse(e.target?.result as string);
        
        // Validate data against schema
        const validationResult = safeValidateExportData(rawData);
        
        if (!validationResult.success) {
          toast.error('error' in validationResult ? validationResult.error : 'Dades invàlides');
          return;
        }
        
        // Data is now validated, safe to import
        if (importAllData(validationResult.data as ExportData)) {
          toast.success('Dades importades correctament. Recarregant...');
          setTimeout(() => window.location.reload(), 1000);
        } else {
          toast.error('Error important les dades');
        }
      } catch (error) {
        if (error instanceof SyntaxError) {
          toast.error('El fitxer no és un JSON vàlid');
        } else {
          toast.error('Error llegint el fitxer');
        }
      }
    };
    reader.onerror = () => {
      toast.error('Error llegint el fitxer');
    };
    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleReset = () => {
    resetAllData();
    toast.success('Dades esborrades. Recarregant...');
    setTimeout(() => window.location.reload(), 1000);
  };

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && isOnboarding) {
      return;
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Configuració</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList
            className="grid w-full"
            style={{ gridTemplateColumns: `repeat(${visibleTabs.length}, minmax(0, 1fr))` }}
          >
            {visibleTabs.map(tab => (
              <TabsTrigger key={tab.value} value={tab.value} disabled={!isTabEnabled(tab.value)}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="personal" className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Nom</Label>
                <Input
                  id="firstName"
                  value={localConfig.firstName}
                  onChange={(e) => setLocalConfig(prev => ({ ...prev, firstName: e.target.value }))}
                  placeholder="El teu nom"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="calendarYear">Any del calendari</Label>
                <Input
                  id="calendarYear"
                  type="number"
                  min={1900}
                  max={2200}
                  value={localConfig.calendarYear}
                  onChange={(e) => {
                    if (e.target.value === '') {
                      return;
                    }
                    handleCalendarYearChange(Number(e.target.value));
                  }}
                />
              </div>
            </div>

            <div className="grid gap-4">
              <div className="space-y-2 max-w-sm">
                <Label htmlFor="vacationDays">Dies de vacances totals</Label>
                <Input
                  id="vacationDays"
                  type="number"
                  value={localConfig.totalVacationDays}
                  onChange={(e) => setLocalConfig(prev => ({ ...prev, totalVacationDays: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2 max-w-sm">
                <Label>Hores d'AP totals</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="apHours" className="text-xs text-muted-foreground">Hores</Label>
                    <Input
                      id="apHours"
                      type="number"
                      min={0}
                      max={MAX_AP_HOURS}
                      step="1"
                      value={apTotalHours}
                      onChange={(e) => {
                        const nextHours = parseInt(e.target.value) || 0;
                        updateAPTotalHours(nextHours, apTotalMinutes);
                      }}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="apMinutes" className="text-xs text-muted-foreground">Minuts</Label>
                    <Input
                      id="apMinutes"
                      type="number"
                      min={0}
                      max={apTotalHours >= MAX_AP_HOURS ? 0 : 59}
                      step="1"
                      value={apTotalMinutes}
                      onChange={(e) => {
                        const nextMinutes = parseInt(e.target.value) || 0;
                        updateAPTotalHours(apTotalHours, nextMinutes);
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

          </TabsContent>

          {(!isOnboarding || onboardingStep >= 2) && (
            <TabsContent value="schedule" className="space-y-4 pt-4">
            <div className="mb-6 flex items-center gap-3">
              <Label htmlFor="defaultStart" className="min-w-[200px]">
                Hora d'inici per defecte
              </Label>
              <Input
                id="defaultStart"
                type="time"
                value={localConfig.defaultStartTime}
                onChange={(e) => setLocalConfig(prev => ({ ...prev, defaultStartTime: e.target.value }))}
                className="max-w-[160px]"
              />
            </div>

            <div className="space-y-3">
              <Label>Configuració setmanal (Presencial / Teletreball)</Label>
              {DAYS_OF_WEEK.map((day) => (
                <div key={day} className="flex items-center gap-4 p-3 bg-muted rounded-lg">
                  <span className="font-medium w-24">{DAY_NAMES_CA[day]}</span>
                  <Select
                    value={localConfig.weeklyConfig[day].dayType}
                    onValueChange={(v) => updateWeeklyConfig(day, v as DayType)}
                  >
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="presencial">Presencial</SelectItem>
                      <SelectItem value="teletreball">Teletreball</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            <div className="border-t pt-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Franges horàries (Estiu / Hivern)</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Estiu: {SCHEDULE_HOURS.estiu}h/dia | Hivern: {SCHEDULE_HOURS.hivern}h/dia
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={addSchedulePeriod}
                  disabled={sortedSchedulePeriods[sortedSchedulePeriods.length - 1]?.endDate >= getYearBounds(localConfig.calendarYear).endString}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Afegir franja
                </Button>
              </div>

              {!scheduleValidation.isValid && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">Falten {scheduleValidation.missingDays} dies per definir!</span>
                </div>
              )}

              <div className="space-y-2">
                {sortedSchedulePeriods.map((period, index) => {
                  const isYearStart = period.startDate === yearBounds.startString;
                  const isFirstPeriod = index === 0;
                  return (
                    <div key={period.id} className="flex items-center gap-2 p-3 bg-muted rounded-lg flex-wrap">
                      <Select
                        value={period.scheduleType}
                        onValueChange={(v) => updateSchedulePeriod(period.id, 'scheduleType', v)}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hivern">Hivern</SelectItem>
                          <SelectItem value="estiu">Estiu</SelectItem>
                        </SelectContent>
                      </Select>
                      <span className="text-sm text-muted-foreground">de</span>
                      <Input
                        type="date"
                        className="w-36"
                        value={period.startDate}
                        onChange={(e) => updateSchedulePeriod(period.id, 'startDate', e.target.value)}
                        min={yearBounds.startString}
                        max={yearBounds.endString}
                        disabled={isYearStart}
                        title={isYearStart ? 'El dia 01/01 no es pot editar.' : undefined}
                      />
                      <span className="text-sm text-muted-foreground">a</span>
                      <Input
                        type="date"
                        className="w-36"
                        value={period.endDate}
                        onChange={(e) => updateSchedulePeriod(period.id, 'endDate', e.target.value)}
                        min={yearBounds.startString}
                        max={yearBounds.endString}
                      />
                      <span className="text-muted-foreground text-sm ml-auto">
                        ({SCHEDULE_HOURS[period.scheduleType]}h/dia)
                      </span>
                      {!isFirstPeriod && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => removeSchedulePeriod(period.id)}
                          disabled={sortedSchedulePeriods.length <= 1}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            </TabsContent>
          )}

          {(!isOnboarding || onboardingStep >= 3) && (
            <TabsContent value="holidays" className="space-y-4 pt-4">
            <div className="flex gap-2">
              <Input
                type="date"
                value={newHoliday}
                onChange={(e) => setNewHoliday(e.target.value)}
                min={holidayBounds.startString}
                max={holidayBounds.endString}
              />
              <Button onClick={addHoliday} size="icon">
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {sortedHolidays.map((holiday) => {
                const date = parseISO(holiday);
                return (
                  <div key={holiday} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                    <span>
                      {format(date, 'd')} de {MONTH_NAMES_CA[date.getMonth()]}
                      {date.getFullYear() !== localConfig.calendarYear ? ` de ${date.getFullYear()}` : ''}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => removeHoliday(holiday)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
            </TabsContent>
          )}

          {(!isOnboarding || onboardingStep >= 3) && (
            <TabsContent value="data" className="space-y-6 pt-4">
            {/* Privacy Notice */}
            <div className="flex gap-3 p-3 bg-muted/50 rounded-lg border">
              <Info className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">Avís de privacitat</p>
                <p>
                  Totes les dades es guarden localment al teu navegador (localStorage). 
                  No s'envien a cap servidor extern. Fes còpies de seguretat regularment 
                  i esborra les dades si fas servir un ordinador compartit.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Exportar dades</h3>
              <p className="text-sm text-muted-foreground">
                Descarrega totes les dades en un fitxer JSON per fer còpia de seguretat.
              </p>
              <Button onClick={handleExport} className="w-full">
                <Download className="w-4 h-4 mr-2" />
                Exportar dades
              </Button>
            </div>

            <div className="border-t pt-4 space-y-4">
              <h3 className="text-lg font-semibold">Importar dades</h3>
              <p className="text-sm text-muted-foreground">
                Carrega un fitxer JSON exportat anteriorment (màxim 5MB). Això sobreescriurà les dades actuals.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
                id="import-file"
              />
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-4 h-4 mr-2" />
                Importar dades
              </Button>
            </div>

            <div className="border-t pt-4 space-y-4">
              <h3 className="text-lg font-semibold text-destructive">Reset complet</h3>
              <p className="text-sm text-muted-foreground">
                Esborra totes les dades i comença des de zero. Aquesta acció és irreversible.
              </p>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Esborrar totes les dades
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-destructive" />
                      Estàs segur?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Aquesta acció esborrarà totes les dades de configuració i registres horaris.
                      No es pot desfer.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel·lar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleReset} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Sí, esborrar tot
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
            </TabsContent>
          )}

          {(!isOnboarding || onboardingStep >= 3) && (
            <TabsContent value="authorship" className="space-y-6 pt-4">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold">Detalls del projecte</h3>
            </div>
            <dl className="grid gap-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                <dt className="text-muted-foreground">Nom del programa</dt>
                <dd className="font-medium text-right">{APP_INFO.name}</dd>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                <dt className="text-muted-foreground">Autor</dt>
                <dd className="flex items-center gap-2 font-medium text-right">
                  <span>{APP_INFO.author}</span>
                  <a
                    href="https://github.com/rbarrachina"
                    className="text-muted-foreground transition-colors hover:text-foreground"
                    aria-label="Perfil de Github de Rafa Barrachina"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Github className="h-4 w-4" />
                  </a>
                </dd>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                <dt className="text-muted-foreground">Llicència</dt>
                <dd className="font-medium text-right">
                  <Badge variant="outline">{APP_INFO.license}</Badge>
                </dd>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                <dt className="text-muted-foreground">Any</dt>
                <dd className="font-medium text-right">{APP_INFO.year}</dd>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <dt className="text-muted-foreground">Versió</dt>
                <dd className="font-medium text-right">{APP_INFO.version}</dd>
              </div>
            </dl>
            </TabsContent>
          )}
        </Tabs>

        <DialogFooter>
          {!isOnboarding && (
            <Button variant="outline" onClick={onClose}>
              Cancel·lar
            </Button>
          )}
          <Button onClick={handleSave} disabled={!scheduleValidation.isValid}>
            {isOnboarding ? (onboardingStep < 3 ? 'Desar i continuar' : 'Desar i finalitzar') : 'Desar canvis'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
