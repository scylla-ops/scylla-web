// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  TOKENS_DIR,
  buildTokenFiles,
  figmaChanges,
  figmaPushBody,
  readSources,
  serializeTokens,
} from '../design-tokens.mjs';

const STYLES = `
:root {
  --background: #F4F7EB;
  /* A comment with a ; in it */
  --destructive-subtle: #C8584F1A;
  --line: rgba(93, 153, 114, 0.22);
  --radius: 0.625rem;
}
.dark {
  --background: #171715;
}
@theme inline {
  --font-sans: 'Funnel Sans Variable', ui-sans-serif, sans-serif;
  --color-background: var(--background);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-xl: calc(var(--radius) + 4px);
}
:root {
  scrollbar-color: rgba(0, 0, 0, 0.25) transparent;
}
`;

const TAILWIND = `
@theme default {
  --radius-xs: 0.125rem;
  --radius-sm: 0.25rem;
  --shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
  --inset-shadow-xs: inset 0 1px 1px rgb(0 0 0 / 0.05);
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
}
@theme default inline reference {
  --radius: 0.25rem;
  --shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
}
`;

const files = buildTokenFiles(STYLES, TAILWIND);
const light = files['mode.light.tokens.json'];
const dark = files['mode.dark.tokens.json'];

describe('the token files', () => {
  it('are the export of styles.css: run `pnpm tokens:export` after a change of a token', () => {
    for (const [name, tokens] of Object.entries(buildTokenFiles(...readSources()))) {
      const committed = readFileSync(join(TOKENS_DIR, name), 'utf8').replace(/\r\n/g, '\n');

      expect(committed, name).toBe(`${serializeTokens(tokens)}\n`);
    }
  });

  it('give the dark mode the light value of a token that `.dark` does not change', () => {
    expect(light.background.$value.hex).toBe('#f4f7eb');
    expect(dark.background.$value.hex).toBe('#171715');
    expect(dark['destructive-subtle']).toEqual(light['destructive-subtle']);
  });

  it('keep the alpha of a hex color and of an rgba() color apart from its hex', () => {
    expect(light['destructive-subtle'].$value).toEqual({
      colorSpace: 'srgb',
      components: [0.7843, 0.3451, 0.3098],
      alpha: 0.102,
      hex: '#c8584f',
    });
    expect(light.line.$value.alpha).toBe(0.22);
  });

  it('give the radius scale in px, from --radius and else from Tailwind, and not --radius itself', () => {
    const radii = Object.entries(light)
      .filter(([, token]) => token.$type === 'dimension')
      .map(([name, token]) => [name, token.$value.value]);

    expect(radii).toEqual([
      ['radius-xs', 2],
      ['radius-sm', 6],
      ['radius-xl', 14],
    ]);
    expect(light.radius).toBeUndefined();
  });

  it('name a font by its family, as Figma does', () => {
    expect(files['font.tokens.json']).toEqual({
      family: { sans: { $type: 'fontFamily', $value: 'Funnel Sans' } },
    });
  });

  it('give each layer of a shadow, and only the shadow-* scale of Tailwind', () => {
    const shadows = files['shadow.tokens.json'];

    expect(Object.keys(shadows)).toEqual(['shadow-sm']);
    expect(shadows['shadow-sm'].$value).toHaveLength(2);
    expect(shadows['shadow-sm'].$value[1]).toMatchObject({
      offsetY: { value: 1, unit: 'px' },
      blur: { value: 2, unit: 'px' },
      spread: { value: -1, unit: 'px' },
      color: { components: [0, 0, 0], alpha: 0.1 },
    });
  });

  it('stop on a token of a mode that is not a color: the export must learn it first', () => {
    expect(() => buildTokenFiles(':root { --gap: 4px; }', '')).toThrow('--gap');
  });
});

const LIGHT = 'mode:light';
const DARK = 'mode:dark';
const rgb = (hex, a = 1) => {
  const [r, g, b] = [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
  return { r, g, b, a };
};
const alias = id => ({ type: 'VARIABLE_ALIAS', id });
const variable = (id, name, variableCollectionId, valuesByMode) => ({
  id,
  name,
  variableCollectionId,
  valuesByMode,
});

const META = {
  variableCollections: {
    mode: {
      id: 'mode',
      name: 'mode',
      modes: [
        { modeId: LIGHT, name: 'light mode' },
        { modeId: DARK, name: 'dark mode' },
      ],
      defaultModeId: LIGHT,
    },
    font: {
      id: 'font',
      name: 'tw/font',
      modes: [{ modeId: 'font:1', name: 'Mode 1' }],
      defaultModeId: 'font:1',
    },
    numbers: {
      id: 'numbers',
      name: 'tokens',
      modes: [{ modeId: 'n:1', name: 'Mode 1' }],
      defaultModeId: 'n:1',
    },
  },
  variables: {
    background: variable('background', 'background', 'mode', {
      [LIGHT]: rgb('f4f7eb'),
      [DARK]: rgb('1e1e1c'),
    }),
    subtle: variable('subtle', 'destructive-subtle', 'mode', {
      [LIGHT]: rgb('c8584f', 0.1),
      [DARK]: alias('VariableID:another-file/1'),
    }),
    xs: variable('xs', 'radius-xs', 'mode', { [LIGHT]: alias('two'), [DARK]: alias('two') }),
    sm: variable('sm', 'radius-sm', 'mode', { [LIGHT]: alias('four'), [DARK]: alias('four') }),
    xl: variable('xl', 'radius-xl', 'mode', { [LIGHT]: 14, [DARK]: 14 }),
    two: variable('two', '2', 'numbers', { 'n:1': 2 }),
    four: variable('four', '4', 'numbers', { 'n:1': 4 }),
    sans: variable('sans', 'family/sans', 'font', { 'font:1': 'Funnel Sans' }),
  },
};

describe('the comparison with the Figma variables', () => {
  const { changes, problems } = figmaChanges(files, META);

  it('lists the values that differ and the variables that are missing, through local aliases', () => {
    expect(changes.map(change => change.where)).toEqual([
      'mode / light mode / line',
      'mode / light mode / radius-sm',
      'mode / dark mode / background',
      'mode / dark mode / line',
      'mode / dark mode / radius-sm',
    ]);
    expect(changes.find(change => change.variableId === 'sm')).toMatchObject({
      current: 4,
      value: 6,
    });
  });

  it('does not check an alias to a variable of another file', () => {
    expect(problems).toEqual([
      'mode / dark mode / destructive-subtle: an alias to a variable of another file, not checked',
    ]);
  });

  it('creates a missing variable once, with its value in each mode', () => {
    const body = figmaPushBody(changes);

    expect(body.variables).toEqual([
      {
        action: 'CREATE',
        id: 'new-0',
        name: 'line',
        variableCollectionId: 'mode',
        resolvedType: 'COLOR',
      },
    ]);
    expect(body.variableModeValues.filter(value => value.variableId === 'new-0')).toEqual([
      { variableId: 'new-0', modeId: LIGHT, value: { r: 0.3647, g: 0.6, b: 0.4471, a: 0.22 } },
      { variableId: 'new-0', modeId: DARK, value: { r: 0.3647, g: 0.6, b: 0.4471, a: 0.22 } },
    ]);
    expect(body.variableModeValues).toContainEqual({ variableId: 'sm', modeId: DARK, value: 6 });
  });
});
