import { useEffect, useState } from 'react';
import { Header } from '@/components/Header';
import { CalendarGrid } from '@/components/Calendar/CalendarGrid';
import { SettingsDialog, type SettingsTab } from '@/components/Settings/SettingsDialog';
import { ChartsDialog } from '@/components/ChartsDialog';
import { useTimeTracking } from '@/hooks/useTimeTracking';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { APP_INFO, RELEASE_NOTES } from '@/lib/constants';
import {
  getLastBackupReminderYear,
  getLastSeenVersion,
  getOnboardingStep,
  hasStoredUserConfig,
  saveBackupReminderShown,
  saveLastSeenVersion,
  saveOnboardingStep,
} from '@/lib/storage';
import { isAnnualBackupReminderDue } from '@/lib/backupReminder';
import { Download } from 'lucide-react';

const Index = () => {
  const { config, daysData, isLoading, updateConfig, updateDayData } = useTimeTracking();
  const [chartsOpen, setChartsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [showReleaseNotes, setShowReleaseNotes] = useState(false);
  const [showBackupReminder, setShowBackupReminder] = useState(false);
  const [pendingBackupReminderYear, setPendingBackupReminderYear] = useState<number | null>(null);
  const [startupChecked, setStartupChecked] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<SettingsTab>('personal');
  const isOnboarding = onboardingStep > 0;

  useEffect(() => {
    if (isLoading) return;
    const storedStep = getOnboardingStep();
    let nextStep = storedStep;
    if (!hasStoredUserConfig() && storedStep === 0) {
      nextStep = 1;
      saveOnboardingStep(nextStep);
    }
    setOnboardingStep(nextStep);
    if (nextStep > 0) {
      setSettingsOpen(true);
    }

    const lastSeenVersion = getLastSeenVersion();
    if (lastSeenVersion !== APP_INFO.version) {
      setShowReleaseNotes(true);
    }
    const now = new Date();
    if (isAnnualBackupReminderDue(now, getLastBackupReminderYear())) {
      setPendingBackupReminderYear(now.getFullYear());
    }
    setStartupChecked(true);
  }, [isLoading]);

  useEffect(() => {
    if (onboardingStep > 0) {
      setSettingsOpen(true);
    }
  }, [onboardingStep]);

  useEffect(() => {
    if (
      !startupChecked
      || pendingBackupReminderYear === null
      || onboardingStep > 0
      || settingsOpen
      || showReleaseNotes
      || showBackupReminder
    ) {
      return;
    }

    saveBackupReminderShown(pendingBackupReminderYear);
    setPendingBackupReminderYear(null);
    setShowBackupReminder(true);
  }, [
    onboardingStep,
    pendingBackupReminderYear,
    settingsOpen,
    showBackupReminder,
    showReleaseNotes,
    startupChecked,
  ]);

  const handleOnboardingStepChange = (step: number) => {
    setOnboardingStep(step);
    saveOnboardingStep(step);
    if (step === 0) {
      setSettingsOpen(false);
    }
  };

  const handleCloseSettings = () => {
    if (isOnboarding) {
      return;
    }
    setSettingsOpen(false);
  };

  const handleCloseReleaseNotes = () => {
    setShowReleaseNotes(false);
    saveLastSeenVersion(APP_INFO.version);
  };

  const handleOpenBackupSettings = () => {
    setShowBackupReminder(false);
    setSettingsInitialTab('data');
    setSettingsOpen(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-6 space-y-6">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-[500px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header
        config={config}
        daysData={daysData}
        onConfigUpdate={updateConfig}
        onOpenCharts={() => setChartsOpen(true)}
        onOpenSettings={() => {
          setSettingsInitialTab('personal');
          setSettingsOpen(true);
        }}
      />
      
      <main className="container mx-auto px-4 py-6 space-y-6">
        {isOnboarding ? (
          <div className="rounded-lg border border-dashed border-muted-foreground/40 bg-muted/30 p-8 text-center text-muted-foreground">
            <h2 className="text-lg font-semibold text-foreground">Completa la configuració inicial</h2>
            <p className="mt-2 text-sm">
              Revisa i desa les pestanyes Personal, Horari i Festius per començar a fer servir el calendari.
            </p>
          </div>
        ) : (
          <CalendarGrid
            daysData={daysData}
            config={config}
            onDayUpdate={updateDayData}
          />
        )}
        
      </main>

      <Dialog open={showReleaseNotes} onOpenChange={(open) => (!open ? handleCloseReleaseNotes() : null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Versió {APP_INFO.version}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Millores:</p>
            <ul className="list-disc pl-5 space-y-1">
              {(RELEASE_NOTES[APP_INFO.version] || []).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <DialogFooter>
            <Button onClick={handleCloseReleaseNotes}>Tancar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showBackupReminder}
        onOpenChange={(open) => (!open ? setShowBackupReminder(false) : null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Fes una còpia abans de vacances</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              Et recomanem descarregar una còpia de seguretat de les dades abans de marxar
              de vacances.
            </p>
            <p>
              Obtindràs un fitxer JSON que podràs tornar a importar des de la pestanya
              Dades si mai el necessites.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBackupReminder(false)}>
              Ara no
            </Button>
            <Button onClick={handleOpenBackupSettings}>
              <Download className="mr-2 h-4 w-4" />
              Fer còpia de seguretat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SettingsDialog
        open={settingsOpen}
        config={config}
        onClose={handleCloseSettings}
        onSave={updateConfig}
        onboardingStep={onboardingStep}
        onOnboardingStepChange={handleOnboardingStepChange}
        initialTab={settingsInitialTab}
      />

      <ChartsDialog
        open={chartsOpen}
        config={config}
        daysData={daysData}
        onClose={() => setChartsOpen(false)}
      />
    </div>
  );
};

export default Index;
