import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { DayData, UserConfig } from '@/types';
import { createAnnualArchive, createNextYearConfig, prepareDaysForNewYear } from '@/lib/annualRollover';
import { exportAllData } from '@/lib/storage';

interface Props {
  open: boolean;
  config: UserConfig;
  daysData: Record<string, DayData>;
  today: Date;
  onCancel: () => void;
  onComplete: (config: UserConfig, daysData: Record<string, DayData>) => void;
}

const duration = (hours: number) => `${Math.floor(hours)} h${Math.round((hours % 1) * 60) ? ` ${Math.round((hours % 1) * 60)} min` : ''}`;

export function AnnualRolloverDialog({ open, config, daysData, today, onCancel, onComplete }: Props) {
  const [backupDone, setBackupDone] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [vacationDays, setVacationDays] = useState(config.totalVacationDays);
  const initialAPMinutes = Math.round(config.totalAPHours * 60);
  const [apHours, setApHours] = useState(Math.floor(initialAPMinutes / 60));
  const [apMinutes, setApMinutes] = useState(initialAPMinutes % 60);
  const archive = createAnnualArchive(config, today, daysData);
  const targetYear = today.getFullYear();

  useEffect(() => {
    if (!open) return;
    setBackupDone(false);
    setStep(1);
    setVacationDays(config.totalVacationDays);
    const totalMinutes = Math.round(config.totalAPHours * 60);
    setApHours(Math.floor(totalMinutes / 60));
    setApMinutes(totalMinutes % 60);
  }, [open, config]);

  const downloadBackup = () => {
    const blob = new Blob([JSON.stringify(exportAllData(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `control-horari-${format(today, 'yyyy-MM-dd')}-abans-canvi-any.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    setBackupDone(true);
  };

  const complete = () => {
    const nextConfig = createNextYearConfig(config, targetYear, {
      totalVacationDays: vacationDays,
      totalAPHours: apHours + apMinutes / 60,
    }, today, daysData);
    onComplete(nextConfig, prepareDaysForNewYear(daysData, config.calendarYear, targetYear));
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onCancel(); }}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{step === 1 ? `Tancar l’any ${config.calendarYear}` : `Preparar l’any ${targetYear}`}</DialogTitle>
        </DialogHeader>
        {step === 1 ? (
          <div className="space-y-5">
            <p className="text-sm text-muted-foreground">Abans de continuar, descarrega obligatòriament una còpia de les dades actuals.</p>
            <Button className="w-full" variant={backupDone ? 'outline' : 'default'} onClick={downloadBackup}>
              <Download className="mr-2 h-4 w-4" />
              {backupDone ? 'Tornar a descarregar la còpia' : 'Descarregar còpia de seguretat'}
            </Button>
            <div className="space-y-3 rounded-lg border p-4 text-sm">
              <p><strong>Vacances:</strong> {archive.usedVacationDays} dies utilitzats de {archive.totalVacationDays} dies. No es traspassen.</p>
              <p><strong>AP:</strong> {duration(archive.usedAPHours)} gastades de {duration(archive.totalAPHours)}. Es traspassen {duration(archive.transferredAPHours)}.</p>
              <p><strong>FX:</strong> {duration(archive.usedFlexHours)} gastades de {duration(archive.totalFlexHours)}. Es traspassen {duration(archive.transferredFlexHours)}.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Introdueix la informació sol·licitada per a l’any {targetYear}.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Nom</Label><Input value={config.firstName} disabled /></div>
              <div><Label>Any</Label><Input value={targetYear} disabled /></div>
              <div className="space-y-2">
                <Label>Dies de vacances totals</Label>
                <div className="flex items-center gap-2">
                  <Input aria-label="Dies de vacances" className="w-16 px-2 text-center" type="number" min={0} max={99} value={vacationDays} onChange={e => setVacationDays(Math.min(99, Math.max(0, Math.floor(Number(e.target.value) || 0))))} />
                  <span className="text-sm text-muted-foreground">dies</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Hores d’AP totals</Label>
                <div className="flex items-center gap-2">
                  <Input aria-label="Hores d’AP" className="w-16 px-2 text-center" type="number" min={0} max={99} step={1} value={apHours} onChange={e => setApHours(Math.min(99, Math.max(0, Math.floor(Number(e.target.value) || 0))))} />
                  <span className="text-sm text-muted-foreground">hores</span>
                  <Input aria-label="Minuts d’AP" className="w-16 px-2 text-center" type="number" min={0} max={59} step={1} value={apMinutes} onChange={e => setApMinutes(Math.min(59, Math.max(0, Math.floor(Number(e.target.value) || 0))))} />
                  <span className="text-sm text-muted-foreground">min</span>
                </div>
              </div>
            </div>
          </div>
        )}
        <DialogFooter>
          {step === 1 ? (
            <>
              <Button variant="outline" onClick={onCancel}>Ara no</Button>
              <Button onClick={() => setStep(2)} disabled={!backupDone}>Continuar</Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep(1)}>Enrere</Button>
              <Button onClick={complete}>Confirmar el canvi d’any</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
