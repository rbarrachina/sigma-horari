import { Button } from '@/components/ui/button';
import { Legend } from '@/components/Legend';
import { StatusSummary } from '@/components/Summary/StatusSummary';
import { BarChart3, Settings } from 'lucide-react';
import controlHorariLogo from '@/assets/control-horari-logo.svg';
import type { DayData, UserConfig } from '@/types';

interface HeaderProps {
  config: UserConfig;
  daysData: Record<string, DayData>;
  onOpenCharts: () => void;
  onOpenSettings: () => void;
}

export function Header({ config, daysData, onOpenCharts, onOpenSettings }: HeaderProps) {
  const userName = config.firstName 
    ? config.firstName
    : 'Usuari';

  return (
    <header className="bg-card border-b border-border sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-6">
            <div className="flex items-center gap-4">
              <img
                src={controlHorariLogo}
                alt="Control horari"
                className="h-12 w-auto"
              />
              <div>
                <p className="text-sm text-muted-foreground text-right leading-tight">
                  <span className="block">{userName}</span>
                  <span className="block">{config.calendarYear}</span>
                </p>
              </div>
            </div>
            <StatusSummary config={config} daysData={daysData} variant="compact" />
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={onOpenCharts}
              aria-label="Gràfics"
            >
              <BarChart3 className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={onOpenSettings}
              aria-label="Configuració"
            >
              <Settings className="w-4 h-4" />
            </Button>
            <Legend />
          </div>
        </div>
      </div>
    </header>
  );
}
