// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

/**
 * Reads every catalog of scylla-base as bytes: the `.po` sources and the compiled `messages.ts`.
 * A tool that writes in Latin-1 leaves a raw byte (0xA0 for a no-break space) that is not valid
 * UTF-8. The browser then shows U+FFFD in place of it. A catalog must be valid UTF-8 and have no
 * U+FFFD.
 */

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const FATAL = new TextDecoder('utf-8', { fatal: true });

const catalogs = readdirSync(SRC, { recursive: true, encoding: 'utf8' })
  .map(path => path.replaceAll('\\', '/'))
  .filter(path => /\/locales\/[^/]+\/messages\.(po|ts)$/.test(path));

describe('the catalogs of scylla-base', () => {
  it('finds the catalogs', () => {
    expect(catalogs.some(path => path.endsWith('.po'))).toBe(true);
    expect(catalogs.some(path => path.endsWith('.ts'))).toBe(true);
  });

  it.each(catalogs)('%s is valid UTF-8 with no U+FFFD', path => {
    const bytes = readFileSync(join(SRC, path));
    let text = '';
    expect(() => {
      text = FATAL.decode(bytes);
    }, 'invalid UTF-8 (a raw 0xA0 is a Latin-1 no-break space)').not.toThrow();
    expect(text.includes('\uFFFD'), 'U+FFFD').toBe(false);
  });
});
