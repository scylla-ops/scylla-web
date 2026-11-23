// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const WORKSPACE = join(dirname(fileURLToPath(import.meta.url)), '../../../..');
const CLASS_STRING = /(?<=["'`}])[^"'`{}\n]*(?=["'`{])/g;
const COLOR_UTILITIES = (
  'bg text border border-x border-y border-s border-e border-t border-r border-b border-l divide ' +
  'outline ring ring-offset inset-ring shadow inset-shadow drop-shadow text-shadow accent caret ' +
  'fill stroke decoration placeholder from via to'
).split(' ');

/** The colors of the default theme of Tailwind: `red-500`, `black`, `white`… */
const PALETTE = new Set(
  [
    ...readFileSync(
      createRequire(import.meta.url).resolve('tailwindcss/theme.css'),
      'utf8',
    ).matchAll(/--color-([\w-]+):/g),
  ].map(([, name]) => name),
);

const sources = ['apps', 'packages', 'sdks', 'extensions', 'catalog'].flatMap(dir =>
  readdirSync(join(WORKSPACE, dir), { recursive: true, encoding: 'utf8' })
    .map(path => `${dir}/${path.replaceAll('\\', '/')}`)
    .filter(
      path =>
        /\.(svelte|ts)$/.test(path) &&
        !/node_modules|dist\/|storybook-static|generated\/|\.test\.ts$/.test(path),
    ),
);

const paletteColorOf = (token: string) => {
  const utility = token.replace(/^\S*:/, '').replace(/^!|!$/g, '').replace(/^-/, '');
  const [name = ''] = utility.split('/');
  return COLOR_UTILITIES.some(
    prefix => name.startsWith(`${prefix}-`) && PALETTE.has(name.slice(prefix.length + 1)),
  );
};

const paletteClasses = sources.flatMap(path =>
  (readFileSync(join(WORKSPACE, path), 'utf8').match(CLASS_STRING) ?? [])
    .flatMap(classes => classes.split(/\s+/))
    .filter(paletteColorOf)
    .map(token => `${path}: ${token}`),
);

describe('a color class', () => {
  it('knows the palette of Tailwind, the new neutral colors included', () => {
    expect([...PALETTE]).toEqual(
      expect.arrayContaining(['black', 'white', 'slate-400', 'taupe-500']),
    );
    expect(paletteColorOf('hover:text-slate-900')).toBe(true);
    expect(paletteColorOf('bg-black/25')).toBe(true);
    expect(paletteColorOf('bg-overlay/25')).toBe(false);
    expect(paletteColorOf('text-sm')).toBe(false);
  });

  it('names a token of the theme, never a color of the palette: a palette color ignores the theme', () => {
    expect(paletteClasses, 'use a token of `styles.css`, or add one').toEqual([]);
  });
});
