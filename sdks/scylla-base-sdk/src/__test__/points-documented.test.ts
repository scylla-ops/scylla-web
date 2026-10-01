// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import * as baseSdk from '../index.ts';

/**
 * Enumerates the SDK's exports and finds the ones that look like a `definePoints(...)` result:
 * an object whose own values are themselves point objects (each with a `name: string`). Checks
 * that every point name is mentioned in this package's `AGENTS.md` — a contributor must be able
 * to find every point there, with no feature `AGENTS.md` left to open first.
 */

const AGENTS_MD = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'AGENTS.md'), 'utf8');

const isPoint = (value: unknown): value is { name: string } =>
  typeof value === 'object' && value !== null && typeof (value as { name?: unknown }).name === 'string';

const isPointsObject = (value: unknown): value is Record<string, { name: string }> =>
  typeof value === 'object' &&
  value !== null &&
  Object.values(value).length > 0 &&
  Object.values(value).every(isPoint);

const pointsObjects = Object.entries(baseSdk).filter(
  ([exportName, value]) => exportName.endsWith('Points') && isPointsObject(value),
) as [string, Record<string, { name: string }>][];

describe('the SDK documents every widget point it exports', () => {
  it('finds at least one points object, so this test is not vacuous', () => {
    expect(pointsObjects.length).toBeGreaterThan(0);
  });

  it.each(pointsObjects.flatMap(([exportName, points]) => Object.values(points).map(p => [exportName, p.name])))(
    '%s names "%s" in AGENTS.md',
    (_exportName, pointName) => {
      expect(
        AGENTS_MD.includes(pointName),
        `AGENTS.md does not mention the point "${pointName}" — add a row to its table of points.`,
      ).toBe(true);
    },
  );
});
