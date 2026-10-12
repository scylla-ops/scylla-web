// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const WORKSPACE = join(dirname(fileURLToPath(import.meta.url)), '../../../../..');
const CENTERED = /-?translate-[xy]-(\[-50%\]|1\/2)/;
const SLIDE = /slide-(in-from|out-to)-/;

const sources = ['apps', 'packages', 'extensions'].flatMap(dir =>
  readdirSync(join(WORKSPACE, dir), { recursive: true, encoding: 'utf8' })
    .filter(path => /\.(svelte|ts)$/.test(path) && !/node_modules|dist\/|\.test\.ts$/.test(path))
    .map(path => join(dir, path)),
);

describe('a centered element', () => {
  it('is searched in every source, the dialog primitives included', () => {
    expect(sources).toContain('packages/ui/src/primitives/dialog/dialog-variants.ts');
  });

  it('never slides: Tailwind 4 centers with `translate`, tw-animate-css slides with `transform`, and the browser adds the two', () => {
    const sliding = sources.filter(path => {
      const source = readFileSync(join(WORKSPACE, path), 'utf8');
      return CENTERED.test(source) && SLIDE.test(source);
    });

    expect(sliding, 'use CENTERED_DIALOG_CLASS (fade and zoom) for these').toEqual([]);
  });
});
