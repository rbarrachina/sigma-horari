const DEV_DATE_PARAM = 'data-prova';

export function getAppDate(): Date {
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    const value = new URLSearchParams(window.location.search).get(DEV_DATE_PARAM);
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year, month, day] = value.split('-').map(Number);
      const parsed = new Date(year, month - 1, day);
      if (
        parsed.getFullYear() === year
        && parsed.getMonth() === month - 1
        && parsed.getDate() === day
      ) return parsed;
    }
  }
  return new Date();
}

export function getSimulatedDate(): string | null {
  if (!import.meta.env.DEV || typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get(DEV_DATE_PARAM);
}
