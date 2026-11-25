import { describe, expect, it } from 'vitest';
import { HINTS_UNTIL_PICKS, showCommandHints } from './command-hints.ts';

describe('the hints of the empty command bar', () => {
  it('show for a user with few picks in this workspace', () => {
    expect(showCommandHints(0, false)).toBe(true);
    expect(showCommandHints(HINTS_UNTIL_PICKS - 1, false)).toBe(true);
  });

  it('stop once the user picked a few results', () => {
    expect(showCommandHints(HINTS_UNTIL_PICKS, false)).toBe(false);
  });

  it('never show while the user searches', () => {
    expect(showCommandHints(0, true)).toBe(false);
  });
});
