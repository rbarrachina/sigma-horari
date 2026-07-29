import { describe, expect, it } from 'vitest';
import { isAnnualBackupReminderDue } from './backupReminder';

describe('isAnnualBackupReminderDue', () => {
  it('does not show before July', () => {
    expect(isAnnualBackupReminderDue(new Date(2026, 5, 30, 23, 59), null)).toBe(false);
  });

  it('shows from July 1 when it has not been shown that year', () => {
    expect(isAnnualBackupReminderDue(new Date(2026, 6, 1), null)).toBe(true);
    expect(isAnnualBackupReminderDue(new Date(2026, 7, 20), 2025)).toBe(true);
  });

  it('does not show again in the same year', () => {
    expect(isAnnualBackupReminderDue(new Date(2026, 11, 31), 2026)).toBe(false);
  });
});
