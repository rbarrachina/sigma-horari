import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from 'recharts';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { MONTH_NAMES_CA } from '@/lib/constants';
import { calculateTotalWorkedHours, formatHoursMinutes, getDayTypeForDate, getTheoreticalHoursForDate, isHoliday, isWeekend, normalizeHoursDifference } from '@/lib/timeCalculations';
import type { DayData, UserConfig } from '@/types';
import { eachDayOfInterval, format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ChartsDialogProps {
  open: boolean;
  config: UserConfig;
  daysData: Record<string, DayData>;
  onClose: () => void;
}

const monthlyChartConfig = {
  worked: {
    label: 'Treballades',
    color: 'hsl(var(--status-complete))',
  },
  theoretical: {
    label: 'Teòriques',
    color: 'hsl(var(--status-deficit))',
  },
} satisfies ChartConfig;

const presenceHistogramConfig = {
  entries: {
    label: 'Entrades',
    color: 'hsl(var(--status-complete))',
  },
  exits: {
    label: 'Sortides',
    color: 'hsl(var(--status-deficit))',
  },
} satisfies ChartConfig;

const distributionChartConfig = {
  presencial: { label: 'Presencial', color: 'hsl(var(--status-complete))' },
  teletreball: { label: 'Teletreball', color: 'hsl(var(--status-deficit))' },
  vacances: { label: 'Vacances', color: '#2563eb' },
  assumpte_propi: { label: 'Assumptes propis', color: '#8b5cf6' },
  flexibilitat: { label: 'Flexibilitat', color: '#0ea5e9' },
  altres: { label: 'Altres', color: '#f43f5e' },
} satisfies ChartConfig;

const SLOT_MINUTES = 5;
const TOTAL_SLOTS = (24 * 60) / SLOT_MINUTES;
const HISTOGRAM_START_SLOT = (7 * 60) / SLOT_MINUTES; // 07:00
const HISTOGRAM_END_SLOT = (19 * 60 + 30) / SLOT_MINUTES; // 19:30

type MonthlyBalanceItem = {
  month: string;
  worked: number;
  theoretical: number;
  difference: number;
  isFutureMonth: boolean;
};

const TOOLTIP_LABELS: Record<'worked' | 'theoretical', string> = {
  worked: 'Treballades',
  theoretical: 'Teòriques',
};

const PRESENCE_TOOLTIP_LABELS: Record<'entries' | 'exits', string> = {
  entries: 'Entrades',
  exits: 'Sortides',
};

const timeToSlotIndex = (time: string): number | null => {
  const [hoursStr, minutesStr] = time.split(':');
  const hours = Number(hoursStr);
  const minutes = Number(minutesStr);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null;
  }
  const totalMinutes = hours * 60 + minutes;
  if (totalMinutes < 0 || totalMinutes >= 24 * 60) {
    return null;
  }
  return Math.floor(totalMinutes / SLOT_MINUTES);
};

const slotIndexToTime = (slotIndex: number): string => {
  const totalMinutes = slotIndex * SLOT_MINUTES;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

const buildIntervalLabel = (slotIndex: number): string => {
  const startMinutes = slotIndex * SLOT_MINUTES;
  const endMinutes = startMinutes + SLOT_MINUTES - 1;
  const startHours = Math.floor(startMinutes / 60);
  const startMins = startMinutes % 60;
  const endHours = Math.floor(endMinutes / 60);
  const endMins = endMinutes % 60;
  const start = `${startHours.toString().padStart(2, '0')}:${startMins.toString().padStart(2, '0')}`;
  const end = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
  return `${start} - ${end}`;
};

type DistributionItem = {
  key: keyof typeof distributionChartConfig;
  label: string;
  value: number;
  fill: string;
};

export function ChartsDialog({ open, config, daysData, onClose }: ChartsDialogProps) {
  const monthlyBalance = useMemo<MonthlyBalanceItem[]>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return MONTH_NAMES_CA.map((month, monthIndex) => {
      const monthStart = new Date(config.calendarYear, monthIndex, 1);
      if (monthStart > today) {
        return {
          month,
          worked: 0,
          theoretical: 0,
          difference: 0,
          isFutureMonth: true,
        };
      }

      const daysInMonth = new Date(config.calendarYear, monthIndex + 1, 0).getDate();
      const isCurrentMonth =
        config.calendarYear === today.getFullYear() && monthIndex === today.getMonth();
      const maxDay = isCurrentMonth ? today.getDate() : daysInMonth;
      let worked = 0;
      let theoretical = 0;

      for (let day = 1; day <= maxDay; day++) {
        const currentDate = new Date(config.calendarYear, monthIndex, day);
        const dateKey = format(currentDate, 'yyyy-MM-dd');
        const dayData = daysData[dateKey];

        if (isWeekend(currentDate) || isHoliday(currentDate, config.holidays)) {
          continue;
        }

        if (dayData?.dayStatus === 'vacances') {
          continue;
        }

        theoretical += getTheoreticalHoursForDate(currentDate, config);
        worked += calculateTotalWorkedHours(dayData);
      }

      return {
        month,
        worked,
        theoretical,
        difference: normalizeHoursDifference(worked - theoretical),
        isFutureMonth: false,
      };
    });
  }, [config, daysData]);

  const presenceHistogram = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const slots = Array.from({ length: TOTAL_SLOTS }, (_, slotIndex) => ({
      slotIndex,
      entries: 0,
      exits: 0,
    }));

    let presencialDays = 0;

    Object.values(daysData).forEach((dayData) => {
      const dayDate = new Date(`${dayData.date}T00:00:00`);
      dayDate.setHours(0, 0, 0, 0);

      if (dayDate.getFullYear() !== config.calendarYear || dayDate > today) {
        return;
      }
      if (dayData.dayType !== 'presencial') {
        return;
      }

      const hasAnyTime = dayData.startTime || dayData.endTime || dayData.startTime2 || dayData.endTime2;
      if (!hasAnyTime) {
        return;
      }

      presencialDays += 1;

      const entrySlot1 = dayData.startTime ? timeToSlotIndex(dayData.startTime) : null;
      const entrySlot2 = dayData.startTime2 ? timeToSlotIndex(dayData.startTime2) : null;
      const exitSlot1 = dayData.endTime ? timeToSlotIndex(dayData.endTime) : null;
      const exitSlot2 = dayData.endTime2 ? timeToSlotIndex(dayData.endTime2) : null;

      if (entrySlot1 !== null) slots[entrySlot1].entries += 1;
      if (entrySlot2 !== null) slots[entrySlot2].entries += 1;
      if (exitSlot1 !== null) slots[exitSlot1].exits += 1;
      if (exitSlot2 !== null) slots[exitSlot2].exits += 1;
    });

    const hasData = slots.some((slot) => slot.entries > 0 || slot.exits > 0);

    return {
      data: slots.slice(HISTOGRAM_START_SLOT, HISTOGRAM_END_SLOT + 1).map((slot) => ({
        time: slotIndexToTime(slot.slotIndex),
        intervalLabel: buildIntervalLabel(slot.slotIndex),
        entries: slot.entries,
        exits: slot.exits,
      })),
      presencialDays,
      hasData,
    };
  }, [config.calendarYear, daysData]);

  const dayTypeDistribution = useMemo<DistributionItem[]>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(config.calendarYear, 0, 1);
    const end = new Date(config.calendarYear, 11, 31);
    const intervalEnd = end > today ? today : end;
    if (intervalEnd < start) {
      return [];
    }

    const counters: Record<keyof typeof distributionChartConfig, number> = {
      presencial: 0,
      teletreball: 0,
      vacances: 0,
      assumpte_propi: 0,
      flexibilitat: 0,
      altres: 0,
    };

    for (const day of eachDayOfInterval({ start, end: intervalEnd })) {
      if (isWeekend(day) || isHoliday(day, config.holidays)) {
        continue;
      }

      const dateKey = format(day, 'yyyy-MM-dd');
      const dayData = daysData[dateKey];

      if (dayData?.dayStatus === 'vacances') {
        counters.vacances += 1;
        continue;
      }
      if (dayData?.dayStatus === 'assumpte_propi') {
        counters.assumpte_propi += 1;
        continue;
      }
      if (dayData?.dayStatus === 'flexibilitat') {
        counters.flexibilitat += 1;
        continue;
      }
      if (dayData?.dayStatus === 'altres') {
        counters.altres += 1;
        continue;
      }

      const resolvedDayType = dayData?.dayType ?? getDayTypeForDate(day, config);
      counters[resolvedDayType] += 1;
    }

    return (Object.keys(distributionChartConfig) as Array<keyof typeof distributionChartConfig>)
      .map((key) => ({
        key,
        label: distributionChartConfig[key].label as string,
        value: counters[key],
        fill: distributionChartConfig[key].color as string,
      }))
      .filter((item) => item.value > 0);
  }, [config, daysData]);

  const distributionTotal = dayTypeDistribution.reduce((acc, item) => acc + item.value, 0);

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (!nextOpen ? onClose() : null)}>
      <DialogContent className="top-10 translate-y-0 sm:top-16 sm:max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Gràfics</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="monthly-balance" className="space-y-4">
          <TabsList className="grid h-auto w-full grid-cols-1 gap-2 sm:grid-cols-3">
            <TabsTrigger value="monthly-balance">Balanç mensual</TabsTrigger>
            <TabsTrigger value="weekly-evolution">Horari presencial</TabsTrigger>
            <TabsTrigger value="distribution">Distribució de jornades</TabsTrigger>
          </TabsList>

          <TabsContent value="monthly-balance" className="space-y-4">
            <h3 className="text-center text-sm font-medium text-muted-foreground">Treballades vs teòriques per mes</h3>
            <ChartContainer config={monthlyChartConfig} className="h-[320px] w-full aspect-auto">
              <BarChart data={monthlyBalance} margin={{ left: 8, right: 8, top: 4 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  interval={0}
                  tickMargin={10}
                  tickFormatter={(value: string) => value.slice(0, 3)}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  width={48}
                  tickFormatter={(value: number) => `${value}h`}
                />
                <ChartTooltip
                  cursor={false}
                  content={(
                    <ChartTooltipContent
                      formatter={(value, name) => (
                        <>
                          <span>{TOOLTIP_LABELS[name as 'worked' | 'theoretical'] ?? name}</span>
                          <span className="font-medium text-foreground">{formatHoursMinutes(Number(value))}</span>
                        </>
                      )}
                    />
                  )}
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="worked" fill="var(--color-worked)" radius={4} />
                <Bar dataKey="theoretical" fill="var(--color-theoretical)" radius={4} />
              </BarChart>
            </ChartContainer>

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {monthlyBalance.map((item) => {
                const isPositive = item.difference >= 0;
                return (
                  <div key={item.month} className="rounded-md border bg-card p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium">{item.month}</p>
                      {!item.isFutureMonth && (
                        <Badge variant={isPositive ? 'default' : 'destructive'}>
                          {isPositive ? '+' : '-'}{formatHoursMinutes(Math.abs(item.difference))}
                        </Badge>
                      )}
                    </div>
                    {!item.isFutureMonth && (
                      <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                        <p>Treballades {formatHoursMinutes(item.worked)}</p>
                        <p>Teòriques {formatHoursMinutes(item.theoretical)}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="weekly-evolution">
            <section className="space-y-4">
              <h3 className="text-center text-sm font-medium text-muted-foreground">
                Histograma (intervals de 5 minuts) de dies presencials
              </h3>
              {presenceHistogram.hasData ? (
                <>
                  <ChartContainer config={presenceHistogramConfig} className="h-[320px] w-full aspect-auto">
                    <BarChart data={presenceHistogram.data} margin={{ left: 8, right: 8, top: 4 }}>
                      <CartesianGrid vertical={false} />
                      <XAxis
                        dataKey="time"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={10}
                        interval="preserveStartEnd"
                        minTickGap={24}
                      />
                      <YAxis
                        allowDecimals={false}
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        width={44}
                      />
                      <ChartTooltip
                        cursor={false}
                        content={(
                          <ChartTooltipContent
                            labelFormatter={(_, payload) => payload?.[0]?.payload?.intervalLabel ?? ''}
                            formatter={(value, name) => (
                              <>
                                <span>{PRESENCE_TOOLTIP_LABELS[name as 'entries' | 'exits'] ?? name}</span>
                                <span className="font-medium text-foreground">{Number(value)} dies</span>
                              </>
                            )}
                          />
                        )}
                      />
                      <ChartLegend content={<ChartLegendContent />} />
                      <Bar dataKey="entries" fill="var(--color-entries)" radius={4} barSize={14} />
                      <Bar dataKey="exits" fill="var(--color-exits)" radius={4} barSize={14} />
                    </BarChart>
                  </ChartContainer>

                  <p className="text-xs text-muted-foreground">
                    Basat en {presenceHistogram.presencialDays} dies presencials amb hores registrades.
                  </p>
                </>
              ) : (
                <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
                  No hi ha dades suficients de dies presencials per mostrar l’histograma.
                </div>
              )}
            </section>
          </TabsContent>

          <TabsContent value="distribution">
            <section className="space-y-4">
              <h3 className="text-center text-sm font-medium text-muted-foreground">Distribució de jornades</h3>
              {dayTypeDistribution.length > 0 ? (
                <div className="grid gap-4 lg:grid-cols-[minmax(0,360px)_1fr]">
                  <ChartContainer config={distributionChartConfig} className="h-[320px] w-full aspect-auto">
                    <PieChart>
                      <ChartTooltip
                        cursor={false}
                        content={(
                          <ChartTooltipContent
                            formatter={(value, name) => (
                              <>
                                <span>{name}</span>
                                <span className="font-medium text-foreground">{Number(value)} dies</span>
                              </>
                            )}
                          />
                        )}
                      />
                      <Pie
                        data={dayTypeDistribution}
                        dataKey="value"
                        nameKey="label"
                        innerRadius={70}
                        outerRadius={110}
                        strokeWidth={2}
                      >
                        {dayTypeDistribution.map((entry) => (
                          <Cell key={entry.key} fill={entry.fill} />
                        ))}
                      </Pie>
                      <ChartLegend content={<ChartLegendContent nameKey="key" className="flex-wrap" />} />
                    </PieChart>
                  </ChartContainer>

                  <div className="grid gap-2 sm:grid-cols-2">
                    {dayTypeDistribution.map((item) => (
                      <div key={item.key} className="rounded-md border bg-card p-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-medium">{item.label}</p>
                          <Badge
                            className="border-transparent text-white"
                            style={{ backgroundColor: item.fill }}
                          >
                            {item.value} dies
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {distributionTotal > 0 ? Math.round((item.value / distributionTotal) * 100) : 0}% del total
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
                  No hi ha dades disponibles per calcular la distribució.
                </div>
              )}
            </section>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
