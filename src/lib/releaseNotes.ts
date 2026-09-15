export function shouldShowReleaseNotes(
  lastSeenVersion: string | null,
  currentVersion: string,
  initialSetup: boolean,
): boolean {
  return !initialSetup && lastSeenVersion !== currentVersion;
}
