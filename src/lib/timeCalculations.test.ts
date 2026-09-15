import { describe, expect, it } from 'vitest';
import { calculateWeeklySummary } from './timeCalculations';
import { DEFAULT_USER_CONFIG } from './constants';

describe('manual weekly summaries', () => {
  it('takes precedence over daily calculations', () => {
    const weekStart = new Date(2026, 7, 31);
    const config = {
      ...DEFAULT_USER_CONFIG,
      manualWeeklySummaries: {
        '2026-08-31': {
          weekStart: '2026-08-31',
          theoreticalHours: 35,
          workedHours: 35.85,
          notes: 'Resum oficial',
        },
      },
    };

    const result = calculateWeeklySummary(weekStart, {}, config);
    expect(result.theoreticalHours).toBe(35);
    expect(result.workedHours).toBe(35.85);
    expect(result.difference).toBe(0.85);
  });
});
