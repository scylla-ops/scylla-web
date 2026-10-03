// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { modules } from '../modules.ts';

/**
 * Every point a module lists in `points` must be in the table of `@scylla/base-sdk`'s
 * `AGENTS.md`, under the name the loader gives it (`<module id>.<key>`): a contributor finds
 * every point there, with no feature `AGENTS.md` left to open first.
 */

const SDK_AGENTS_MD = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../../../../../sdks/scylla-base-sdk/AGENTS.md'),
  'utf8',
);

const pointNames = modules.flatMap(module =>
  Object.keys('points' in module ? module.points : {}).map(key => `${module.id}.${key}`),
);

describe('the SDK documents every widget point', () => {
  it('finds at least one point, so this test is not vacuous', () => {
    expect(pointNames.length).toBeGreaterThan(0);
  });

  it.each(pointNames)('names "%s" in the AGENTS.md of @scylla/base-sdk', pointName => {
    expect(
      SDK_AGENTS_MD.includes(pointName),
      `sdks/scylla-base-sdk/AGENTS.md does not mention "${pointName}": add it to its table of points.`,
    ).toBe(true);
  });
});
