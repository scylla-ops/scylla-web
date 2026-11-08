// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const STYLES = readFileSync(fileURLToPath(new URL('../styles.css', import.meta.url)), 'utf8');

const tokensOf = (selector: string): Record<string, string> => {
  const block = STYLES.match(new RegExp(`^${selector} \\{([^}]*)\\}`, 'm'))?.[1] ?? '';
  return Object.fromEntries(
    [...block.matchAll(/--([\w-]+):\s*(#[0-9A-Fa-f]{6})\b/g)].map(([, name, hex]) => [name, hex]),
  );
};

const luminance = (hex: string) => {
  const [r = 0, g = 0, b = 0] = [1, 3, 5]
    .map(start => parseInt(hex.slice(start, start + 2), 16) / 255)
    .map(channel => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

describe.each([
  ['light', ':root'],
  ['dark', '\\.dark'],
])('the %s theme', (_, selector) => {
  const tokens = tokensOf(selector);
  const surface = (name: string) => {
    const hex = tokens[name];
    if (!hex) throw new Error(`no --${name} in ${selector}`);
    return luminance(hex);
  };

  it('puts the double sidebar below the page: the rail is the darkest, then the second sidebar', () => {
    expect(surface('rail')).toBeLessThan(surface('second-sidebar'));
    expect(surface('second-sidebar')).toBeLessThan(surface('background'));
  });
});
