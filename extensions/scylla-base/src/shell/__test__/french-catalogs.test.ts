// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

/**
 * Reads the French catalogs of scylla-base as text. In French, "pipeline" is feminine, the library
 * of fragments is the "bibliothèque", and the "one" form of a count covers 0 and 1. A count that
 * the English message does not put in the plural gets a plural in the French text.
 */

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

interface Entry {
  catalog: string;
  context: string | null;
  id: string;
  text: string;
}

const ENTRY = /(?:^msgctxt "(.*)"\n)?^msgid "(.*)"\nmsgstr "(.*)"$/gm;

const entries: Entry[] = readdirSync(SRC, { recursive: true, encoding: 'utf8' })
  .map(path => path.replaceAll('\\', '/'))
  .filter(path => path.endsWith('/locales/fr/messages.po'))
  .flatMap(catalog =>
    [...readFileSync(join(SRC, catalog), 'utf8').matchAll(ENTRY)]
      .filter(([, , id]) => id !== '')
      .map(([, context, id, text]) => ({ catalog, context: context ?? null, id, text })),
  );

const textOf = (id: string, context: string | null = null): string => {
  const found = entries.filter(entry => entry.id === id && entry.context === context);
  expect(found, id).toHaveLength(1);
  return found[0].text;
};

/** The text outside the `{name, plural, …}` and `{name, select, …}` parts. */
const outsideChoices = (text: string): string => {
  let out = '';
  for (let at = 0; at < text.length; at++) {
    if (!/^\{\w+, (?:plural|select|selectordinal),/.test(text.slice(at))) {
      out += text[at];
      continue;
    }
    for (let depth = 0; at < text.length; at++) {
      if (text[at] === '{') depth++;
      if (text[at] === '}' && --depth === 0) break;
    }
  }
  return out;
};

/** A pattern that starts and ends on whole words, accented letters included. */
const words = (source: string): RegExp => new RegExp(`(?<!\\p{L})(?:${source})(?!\\p{L})`, 'iu');

const MASCULINE_PIPELINE = [
  words(
    String.raw`(?:un|le|du|au|ce|cet|aucun|nouveau|premier|dernier|quels)\s+(?:\S+\s+)?pipelines?`,
  ),
  words(String.raw`son\s+premi\S*\s+pipeline`),
  words(String.raw`pipelines?\s+(?:les\s+plus\s+)?(?:lents|trouvé|prêt|archivés|masqués)`),
  words(String.raw`pipelines?\s+\S+\s+:\s+ils?`),
];

/** The messages whose "it" is the pipeline. */
const PIPELINE_PRONOUNS = [
  'Run it',
  'Run it when it matters',
  'Run it on a schedule or from a webhook.',
  'Draw it in Blueprint or write it in Scripting. The template works as is: click “Create”.',
  'It runs on an agent. Run it and follow its job next.',
];

/** A word after a count that does not take the plural. */
const INVARIABLE = new Set(['fois', 'dans', 'depuis', 'sans', 'sous', 'vers', 'plus']);

describe('the French catalogs', () => {
  it('reads the catalogs', () => {
    expect(entries.length).toBeGreaterThan(1000);
  });

  it('uses the feminine for a pipeline', () => {
    const masculine = entries
      .filter(entry => MASCULINE_PIPELINE.some(pattern => pattern.test(entry.text)))
      .map(entry => `${entry.catalog}: ${entry.text}`);

    expect(masculine).toEqual([]);
  });

  it('calls the library of fragments the bibliothèque', () => {
    const librairie = entries
      .filter(entry => /\blibrairie\b/i.test(entry.text))
      .map(entry => entry.text);

    expect(librairie).toEqual([]);
  });

  it.each(PIPELINE_PRONOUNS)('refers to the pipeline with a feminine pronoun: %s', id => {
    expect(textOf(id)).not.toMatch(/-le\b|\bIl\b|\bil\b/);
  });

  it('refers to an agent with a masculine pronoun', () => {
    expect(
      textOf('It was deleted, or you cannot see it. Choose another agent in Data.', 'agent widget'),
    ).toBe(
      'Il a été supprimé, ou vous ne pouvez pas le voir. Choisissez un autre agent dans Données.',
    );
  });

  it('puts a count before a plural word in a plural', () => {
    const unagreed = entries
      .filter(entry =>
        [...outsideChoices(entry.text).matchAll(/\{(?:count|\w+Count)\} (\p{L}+[sx])\b/gu)].some(
          ([, word]) => !INVARIABLE.has(word),
        ),
      )
      .map(entry => `${entry.catalog}: ${entry.text}`);

    expect(unagreed).toEqual([]);
  });
});
