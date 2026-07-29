export function isAnnualBackupReminderDue(
  now: Date,
  lastShownYear: number | null
): boolean {
  const currentYear = now.getFullYear();
  const reminderStart = new Date(currentYear, 6, 1);
  return now >= reminderStart && lastShownYear !== currentYear;
}
