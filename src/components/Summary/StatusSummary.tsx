import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Plane, Clock, Sparkles, NotebookText } from 'lucide-react';
import { MAX_FLEXIBILITY_HOURS, MONTH_NAMES_CA } from '@/lib/constants';
import type { DayData, UserConfig } from '@/types';
import { format, parseISO } from 'date-fns';
import { getDayAbsences } from '@/lib/absences';

interface StatusSummaryProps {
  config: UserConfig;
  daysData: Record<string, DayData>;
  variant?: 'default' | 'compact';
  onConfigUpdate?: (config: UserConfig) => void;
}

export function StatusSummary({ config, daysData, variant = 'default', onConfigUpdate }: StatusSummaryProps) {
  const [vacationDialogOpen, setVacationDialogOpen] = useState(false);
  const [apDialogOpen, setApDialogOpen] = useState(false);
  const [flexDialogOpen, setFlexDialogOpen] = useState(false);
  const [otherDialogOpen, setOtherDialogOpen] = useState(false);
  const [otherNotesDraft, setOtherNotesDraft] = useState(config.otherNotes || '');
  const formatDuration = (hours: number): string => {
    const wholeHours = Math.floor(hours);
    let minutes = Math.round((hours % 1) * 60);
    let adjustedHours = wholeHours;
    if (minutes === 60) {
      adjustedHours += 1;
      minutes = 0;
    }
    if (adjustedHours > 0 && minutes > 0) {
      return `${adjustedHours}h ${minutes}min`;
    }
    if (adjustedHours > 0) {
      return `${adjustedHours}h`;
    }
    return `${minutes} min`;
  };

  const absenceEntries = Object.values(daysData).flatMap((day) =>
    getDayAbsences(day).map((absence) => ({ day, absence }))
  );
  const vacationEntries = absenceEntries.filter(({ absence }) => absence.type === 'vacances');
  const apEntries = absenceEntries.filter(({ absence }) => absence.type === 'assumpte_propi');
  const flexEntries = absenceEntries.filter(({ absence }) => absence.type === 'flexibilitat');
  const requestedVacationDays = vacationEntries.length;
  const pendingVacationDays = vacationEntries
    .filter(({ absence }) => absence.requestStatus === 'pendent').length;
  const remainingVacationDays = Math.max(0, config.totalVacationDays - requestedVacationDays);
  const vacationProgress = config.totalVacationDays > 0
    ? (requestedVacationDays / config.totalVacationDays) * 100
    : 0;
  const requestedAPHours = apEntries.reduce(
    (total, { absence }) => total + (absence.hours || 0),
    0
  );
  const pendingAPHours = apEntries.reduce(
    (total, { absence }) => total + (absence.requestStatus === 'pendent' ? (absence.hours || 0) : 0),
    0
  );
  const remainingAPHours = Math.max(0, config.totalAPHours - requestedAPHours);
  const apProgress = config.totalAPHours > 0
    ? (requestedAPHours / config.totalAPHours) * 100
    : 0;
  const requestedFlexHours = flexEntries.reduce(
    (total, { absence }) => total + (absence.hours || 0),
    0
  );
  const pendingFlexHours = flexEntries.reduce(
    (total, { absence }) => total + (absence.requestStatus === 'pendent' ? (absence.hours || 0) : 0),
    0
  );
  const remainingFlexHours = Math.max(0, config.flexibilityHours - requestedFlexHours);
  const flexProgress = MAX_FLEXIBILITY_HOURS > 0
    ? (requestedFlexHours / MAX_FLEXIBILITY_HOURS) * 100
    : 0;
  const approvedAPHours = Math.max(0, requestedAPHours - pendingAPHours);
  const vacationValue = pendingVacationDays > 0
    ? `${remainingVacationDays} dies (${pendingVacationDays} dies per aprovar)`
    : `${remainingVacationDays} dies`;
  const apValue = pendingAPHours > 0
    ? `${formatDuration(remainingAPHours)} (${formatDuration(pendingAPHours)} per aprovar)`
    : formatDuration(remainingAPHours);
  const approvedFlexHours = Math.max(0, requestedFlexHours - pendingFlexHours);
  const flexValue = pendingFlexHours > 0
    ? `${formatDuration(remainingFlexHours)} (${formatDuration(pendingFlexHours)} per aprovar)`
    : formatDuration(remainingFlexHours);
  const pendingVacationDaysList = vacationEntries
    .filter(({ absence }) => absence.requestStatus === 'pendent')
    .sort((a, b) => parseISO(a.day.date).getTime() - parseISO(b.day.date).getTime());
  const approvedVacationDaysList = vacationEntries
    .filter(({ absence }) => absence.requestStatus === 'aprovat')
    .sort((a, b) => parseISO(a.day.date).getTime() - parseISO(b.day.date).getTime());
  const pendingAPDaysList = apEntries
    .filter(({ absence }) => absence.requestStatus === 'pendent')
    .sort((a, b) => parseISO(a.day.date).getTime() - parseISO(b.day.date).getTime());
  const approvedAPDaysList = apEntries
    .filter(({ absence }) => absence.requestStatus === 'aprovat')
    .sort((a, b) => parseISO(a.day.date).getTime() - parseISO(b.day.date).getTime());
  const pendingFlexDaysList = flexEntries
    .filter(({ absence }) => absence.requestStatus === 'pendent')
    .sort((a, b) => parseISO(a.day.date).getTime() - parseISO(b.day.date).getTime());
  const approvedFlexDaysList = flexEntries
    .filter(({ absence }) => absence.requestStatus === 'aprovat')
    .sort((a, b) => parseISO(a.day.date).getTime() - parseISO(b.day.date).getTime());
  const formatVacationDate = (date: string) => {
    const parsed = parseISO(date);
    return `${format(parsed, 'd')} de ${MONTH_NAMES_CA[parsed.getMonth()]}`;
  };
  const formatAPHours = (hours: number | undefined) => formatDuration(hours || 0);
  const formatFlexHours = (hours: number | undefined) => formatDuration(hours || 0);
  const hasOtherNotes = config.otherNotes.trim().length > 0;
  const openOtherDialog = () => {
    setOtherNotesDraft(config.otherNotes || '');
    setOtherDialogOpen(true);
  };
  const handleOtherDialogOpenChange = (open: boolean) => {
    if (open) {
      openOtherDialog();
      return;
    }
    setOtherDialogOpen(false);
  };
  const handleSaveOtherNotes = () => {
    onConfigUpdate?.({
      ...config,
      otherNotes: otherNotesDraft.trimEnd(),
    });
    setOtherDialogOpen(false);
  };
  const summaryItems = [
    {
      key: 'vacances',
      label: 'Vacances',
      icon: Plane,
      iconClassName: 'text-[hsl(var(--status-vacation))]',
      value: vacationValue,
      unit: '',
      detail: `${config.usedVacationDays} aprovats de ${config.totalVacationDays} dies`
        + (pendingVacationDays > 0 ? ` · ${pendingVacationDays} per aprovar` : ''),
      progress: vacationProgress,
    },
    {
      key: 'ap',
      label: 'Assumptes Propis',
      icon: Clock,
      iconClassName: 'text-primary',
      value: apValue,
      unit: '',
      detail: `${formatDuration(approvedAPHours)} aprovades de ${formatDuration(config.totalAPHours)}`
        + (pendingAPHours > 0 ? ` · ${formatDuration(pendingAPHours)} per aprovar` : ''),
      progress: apProgress,
    },
    {
      key: 'fx',
      label: 'Flexibilitat Horària',
      icon: Sparkles,
      iconClassName: 'text-[hsl(var(--status-complete))]',
      value: flexValue,
      unit: '',
      detail: `${formatDuration(approvedFlexHours)} aprovades de ${formatDuration(config.flexibilityHours)}`
        + (pendingFlexHours > 0 ? ` · ${formatDuration(pendingFlexHours)} per aprovar` : ''),
      progress: flexProgress,
    },
  ];

  const vacationDialog = (
    <Dialog open={vacationDialogOpen} onOpenChange={setVacationDialogOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Vacances</DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Dies per aprovar</h3>
            {pendingVacationDaysList.length > 0 ? (
              <ul className="space-y-2">
                {pendingVacationDaysList.map(({ day }) => (
                  <li
                    key={day.date}
                    className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm"
                  >
                    <span>{formatVacationDate(day.date)}</span>
                    <span className="text-xs text-muted-foreground">Pendent</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No hi ha dies pendents d'aprovació.</p>
            )}
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Dies aprovats</h3>
            {approvedVacationDaysList.length > 0 ? (
              <ul className="space-y-2">
                {approvedVacationDaysList.map(({ day }) => (
                  <li
                    key={day.date}
                    className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm"
                  >
                    <span>{formatVacationDate(day.date)}</span>
                    <span className="text-xs text-muted-foreground">Aprovat</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Encara no hi ha dies aprovats.</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
  const apDialog = (
    <Dialog open={apDialogOpen} onOpenChange={setApDialogOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Assumptes propis</DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Hores i minuts per aprovar</h3>
            {pendingAPDaysList.length > 0 ? (
              <ul className="space-y-2">
                {pendingAPDaysList.map(({ day, absence }) => (
                  <li
                    key={day.date}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm"
                  >
                    <span>{formatVacationDate(day.date)} · {formatAPHours(absence.hours)}</span>
                    <span className="text-xs text-muted-foreground">Pendent</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No hi ha hores pendents d'aprovació.</p>
            )}
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Hores i minuts aprovats</h3>
            {approvedAPDaysList.length > 0 ? (
              <ul className="space-y-2">
                {approvedAPDaysList.map(({ day, absence }) => (
                  <li
                    key={day.date}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm"
                  >
                    <span>{formatVacationDate(day.date)} · {formatAPHours(absence.hours)}</span>
                    <span className="text-xs text-muted-foreground">Aprovat</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Encara no hi ha hores aprovades.</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
  const flexDialog = (
    <Dialog open={flexDialogOpen} onOpenChange={setFlexDialogOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Flexibilitat horària</DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
            Les diferències setmanals superiors a 30 minuts s’acumulen a la bossa de flexibilitat horària, amb un límit màxim de 25 hores.
          </p>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Hores i minuts per aprovar</h3>
            {pendingFlexDaysList.length > 0 ? (
              <ul className="space-y-2">
                {pendingFlexDaysList.map(({ day, absence }) => (
                  <li
                    key={day.date}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm"
                  >
                    <span>{formatVacationDate(day.date)} · {formatFlexHours(absence.hours)}</span>
                    <span className="text-xs text-muted-foreground">Pendent</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No hi ha hores pendents d'aprovació.</p>
            )}
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Hores i minuts aprovats</h3>
            {approvedFlexDaysList.length > 0 ? (
              <ul className="space-y-2">
                {approvedFlexDaysList.map(({ day, absence }) => (
                  <li
                    key={day.date}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm"
                  >
                    <span>{formatVacationDate(day.date)} · {formatFlexHours(absence.hours)}</span>
                    <span className="text-xs text-muted-foreground">Aprovat</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Encara no hi ha hores aprovades.</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
  const otherDialog = (
    <Dialog open={otherDialogOpen} onOpenChange={handleOtherDialogOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Altres</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Textarea
            value={otherNotesDraft}
            onChange={(event) => setOtherNotesDraft(event.target.value)}
            maxLength={1000}
            rows={10}
            className="placeholder:text-muted-foreground/50"
            placeholder="Anota aquí aspectes pendents de l'horari."
          />
          <p className="text-xs text-muted-foreground text-right">
            {otherNotesDraft.length}/1000
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOtherDialogOpen(false)}>
            Cancel·lar
          </Button>
          <Button onClick={handleSaveOtherNotes}>
            Desar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
  const otherCompactContent = (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-card/60 px-3 py-2 shadow-sm">
      <NotebookText className="w-4 h-4 text-orange-500" />
      <span className="text-sm font-medium text-foreground">Altres</span>
      {hasOtherNotes && (
        <span className="text-xs font-medium text-muted-foreground">(notes)</span>
      )}
    </div>
  );

  if (variant === 'compact') {
    return (
      <>
        {vacationDialog}
        {apDialog}
        {flexDialog}
        {otherDialog}
        <div className="flex flex-wrap items-center gap-3">
          {summaryItems.map((item) => {
            const Icon = item.icon;
            const content = (
              <div className="flex items-center gap-2 rounded-lg border border-border bg-card/60 px-3 py-2 shadow-sm">
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${item.iconClassName}`} />
                  <span className="text-sm font-medium text-foreground">{item.label}</span>
                </div>
                <div className="text-sm font-semibold text-foreground">
                  {item.value}
                  {item.unit && (
                    <span className="text-xs font-normal text-muted-foreground"> {item.unit}</span>
                  )}
                </div>
              </div>
            );
            if (item.key === 'vacances') {
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setVacationDialogOpen(true)}
                  className="text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {content}
                </button>
              );
            }
            if (item.key === 'ap') {
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setApDialogOpen(true)}
                  className="text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {content}
                </button>
              );
            }
            if (item.key === 'fx') {
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setFlexDialogOpen(true)}
                  className="text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {content}
                </button>
              );
            }
            return <div key={item.key}>{content}</div>;
          })}
          <button
            type="button"
            onClick={openOtherDialog}
            className="text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {otherCompactContent}
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      {vacationDialog}
      {apDialog}
      {flexDialog}
      {otherDialog}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {summaryItems.map((item) => {
          const Icon = item.icon;
          const content = (
            <Card>
              <CardHeader className="pb-2 space-y-1">
                <div className="flex items-center justify-between gap-4">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${item.iconClassName}`} />
                    {item.label}
                  </CardTitle>
                  <div className="text-base font-semibold">
                    {item.value}
                    {item.unit && (
                      <span className="text-sm font-normal text-muted-foreground"> {item.unit}</span>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{item.detail}</p>
              </CardHeader>
              <CardContent className="pt-0">
                <Progress value={item.progress} className="h-2" />
              </CardContent>
            </Card>
          );
          if (item.key === 'vacances') {
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setVacationDialogOpen(true)}
                className="text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {content}
              </button>
            );
          }
          if (item.key === 'ap') {
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setApDialogOpen(true)}
                className="text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {content}
              </button>
            );
          }
          if (item.key === 'fx') {
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setFlexDialogOpen(true)}
                className="text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {content}
              </button>
            );
          }
          return <div key={item.key}>{content}</div>;
        })}
        <button
          type="button"
          onClick={openOtherDialog}
          className="text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Card>
            <CardHeader className="pb-2 space-y-1">
              <div className="flex items-center justify-between gap-4">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <NotebookText className="w-4 h-4 text-orange-500" />
                  Altres
                </CardTitle>
                <div className="text-base font-semibold">
                  {hasOtherNotes ? '(notes)' : 'Sense notes'}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Anotacions lliures de l'horari
              </p>
            </CardHeader>
          </Card>
        </button>
      </div>
    </>
  );
}
