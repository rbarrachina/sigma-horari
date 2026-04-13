// Barcelona public holidays 2026
export const BARCELONA_HOLIDAYS_2026 = [
  '2026-01-01', // Cap d'Any
  '2026-01-06', // Reis
  '2026-04-03', // Divendres Sant
  '2026-04-06', // Dilluns de Pasqua
  '2026-05-01', // Festa del Treball
  '2026-06-24', // Sant Joan
  '2026-08-15', // L'Assumpció
  '2026-09-11', // Diada de Catalunya
  '2026-09-24', // La Mercè
  '2026-10-12', // Festa Nacional d'Espanya
  '2026-11-01', // Tots Sants
  '2026-12-08', // La Immaculada
  '2026-12-25', // Nadal
  '2026-12-26', // Sant Esteve
];

export const DEFAULT_CALENDAR_YEAR = 2026;

export const DEFAULT_USER_CONFIG = {
  calendarYear: DEFAULT_CALENDAR_YEAR,
  firstName: '',
  defaultStartTime: '07:30',
  defaultEndTime: '15:00',
  weeklyConfig: {
    monday: { dayType: 'presencial' as const },
    tuesday: { dayType: 'presencial' as const },
    wednesday: { dayType: 'presencial' as const },
    thursday: { dayType: 'teletreball' as const },
    friday: { dayType: 'teletreball' as const },
  },
  schedulePeriods: [
    {
      id: 'default-1',
      startDate: `${DEFAULT_CALENDAR_YEAR}-01-01`,
      endDate: `${DEFAULT_CALENDAR_YEAR}-01-10`,
      scheduleType: 'estiu' as const,
    },
    {
      id: 'default-2',
      startDate: `${DEFAULT_CALENDAR_YEAR}-01-11`,
      endDate: `${DEFAULT_CALENDAR_YEAR}-03-29`,
      scheduleType: 'hivern' as const,
    },
    {
      id: 'default-3',
      startDate: `${DEFAULT_CALENDAR_YEAR}-03-30`,
      endDate: `${DEFAULT_CALENDAR_YEAR}-04-06`,
      scheduleType: 'estiu' as const,
    },
    {
      id: 'default-4',
      startDate: `${DEFAULT_CALENDAR_YEAR}-04-07`,
      endDate: `${DEFAULT_CALENDAR_YEAR}-05-31`,
      scheduleType: 'hivern' as const,
    },
    {
      id: 'default-5',
      startDate: `${DEFAULT_CALENDAR_YEAR}-06-01`,
      endDate: `${DEFAULT_CALENDAR_YEAR}-09-30`,
      scheduleType: 'estiu' as const,
    },
    {
      id: 'default-6',
      startDate: `${DEFAULT_CALENDAR_YEAR}-10-01`,
      endDate: `${DEFAULT_CALENDAR_YEAR}-12-14`,
      scheduleType: 'hivern' as const,
    },
    {
      id: 'default-7',
      startDate: `${DEFAULT_CALENDAR_YEAR}-12-15`,
      endDate: `${DEFAULT_CALENDAR_YEAR}-12-31`,
      scheduleType: 'estiu' as const,
    },
  ],
  totalVacationDays: 25,
  usedVacationDays: 0,
  totalAPHours: 90,
  usedAPHours: 0,
  flexibilityHours: 0,
  usedFlexHours: 0,
  holidays: BARCELONA_HOLIDAYS_2026,
};

export const SCHEDULE_HOURS = {
  hivern: 7.5,
  estiu: 7,
};

export const DAYS_OF_WEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const;

export const DAY_NAMES_CA: Record<string, string> = {
  monday: 'Dilluns',
  tuesday: 'Dimarts',
  wednesday: 'Dimecres',
  thursday: 'Dijous',
  friday: 'Divendres',
  saturday: 'Dissabte',
  sunday: 'Diumenge',
};

export const MONTH_NAMES_CA = [
  'Gener', 'Febrer', 'Març', 'Abril', 'Maig', 'Juny',
  'Juliol', 'Agost', 'Setembre', 'Octubre', 'Novembre', 'Desembre'
];

export const MAX_FLEXIBILITY_HOURS = 25;
export const MIN_WEEKLY_SURPLUS_FOR_FLEXIBILITY = 0.5; // 30 minutes
export const MAX_DAILY_WORK_HOURS = 9.5;

export const APP_INFO = {
  name: 'Σ Horari',
  author: 'Rafa Barrachina',
  license: 'Apache License 2.0',
  year: 2026,
  version: '1.4',
};

const parseReleaseNotes = (raw: string): Record<string, string[]> => {
  const notes: Record<string, string[]> = {};
  const lines = raw.split(/\r?\n/);
  let currentVersion: string | null = null;

  for (const line of lines) {
    const headerMatch = line.match(/^Changes v(.+)$/i);
    if (headerMatch) {
      currentVersion = headerMatch[1].trim();
      notes[currentVersion] = [];
      continue;
    }
    if (!currentVersion) continue;
    const trimmed = line.trim();
    if (trimmed.startsWith('- ')) {
      notes[currentVersion].push(trimmed.slice(2).trim());
    }
  }

  return notes;
};

export const RELEASE_NOTES: Record<string, string[]> = parseReleaseNotes(changesText);
import changesText from '../../changes.txt?raw';
