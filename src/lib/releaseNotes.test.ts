import { describe, expect, it } from 'vitest';
import { APP_INFO, RELEASE_NOTES } from './constants';
import { shouldShowReleaseNotes } from './releaseNotes';

describe('release notes 1.8', () => {
  it('includes the documented changes for the current version', () => {
    expect(APP_INFO.version).toBe('1.8');
    expect(RELEASE_NOTES['1.8']).toHaveLength(5);
  });

  it('shows the popup once to an existing user upgrading from 1.7', () => {
    expect(shouldShowReleaseNotes('1.7', '1.8', false)).toBe(true);
    expect(shouldShowReleaseNotes('1.8', '1.8', false)).toBe(false);
  });

  it('does not interrupt the initial configuration of a new user', () => {
    expect(shouldShowReleaseNotes(null, '1.8', true)).toBe(false);
  });
});
