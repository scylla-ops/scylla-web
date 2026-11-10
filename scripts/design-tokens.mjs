/**
 * The design tokens of `@scylla/ui`, read from its CSS, in the format of the Design Tokens
 * Community Group that Figma imports: one file for each mode of a Figma collection.
 * `packages/ui/DESIGN-SYSTEM.md` tells how to use them.
 */

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const WEB_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const TOKENS_DIR = join(WEB_ROOT, 'packages/ui/tokens');
export const STYLES_CSS = join(WEB_ROOT, 'packages/ui/src/styles.css');

const REM_PX = 16;

/** The Figma variables that each file sets. The shadows are effect styles: no variable. */
export const FIGMA_TARGETS = [
  { file: 'mode.light.tokens.json', collection: 'mode', mode: 'light mode' },
  { file: 'mode.dark.tokens.json', collection: 'mode', mode: 'dark mode' },
  { file: 'font.tokens.json', collection: 'tw/font', mode: null },
];

export const readSources = () => [
  readFileSync(STYLES_CSS, 'utf8'),
  readFileSync(
    createRequire(join(WEB_ROOT, 'package.json')).resolve('tailwindcss/theme.css'),
    'utf8',
  ),
];

const round = (value, digits) => Number(value.toFixed(digits));

const topLevelBlocks = (css, header) => {
  const found = [];
  let depth = 0;
  let start = 0;
  let open = 0;
  let head = '';
  for (let i = 0; i < css.length; i++) {
    const char = css[i];
    if (char === '{') {
      if (depth === 0) {
        head = css.slice(start, i).trim();
        open = i + 1;
      }
      depth++;
    } else if (char === '}') {
      depth--;
      if (depth === 0) {
        if (head === header) found.push(css.slice(open, i));
        start = i + 1;
      }
    } else if (char === ';' && depth === 0) {
      start = i + 1;
    }
  }
  return found;
};

const customProperties = (css, header) => {
  const properties = {};
  for (let body of topLevelBlocks(css.replace(/\/\*[\s\S]*?\*\//g, ''), header)) {
    while (/\{[^{}]*\}/.test(body)) body = body.replace(/[^;{}]*\{[^{}]*\}/g, '');
    for (const [, name, value] of body.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) {
      properties[name] = value.replace(/\s+/g, ' ').trim();
    }
  }
  return properties;
};

const splitTopLevel = value => {
  const parts = [''];
  let depth = 0;
  for (const char of value) {
    if (char === '(') depth++;
    if (char === ')') depth--;
    if (char === ',' && depth === 0) parts.push('');
    else parts[parts.length - 1] += char;
  }
  return parts.map(part => part.trim());
};

const px = (value, vars) => {
  const resolved = value.replace(/var\(--([\w-]+)\)/g, (_, name) => {
    if (!(name in vars)) throw new Error(`--${name} is not defined`);
    return vars[name];
  });
  const expression = /^calc\((.*)\)$/.exec(resolved)?.[1] ?? resolved;
  const [first, ...rest] = expression.split(/\s+([+-])\s+/);
  let total = length(first, value);
  for (let i = 0; i < rest.length; i += 2) {
    total += (rest[i] === '-' ? -1 : 1) * length(rest[i + 1], value);
  }
  return round(total, 2);
};

const length = (term, source) => {
  const match = /^(-?[\d.]+)(px|rem)?$/.exec(term.trim());
  if (!match) throw new Error(`"${source}" is not a length that the export reads`);
  return Number(match[1]) * (match[2] === 'rem' ? REM_PX : 1);
};

const color = (value, name) => {
  const hex = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(value);
  const rgb = /^rgba?\(([^)]*)\)$/.exec(value);
  let channels;
  let alpha;
  if (hex) {
    channels = [0, 2, 4].map(i => parseInt(hex[1].slice(i, i + 2), 16));
    alpha = hex[2] ? parseInt(hex[2], 16) / 255 : 1;
  } else if (rgb) {
    const parts = rgb[1]
      .split(/[\s,/]+/)
      .filter(Boolean)
      .map(Number);
    channels = parts.slice(0, 3);
    alpha = parts[3] ?? 1;
  }
  if (!channels || channels.length !== 3 || [...channels, alpha].some(Number.isNaN)) {
    throw new Error(`--${name}: "${value}" is not a color that the export reads`);
  }
  return {
    colorSpace: 'srgb',
    components: channels.map(channel => round(channel / 255, 4)),
    alpha: round(alpha, 4),
    hex: `#${channels.map(channel => channel.toString(16).padStart(2, '0')).join('')}`,
  };
};

const shadowLayer = (layer, name) => {
  const parts = layer.match(/rgba?\([^)]*\)|\S+/g);
  const colorPart = parts.find(part => part.startsWith('rgb') || part.startsWith('#'));
  const [offsetX, offsetY, blur = '0', spread = '0'] = parts.filter(
    part => part !== colorPart && part !== 'inset',
  );
  const dimension = part => ({ value: px(part, {}), unit: 'px' });
  return {
    color: color(colorPart, name),
    offsetX: dimension(offsetX),
    offsetY: dimension(offsetY),
    blur: dimension(blur),
    spread: dimension(spread),
    ...(parts.includes('inset') ? { inset: true } : {}),
  };
};

const modeTokens = (vars, theme) => {
  const tokens = {};
  for (const [name, value] of Object.entries(vars)) {
    if (name !== 'radius') tokens[name] = { $type: 'color', $value: color(value, name) };
  }
  for (const [name, value] of Object.entries(theme)) {
    if (name.startsWith('radius-')) {
      tokens[name] = { $type: 'dimension', $value: { value: px(value, vars), unit: 'px' } };
    }
  }
  return tokens;
};

// fontsource names a variable font "<family> Variable"; Figma knows it by the family.
const fontName = stack =>
  splitTopLevel(stack)[0]
    .replace(/^['"]|['"]$/g, '')
    .replace(/ Variable$/, '');

export const buildTokenFiles = (stylesCss, tailwindThemeCss) => {
  const light = customProperties(stylesCss, ':root');
  const dark = { ...light, ...customProperties(stylesCss, '.dark') };
  const ownTheme = customProperties(stylesCss, '@theme inline');
  const theme = { ...customProperties(tailwindThemeCss, '@theme default'), ...ownTheme };
  const entries = (source, prefix, token) =>
    Object.fromEntries(
      Object.entries(source)
        .filter(([name]) => name.startsWith(prefix))
        .map(([name, value]) => token(name, value)),
    );
  return {
    'mode.light.tokens.json': modeTokens(light, theme),
    'mode.dark.tokens.json': modeTokens(dark, theme),
    'font.tokens.json': {
      family: entries(ownTheme, 'font-', (name, value) => [
        name.slice('font-'.length),
        { $type: 'fontFamily', $value: fontName(value) },
      ]),
    },
    'shadow.tokens.json': entries(theme, 'shadow-', (name, value) => [
      name,
      { $type: 'shadow', $value: splitTopLevel(value).map(layer => shadowLayer(layer, name)) },
    ]),
  };
};

/** One token on each line, so that a diff names the token that changed. */
export const serializeTokens = (group, indent = '') => {
  const inner = `${indent}  `;
  const lines = Object.entries(group).map(
    ([key, node]) =>
      `${inner}${JSON.stringify(key)}: ${
        '$value' in node ? JSON.stringify(node) : serializeTokens(node, inner)
      }`,
  );
  return `{\n${lines.join(',\n')}\n${indent}}`;
};

const flatten = (group, path = []) =>
  Object.entries(group).flatMap(([key, node]) =>
    '$value' in node
      ? [{ name: [...path, key].join('/'), type: node.$type, value: node.$value }]
      : flatten(node, [...path, key]),
  );

const FIGMA_TYPE = { color: 'COLOR', dimension: 'FLOAT', fontFamily: 'STRING' };

const figmaValue = ({ type, value }) => {
  if (type === 'color') {
    const [r, g, b] = value.components;
    return { r, g, b, a: value.alpha };
  }
  return type === 'dimension' ? value.value : value;
};

const resolveAlias = (value, modeId, meta, depth = 0) => {
  if (value?.type !== 'VARIABLE_ALIAS') return value;
  const target = meta.variables[value.id];
  if (!target || depth > 10) return undefined;
  const mode =
    modeId in target.valuesByMode
      ? modeId
      : meta.variableCollections[target.variableCollectionId].defaultModeId;
  return resolveAlias(target.valuesByMode[mode], mode, meta, depth + 1);
};

const byte = channel => Math.round(channel * 255);

const sameValue = (current, wanted) => {
  if (typeof wanted === 'number') return Math.abs(current - wanted) < 0.01;
  if (typeof wanted === 'string') return current === wanted;
  return ['r', 'g', 'b', 'a'].every(key => byte(current[key]) === byte(wanted[key]));
};

/**
 * The changes that make the Figma variables equal to the token files. `meta` is the answer of
 * `GET /v1/files/:key/variables/local`. An alias to a variable of another file is not checked.
 */
export const figmaChanges = (files, meta) => {
  const changes = [];
  const problems = [];
  const variables = Object.values(meta.variables);
  for (const target of FIGMA_TARGETS) {
    const collection = Object.values(meta.variableCollections).find(
      candidate => candidate.name === target.collection,
    );
    const mode = collection?.modes.find(candidate =>
      target.mode ? candidate.name === target.mode : candidate.modeId === collection.defaultModeId,
    );
    if (!mode) {
      problems.push(
        `no collection "${target.collection}" with the mode "${target.mode ?? 'default'}"`,
      );
      continue;
    }
    for (const token of flatten(files[target.file])) {
      const where = `${target.collection} / ${mode.name} / ${token.name}`;
      const value = figmaValue(token);
      const variable = variables.find(
        candidate =>
          candidate.variableCollectionId === collection.id && candidate.name === token.name,
      );
      const change = {
        where,
        name: token.name,
        collectionId: collection.id,
        modeId: mode.modeId,
        resolvedType: FIGMA_TYPE[token.type],
        value,
      };
      if (!variable) {
        changes.push(change);
        continue;
      }
      const current = resolveAlias(variable.valuesByMode[mode.modeId], mode.modeId, meta);
      if (current === undefined) {
        problems.push(`${where}: an alias to a variable of another file, not checked`);
      } else if (!sameValue(current, value)) {
        changes.push({ ...change, variableId: variable.id, current });
      }
    }
  }
  return { changes, problems };
};

/** The body of `POST /v1/files/:key/variables` that applies the changes. */
export const figmaPushBody = changes => {
  const created = new Map();
  const variables = [];
  const variableModeValues = [];
  for (const change of changes) {
    let variableId = change.variableId;
    if (!variableId) {
      const key = `${change.collectionId}/${change.name}`;
      if (!created.has(key)) {
        created.set(key, `new-${created.size}`);
        variables.push({
          action: 'CREATE',
          id: created.get(key),
          name: change.name,
          variableCollectionId: change.collectionId,
          resolvedType: change.resolvedType,
        });
      }
      variableId = created.get(key);
    }
    variableModeValues.push({ variableId, modeId: change.modeId, value: change.value });
  }
  return { variables, variableModeValues };
};
