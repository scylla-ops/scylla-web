/**
 * Writes the design tokens of `packages/ui/src/styles.css` to `packages/ui/tokens/`, then compares
 * them with the variables of the Figma library "scylla :: ui". See `packages/ui/DESIGN-SYSTEM.md`.
 *
 * Usage:
 *   node scripts/export-tokens.mjs           write the files, compare them with Figma
 *   node scripts/export-tokens.mjs --check   exit 1 when the files are not up to date
 *   node scripts/export-tokens.mjs --push    write the files, then write the changes to Figma
 *
 * The Figma part reads FIGMA_TOKEN (a personal access token with the scope
 * `file_variables:read`, and `file_variables:write` for --push) from the environment, never from
 * a file. The Variables REST API is only for a full seat of an Enterprise plan: on another plan,
 * the script tells how to import the files by hand. FIGMA_FILE_KEY changes the file.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import {
  FIGMA_TARGETS,
  TOKENS_DIR,
  buildTokenFiles,
  figmaChanges,
  figmaPushBody,
  readSources,
  serializeTokens,
} from './design-tokens.mjs';

const LIBRARY_FILE_KEY = 'Soh2M4f7Xvsls7iGCWclSV';
const FIGMA_API = 'https://api.figma.com/v1';

const files = buildTokenFiles(...readSources());
const texts = Object.entries(files).map(([name, tokens]) => [name, `${serializeTokens(tokens)}\n`]);
const shown = name => relative(process.cwd(), join(TOKENS_DIR, name)).split('\\').join('/');

const check = () => {
  const stale = texts
    .filter(([name, text]) => {
      const path = join(TOKENS_DIR, name);
      return !existsSync(path) || readFileSync(path, 'utf8').replace(/\r\n/g, '\n') !== text;
    })
    .map(([name]) => name);
  if (stale.length === 0) {
    console.log(`\n✔ the design tokens are up to date (${texts.length} files)\n`);
    return 0;
  }
  console.log(`\n✖ these token files are not the export of packages/ui/src/styles.css:`);
  for (const name of stale) console.log(`    ${shown(name)}`);
  console.log('\n  Run `pnpm tokens:export`, then commit the files.\n');
  return 1;
};

const importByHand = () => {
  const [light, dark, font] = FIGMA_TARGETS.map(target => shown(target.file));
  console.log(
    [
      '  Import the files by hand, in the library "scylla :: ui":',
      '    1. Open the Variables window.',
      `    2. In the collection "mode", right-click "light mode" > Import mode > ${light}.`,
      `    3. Right-click "dark mode" > Import mode > ${dark}.`,
      `    4. In the collection "tw/font", right-click its mode > Import mode > ${font}.`,
      `    5. Set the effect styles shadow-* to the values of ${shown('shadow.tokens.json')}.`,
      '    6. Publish the library.',
      '',
    ].join('\n'),
  );
};

const describe = value => {
  if (typeof value !== 'object') return JSON.stringify(value);
  const hex = ['r', 'g', 'b'].map(key =>
    Math.round(value[key] * 255)
      .toString(16)
      .padStart(2, '0'),
  );
  return `#${hex.join('')}${value.a < 1 ? ` alpha ${Number(value.a.toFixed(3))}` : ''}`;
};

const figma = async (path, init = {}) => {
  const response = await fetch(`${FIGMA_API}${path}`, {
    ...init,
    headers: {
      'X-Figma-Token': process.env.FIGMA_TOKEN,
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`${response.status} ${body.message ?? body.err ?? response.statusText}`);
  }
  return body;
};

const compareWithFigma = async () => {
  if (!process.env.FIGMA_TOKEN) {
    console.log('  Figma: no FIGMA_TOKEN, thus no comparison with the library.');
    importByHand();
    return;
  }
  const fileKey = process.env.FIGMA_FILE_KEY || LIBRARY_FILE_KEY;
  let meta;
  try {
    ({ meta } = await figma(`/files/${fileKey}/variables/local`));
  } catch (error) {
    console.log(`  Figma: the Variables REST API refused the request (${error.message}).`);
    console.log('  It needs a full seat of an Enterprise plan and the scope file_variables:read.');
    importByHand();
    return;
  }

  const { changes, problems } = figmaChanges(files, meta);
  for (const problem of problems) console.log(`  Figma: ${problem}`);
  if (changes.length === 0) {
    console.log('  Figma: the variables of the library are equal to the code.\n');
    return;
  }
  console.log(`  Figma: ${changes.length} values are not equal to the code:`);
  for (const change of changes) {
    const now = change.current === undefined ? 'missing' : describe(change.current);
    console.log(`    ${change.where}: ${now} in Figma, ${describe(change.value)} in the code`);
  }
  if (!process.argv.includes('--push')) {
    console.log(
      '\n  Run `pnpm tokens:export --push` to write them, or import the files by hand.\n',
    );
    return;
  }
  await figma(`/files/${fileKey}/variables`, {
    method: 'POST',
    body: JSON.stringify(figmaPushBody(changes)),
  });
  console.log(`\n✔ wrote ${changes.length} values to Figma. Publish the library to share them.\n`);
};

if (process.argv.includes('--check')) {
  process.exitCode = check();
} else {
  mkdirSync(TOKENS_DIR, { recursive: true });
  for (const [name, text] of texts) writeFileSync(join(TOKENS_DIR, name), text);
  console.log(`\n✔ wrote ${texts.length} token files in ${shown('')}\n`);
  await compareWithFigma();
}
