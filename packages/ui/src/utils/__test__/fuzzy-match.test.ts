// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  fuzzyMatch,
  normalizeText,
  prepareFuzzyQuery,
  prepareFuzzyText,
  type FuzzyMatch,
} from '../fuzzy-match.ts';

const match = (query: string, name: string, keywords: string[] = [], place = ''): FuzzyMatch | null =>
  fuzzyMatch(prepareFuzzyQuery(query), {
    name: prepareFuzzyText(name),
    keywords: keywords.map(prepareFuzzyText),
    place: prepareFuzzyText(place),
  });

const score = (query: string, name: string): number => match(query, name)?.score ?? -1;

describe('normalizeText', () => {
  it('removes the case and the accents', () => {
    expect(normalizeText('Thème Déjà ÉTÉ')).toBe('theme deja ete');
  });

  it('opens the French ligatures', () => {
    expect(normalizeText('Cœur Æther')).toBe('coeur aether');
  });
});

describe('prepareFuzzyText', () => {
  it('splits on separators and on a change of case', () => {
    const words = prepareFuzzyText('web-api_v2 buildNode').words.map(word => word.text);
    expect(words).toEqual(['web', 'api', 'v2', 'build', 'node']);
  });

  it('keeps the place of each word in the source', () => {
    const text = prepareFuzzyText("Vue d'ensemble");
    const last = text.words.at(-1)!;
    expect(text.source.slice(last.start, last.end)).toBe('ensemble');
  });
});

describe('the kinds of error', () => {
  it.each([
    ['swapped letters', 'tokesn', 'tokens'],
    ['a missing letter', 'tokns', 'tokens'],
    ['an extra letter', 'tokkens', 'tokens'],
    ['a wrong letter', 'tokbns', 'tokens'],
    ['a swap on the first letters', 'otkens', 'tokens'],
    ['two errors', 'tkoesn', 'tokens'],
    ['no accent', 'parametres', 'Paramètres'],
    ['a wrong accent', 'parametrès', 'Paramètres'],
    ['a joined text', 'webapi', 'web-api'],
    ['a text with one space too many', 'work space', 'workspace'],
    ['words in another order', 'api web', 'web-api'],
  ])('tolerates %s', (_kind, query, name) => {
    expect(match(query, name)).not.toBeNull();
  });

  it('tells that a match needed an error', () => {
    expect(match('tokesn', 'tokens')?.typo).toBe(true);
    expect(match('tokens', 'tokens')?.typo).toBe(false);
    expect(match('oken', 'tokens')?.typo).toBe(false);
  });
});

describe('the budget of errors', () => {
  it('gives no error to a word of 2 letters', () => {
    expect(match('ab', 'ax')).toBeNull();
  });

  it('gives 1 error to a word of 3 or 4 letters', () => {
    expect(match('run', 'rub')).not.toBeNull();
    expect(match('run', 'rob')).toBeNull();
  });

  it('gives 2 swaps or neighbour keys to a word of 5 letters', () => {
    expect(match('tehme', 'thmee')).not.toBeNull();
    expect(match('quilt', 'build')).toBeNull();
  });

  it('gives 2 errors to a word of 6 or 7 letters', () => {
    expect(match('deploy', 'dplyo')).not.toBeNull();
    expect(match('deploy', 'xxploy')).not.toBeNull();
    expect(match('deploy', 'xxxloy')).toBeNull();
  });

  it('gives 1 error to a keyword, to a place and to a word still in progress', () => {
    expect(match('deplyo', 'other', ['deploy'])).not.toBeNull();
    expect(match('dplyo', 'other', ['deploy'])).toBeNull();
    expect(match('deplyo', 'other', [], 'deploy')).not.toBeNull();
    expect(match('dplyo', 'other', [], 'deploy')).toBeNull();
    expect(match('paramtr', 'parametres')).not.toBeNull();
    expect(match('pxrxmetr', 'parametres')).toBeNull();
  });

  it('gives 3 errors to a word of 8 letters or more', () => {
    expect(match('pipelines', 'pxpxlxnes')).not.toBeNull();
    expect(match('pipelines', 'pxpxlxnxx')).toBeNull();
  });

  it('counts a neighbour key on QWERTY or AZERTY as less than a wrong key', () => {
    expect(score('tolens', 'tokens')).toBeGreaterThan(score('topens', 'tokens') - 1);
    expect(score('qzure', 'azure')).toBeGreaterThan(score('tzure', 'azure'));
  });
});

describe('what stays out', () => {
  it('finds nothing for an unrelated word', () => {
    expect(match('kubernetes', 'tokens')).toBeNull();
    expect(match('facture', 'infrastructure')).toBeNull();
  });

  it('does not use a small word for a typo', () => {
    expect(match('thm', 'Collapse the sidebar')).toBeNull();
  });

  it('skips a small word of the query that is not in the name', () => {
    expect(match('le theme', 'Dark theme')).not.toBeNull();
  });

  it('needs every other word of the query', () => {
    expect(match('deploy mobile', 'Deploy', [], 'web-api')).toBeNull();
    expect(match('deploy mobile', 'Deploy', [], 'mobile-app')).not.toBeNull();
  });

  it('finds nothing for an empty query', () => {
    expect(match('  ', 'tokens')).toBeNull();
  });
});

describe('the order of the matches', () => {
  it('goes from the exact name to the letters in order', () => {
    const scores = [
      score('build web', 'build web'),
      score('buildweb', 'build web'),
      score('bui', 'build web'),
      score('web', 'build web'),
      score('we', 'build web'),
      score('bw', 'build web'),
      score('biuld', 'build web'),
      score('ild', 'build web'),
      score('bldw', 'build web'),
    ];
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
    expect(new Set(scores).size).toBe(scores.length);
  });

  it('puts fewer errors first', () => {
    expect(score('tokesn', 'tokens')).toBeGreaterThan(score('tkoesn', 'tokens'));
  });

  it('puts an error on the first letter after an error in the word', () => {
    expect(score('tpkens', 'tokens')).toBeGreaterThan(score('rokens', 'tokens'));
  });

  it('puts the first word of a name before a later word', () => {
    expect(score('membr', 'Members')).toBeGreaterThan(score('membr', 'Invite a member'));
  });

  it('puts a whole word before a keyword, and a keyword before the place', () => {
    const named = match('deploy', 'deploy')?.score ?? 0;
    const keyword = match('deploy', 'other', ['deploy'])?.score ?? 0;
    const placed = match('deploy', 'other', [], 'deploy')?.score ?? 0;
    expect(named).toBeGreaterThan(keyword);
    expect(keyword).toBeGreaterThan(placed);
  });
});

describe('the letters that matched', () => {
  it('gives the start of a word', () => {
    expect(match('bui', 'Build web')?.ranges).toEqual([[0, 3]]);
  });

  it('gives the word that a typo found', () => {
    expect(match('wbe', 'Build web')?.ranges).toEqual([[6, 9]]);
  });

  it('keeps the place in the text with accents', () => {
    const name = 'Thème sombre';
    const [[start, end]] = match('sombre', name)!.ranges;
    expect(name.slice(start, end)).toBe('sombre');
  });

  it('gives the letters of each word of the query', () => {
    expect(match('web bui', 'Build web')?.ranges).toEqual([
      [0, 3],
      [6, 9],
    ]);
  });

  it('gives no letter for a match on a keyword', () => {
    expect(match('night', 'Dark theme', ['night'])?.ranges).toEqual([]);
  });
});

describe('a long name', () => {
  it('works past the first size of the buffers', () => {
    const name = `${'a'.repeat(200)} deploy`;
    expect(match('delpoy', name)).not.toBeNull();
    expect(match(`${'a'.repeat(199)}b`, `${'a'.repeat(200)}`)).not.toBeNull();
  });
});
