export type FuzzyRange = readonly [start: number, end: number];

interface FuzzyWord {
  text: string;
  /** The place of the word in `source`. */
  start: number;
  end: number;
}

/** A text prepared once, for many searches. */
export interface FuzzyText {
  /** The text in NFC form. The ranges of a match point into it. */
  source: string;
  normal: string;
  words: readonly FuzzyWord[];
  compact: string;
  initials: string;
}

export interface FuzzyQuery {
  words: readonly string[];
  compact: string;
}

export interface FuzzyFields {
  name: FuzzyText;
  keywords?: readonly FuzzyText[];
  place?: FuzzyText;
}

export interface FuzzyMatch {
  /** Higher is better. */
  score: number;
  /** True when a word of the query matched only with errors. */
  typo: boolean;
  /** The letters of the name that matched. */
  ranges: readonly FuzzyRange[];
}

interface WordHit {
  score: number;
  typo: boolean;
  ranges: readonly FuzzyRange[];
}

const WORD = /\p{Lu}?[\p{Ll}\p{N}\p{M}]+|\p{Lu}+(?!\p{Ll})|[\p{Lo}\p{Lm}]+/gu;
const NOT_A_WORD = /[^\p{L}\p{N}]+/u;

/** These words find a row only as they are, and a query can skip them. */
const STOP_WORDS = new Set([
  'a', 'an', 'and', 'in', 'of', 'the', 'to',
  'au', 'aux', 'd', 'de', 'des', 'du', 'en', 'et', 'l', 'la', 'le', 'les', 'un', 'une',
]);

const KEYBOARDS = [
  ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'],
  ['azertyuiop', 'qsdfghjklm', 'wxcvbn'],
];

const NEIGHBOURS = new Map<string, Set<string>>();
for (const rows of KEYBOARDS) {
  rows.forEach((row, rowIndex) => {
    [...row].forEach((key, keyIndex) => {
      const around = NEIGHBOURS.get(key) ?? new Set<string>();
      [
        row[keyIndex - 1],
        row[keyIndex + 1],
        rows[rowIndex - 1]?.[keyIndex],
        rows[rowIndex - 1]?.[keyIndex + 1],
        rows[rowIndex + 1]?.[keyIndex],
        rows[rowIndex + 1]?.[keyIndex - 1],
      ].forEach(neighbour => {
        if (neighbour) around.add(neighbour);
      });
      NEIGHBOURS.set(key, around);
    });
  });
}

const SWAP_COST = 0.75;
const NEIGHBOUR_COST = 0.75;

/** No case and no accents. */
export const normalizeText = (text: string): string =>
  text
    .replace(/[œŒ]/g, 'oe')
    .replace(/[æÆ]/g, 'ae')
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase();

export const prepareFuzzyText = (text: string): FuzzyText => {
  const source = text.normalize('NFC');
  const words = [...source.matchAll(WORD)].map(match => ({
    text: normalizeText(match[0]),
    start: match.index,
    end: match.index + match[0].length,
  }));
  return {
    source,
    normal: words.map(word => word.text).join(' '),
    words,
    compact: words.map(word => word.text).join(''),
    initials: words.map(word => word.text[0]).join(''),
  };
};

export const prepareFuzzyQuery = (text: string): FuzzyQuery => {
  const words = normalizeText(text).split(NOT_A_WORD).filter(Boolean);
  return { words, compact: words.join('') };
};

const errorBudget = (length: number): number => {
  if (length <= 2) return 0;
  if (length <= 4) return 1;
  if (length === 5) return 1.5;
  return length <= 7 ? 2 : 3;
};

/** A word that the user is still typing, a keyword or a place: more errors would find any row. */
const LOOSE_BUDGET = 1;

const letterCost = (a: string, b: string): number => {
  if (a === b) return 0;
  return NEIGHBOURS.get(a)?.has(b) ? NEIGHBOUR_COST : 1;
};

let rowBefore = new Float64Array(64);
let rowLast = new Float64Array(64);
let rowNow = new Float64Array(64);

/**
 * Optimal string alignment. It gives the cost against the whole word, and against the best start
 * of the word, because the user can still be typing. `null` when the cost is above the budget.
 */
const editCost = (
  query: string,
  word: string,
  budget: number,
): { whole: number; start: number } | null => {
  const m = query.length;
  const n = word.length;
  if (n < m - budget) return null;
  if (rowNow.length <= n) {
    rowBefore = new Float64Array(n + 1);
    rowLast = new Float64Array(n + 1);
    rowNow = new Float64Array(n + 1);
  }

  for (let j = 0; j <= n; j++) rowLast[j] = j;
  let leastBefore = 0;

  for (let i = 1; i <= m; i++) {
    rowNow[0] = i;
    let least = i;
    for (let j = 1; j <= n; j++) {
      let cost = Math.min(
        rowLast[j] + 1,
        rowNow[j - 1] + 1,
        rowLast[j - 1] + letterCost(query[i - 1], word[j - 1]),
      );
      if (i > 1 && j > 1 && query[i - 1] === word[j - 2] && query[i - 2] === word[j - 1]) {
        cost = Math.min(cost, rowBefore[j - 2] + SWAP_COST);
      }
      rowNow[j] = cost;
      if (cost < least) least = cost;
    }
    // A swap reads the row before the last one, so one row above the budget is not the end.
    if (least > budget && leastBefore > budget) return null;
    leastBefore = least;
    [rowBefore, rowLast, rowNow] = [rowLast, rowNow, rowBefore];
  }

  let start = Infinity;
  for (let j = Math.max(1, m - Math.ceil(budget)); j <= n; j++) {
    if (rowLast[j] < start) start = rowLast[j];
  }
  return { whole: rowLast[n], start };
};

const wordRange = (word: FuzzyWord, length: number): FuzzyRange => [
  word.start,
  Math.min(word.start + length, word.end),
];

const typoHit = (token: string, field: FuzzyText, cap: number): WordHit | null => {
  if (errorBudget(token.length) === 0) return null;

  let best: WordHit | null = null;
  const consider = (
    target: string,
    place: number,
    ranges: readonly FuzzyRange[],
  ) => {
    // By the longer word: a missing letter must not take away a part of the budget.
    const budget = Math.min(errorBudget(Math.max(token.length, target.length)), cap);
    const found = editCost(token, target, budget);
    if (!found) return;
    const fromStart = found.start < found.whole && found.start <= LOOSE_BUDGET;
    const errors = fromStart ? found.start : found.whole;
    if (errors > budget) return;
    const sameStart =
      token[0] === target[0] || (token[1] === target[0] && token[0] === target[1]);
    const score =
      640 -
      errors * 100 -
      (fromStart ? 20 : 0) -
      (sameStart ? 0 : 60) -
      place +
      (token.length / Math.max(target.length, 1)) * 10;
    if (!best || score > best.score) best = { score, typo: true, ranges };
  };

  field.words.forEach((word, index) => {
    if (word.text.length >= 3 && !STOP_WORDS.has(word.text)) {
      consider(word.text, index * 30, [[word.start, word.end]]);
    }
  });
  if (field.words.length > 1) {
    consider(
      field.compact,
      15,
      field.words.map(word => [word.start, word.end]),
    );
  }
  return best;
};

/** The best match of one word of the query in one field. */
const matchWord = (token: string, field: FuzzyText, cap = Infinity): WordHit | null => {
  const { normal, words, compact, initials } = field;
  if (!normal) return null;
  const shape = token.length / normal.length;

  if (normal === token) return { score: 1000, typo: false, ranges: [[0, field.source.length]] };
  if (compact === token) {
    const ranges = words.map((word): FuzzyRange => [word.start, word.end]);
    return { score: 980, typo: false, ranges };
  }
  if (normal.startsWith(token)) {
    return { score: 900 + shape * 40, typo: false, ranges: [wordRange(words[0], token.length)] };
  }

  const whole = words.findIndex(word => word.text === token);
  if (whole >= 0) {
    return { score: 850 - whole, typo: false, ranges: [[words[whole].start, words[whole].end]] };
  }
  const start = words.findIndex(word => word.text.startsWith(token));
  if (start >= 0) {
    return {
      score: 800 - start + shape * 20,
      typo: false,
      ranges: [wordRange(words[start], token.length)],
    };
  }
  if (token.length >= 2 && initials.startsWith(token)) {
    const ranges = words.slice(0, token.length).map(word => wordRange(word, 1));
    return { score: 700, typo: false, ranges };
  }

  const typo = typoHit(token, field, cap);
  if (token.length >= 3 && normal.includes(token) && (!typo || typo.score < 480)) {
    const word = words.find(candidate => candidate.text.includes(token));
    const at = word ? word.start + word.text.indexOf(token) : 0;
    return { score: 480 + shape * 10, typo: false, ranges: [[at, at + token.length]] };
  }
  if (typo) return typo;

  if (token.length >= 4 && token[0] === compact[0] && compact.length <= token.length * 2.5) {
    let next = 0;
    for (const letter of compact) if (letter === token[next]) next++;
    if (next === token.length) return { score: 200 + shape * 20, typo: true, ranges: [] };
  }
  return null;
};

const KEYWORD_WEIGHT = 0.8;
const PLACE_WEIGHT = 0.5;

const bestHit = (token: string, { name, keywords = [], place }: FuzzyFields): WordHit | null => {
  let best = matchWord(token, name);
  for (const keyword of keywords) {
    const hit = matchWord(token, keyword, LOOSE_BUDGET);
    if (hit && hit.score * KEYWORD_WEIGHT > (best?.score ?? -1)) {
      best = { score: hit.score * KEYWORD_WEIGHT, typo: hit.typo, ranges: [] };
    }
  }
  const placed = place ? matchWord(token, place, LOOSE_BUDGET) : null;
  if (placed && placed.score * PLACE_WEIGHT > (best?.score ?? -1)) {
    best = { score: placed.score * PLACE_WEIGHT, typo: placed.typo, ranges: [] };
  }
  return best;
};

const mergeRanges = (ranges: readonly FuzzyRange[]): FuzzyRange[] => {
  const sorted = [...ranges].sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const [start, end] of sorted) {
    const last = merged.at(-1);
    if (last && start <= last[1]) last[1] = Math.max(last[1], end);
    else merged.push([start, end]);
  }
  return merged;
};

/**
 * Each word of the query must match the name, a keyword or the place, in any order. A word
 * tolerates swapped, missing, extra and wrong letters: the longer the word, the more errors in a
 * name. A keyword or a place tolerates one error.
 * `null` is no match.
 */
export const fuzzyMatch = (query: FuzzyQuery, fields: FuzzyFields): FuzzyMatch | null => {
  if (query.words.length === 0) return null;
  if (query.words.join(' ') === fields.name.normal) {
    return { score: 1000, typo: false, ranges: [[0, fields.name.source.length]] };
  }

  let total = 0;
  let counted = 0;
  let typo = false;
  const ranges: FuzzyRange[] = [];

  for (const token of query.words) {
    const hit = bestHit(token, fields);
    if (hit) {
      total += hit.score;
      counted++;
      typo ||= hit.typo;
      ranges.push(...hit.ranges);
    } else if (!STOP_WORDS.has(token)) {
      if (query.words.length === 1) return null;
      // `work space` for a name with the word `workspace`.
      const joined = matchWord(query.compact, fields.name);
      return joined && { score: joined.score - 20, typo: true, ranges: joined.ranges };
    }
  }

  if (counted === 0) return null;
  return { score: total / counted, typo, ranges: mergeRanges(ranges) };
};
