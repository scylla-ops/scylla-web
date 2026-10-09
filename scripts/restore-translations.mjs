/**
 * Restores translations that `lingui extract` dropped when a component moved
 * between modules.
 *
 * Catalogs are per-module and keyed by source string, so moving a component from
 * `features/a` to `features/b` makes extract delete the message from a's `.po`
 * and re-create it *empty* in b's. The translation is silently lost — it only
 * shows up as untranslated UI.
 *
 * This rebuilds a msgid -> msgstr index from the catalogs as they exist in a git
 * ref (default HEAD, i.e. before the refactor) and fills any msgstr that is
 * currently empty. It never overwrites a non-empty translation, so re-running it
 * is safe.
 *
 * Usage:
 *   node scripts/restore-translations.mjs [--ref HEAD] [--dry-run]
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const refIndex = args.indexOf('--ref');
const ref = refIndex === -1 ? 'HEAD' : args[refIndex + 1];

const git = (...a) => execFileSync('git', a, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

/** A `msgctxt` is part of a message's identity: "Unknown" and its feminine form are two entries. */
const keyOf = (msgctxt, msgid) => `${msgctxt}\u001F${msgid}`;

/**
 * Entries look like:
 *   msgctxt "feminine"   (optional)
 *   msgid "some text"
 *   msgstr "translation"
 * and any of them may be split over several quoted continuation lines.
 */
const parsePo = source => {
  const entries = new Map();
  const lines = source.split('\n');
  let field = null;
  const buffer = { msgctxt: '', msgid: '', msgstr: '' };

  const flush = () => {
    if (buffer.msgid !== '') entries.set(keyOf(buffer.msgctxt, buffer.msgid), buffer.msgstr);
    buffer.msgctxt = '';
    buffer.msgid = '';
    buffer.msgstr = '';
    field = null;
  };

  for (const line of lines) {
    const msgctxt = /^msgctxt "(.*)"$/.exec(line);
    const msgid = /^msgid "(.*)"$/.exec(line);
    const msgstr = /^msgstr "(.*)"$/.exec(line);
    const cont = /^"(.*)"$/.exec(line);

    if (msgctxt) {
      flush();
      field = 'msgctxt';
      buffer.msgctxt = msgctxt[1];
    } else if (msgid) {
      if (field !== 'msgctxt') flush();
      field = 'msgid';
      buffer.msgid = msgid[1];
    } else if (msgstr && field === 'msgid') {
      field = 'msgstr';
      buffer.msgstr = msgstr[1];
    } else if (cont && field) {
      buffer[field] += cont[1];
    } else if (line.trim() === '' && field === 'msgstr') {
      flush();
    }
  }
  flush();
  return entries;
};

const localeOf = path => /\/locales\/([^/]+)\/messages\.po$/.exec(path)?.[1] ?? null;

// Baseline: every catalog as it was at `ref`, indexed per locale. Modules are
// deliberately collapsed together — the whole point is that the message moved.
const baseline = new Map();
const refFiles = git('ls-tree', '-r', '--name-only', ref)
  .split('\n')
  .filter(p => p.endsWith('messages.po'));

for (const path of refFiles) {
  const locale = localeOf(path);
  if (!locale) continue;
  if (!baseline.has(locale)) baseline.set(locale, new Map());
  const index = baseline.get(locale);
  for (const [key, msgstr] of parsePo(git('show', `${ref}:${path}`))) {
    if (msgstr !== '' && !index.has(key)) index.set(key, msgstr);
  }
}

const currentFiles = git('ls-files', '--cached', '--others', '--exclude-standard')
  .split('\n')
  .filter(p => p.endsWith('messages.po'));

let restoredTotal = 0;

for (const path of currentFiles) {
  const locale = localeOf(path);
  const index = baseline.get(locale);
  if (!index) continue;

  const source = readFileSync(path, 'utf8');
  const restored = [];

  // Only touch single-line `msgstr ""` entries: a multi-line empty msgstr is not
  // something extract produces, and rewriting one would risk mangling the file.
  const output = source.replace(
    /^(?:msgctxt "(.*)"\n)?msgid "(.*)"\nmsgstr ""$/gm,
    (whole, msgctxt = '', msgid) => {
      const translation = index.get(keyOf(msgctxt, msgid));
      if (translation === undefined) return whole;
      restored.push(msgid);
      return whole.replace(/msgstr ""$/, `msgstr "${translation}"`);
    },
  );

  if (restored.length === 0) continue;
  restoredTotal += restored.length;
  console.log(`${path}  (+${restored.length})`);
  for (const msgid of restored) console.log(`    ${msgid.slice(0, 72)}`);
  if (!dryRun) writeFileSync(path, output);
}

console.log(
  restoredTotal === 0
    ? '\nNo dropped translations to restore.'
    : `\n${dryRun ? 'Would restore' : 'Restored'} ${restoredTotal} translation(s) from ${ref}.`,
);
