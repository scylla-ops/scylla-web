/**
 * The Markdown of a legal document → the blocks that the page shows. A small part of Markdown
 * only: headings, paragraphs, lists, quotes, tables, code, rules, bold, italic, code and links.
 * The result is data, never HTML: the view renders each text as text, so a document cannot
 * inject markup or a script. A link goes to an http, https, mailto or tel address, or to a path
 * of the app; another link is text.
 */

export type Inline =
  | { type: 'text'; text: string }
  | { type: 'strong'; children: Inline[] }
  | { type: 'em'; children: Inline[] }
  | { type: 'code'; text: string }
  | { type: 'link'; href: string; children: Inline[] }
  | { type: 'break' };

export type CellAlign = 'left' | 'center' | 'right' | null;

export type Block =
  | { type: 'heading'; level: 2 | 3 | 4; id: string; text: string; children: Inline[] }
  | { type: 'paragraph'; children: Inline[] }
  | { type: 'list'; ordered: boolean; start: number; items: Inline[][] }
  | { type: 'quote'; paragraphs: Inline[][] }
  | { type: 'code'; text: string }
  | { type: 'rule' }
  | { type: 'table'; align: CellAlign[]; head: Inline[][]; rows: Inline[][][] };

/** A heading of the table of contents. */
export interface Heading {
  id: string;
  text: string;
}

const FENCE = /^\s{0,3}(`{3,}|~{3,})/;
const HEADING = /^\s{0,3}(#{1,6})\s+(.*?)(?:\s+#+)?\s*$/;
const RULE = /^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/;
const QUOTE = /^\s{0,3}>\s?(.*)$/;
const ITEM = /^\s{0,3}([-*+]|\d{1,9}[.)])\s+(.*)$/;
const TABLE_RULE = /^\s*\|?\s*:?-+:?\s*(?:\|\s*:?-+:?\s*)*\|?\s*$/;
const SAFE_HREF = /^(?:https?:|mailto:|tel:|#|\/(?!\/))/i;

// Inline -------------------------------------------------------------------------------------

/** The index of the closing marker, or -1. A closing marker follows a character that is not a space. */
const closing = (text: string, marker: string, from: number): number => {
  let index = text.indexOf(marker, from);
  while (index !== -1) {
    const before = text[index - 1] ?? ' ';
    const after = text[index + marker.length] ?? ' ';
    const inWord = marker[0] === '_' && /\w/.test(after);
    if (index > from && !/\s/.test(before) && !inWord) return index;
    index = text.indexOf(marker, index + 1);
  }
  return -1;
};

/** The index of the `]` that closes the `[` at `open`, or -1. */
const closingBracket = (text: string, open: number): number => {
  let depth = 0;
  for (let index = open; index < text.length; index++) {
    if (text[index] === '\\') index++;
    else if (text[index] === '[') depth++;
    else if (text[index] === ']' && --depth === 0) return index;
  }
  return -1;
};

export const parseInline = (text: string): Inline[] => {
  const nodes: Inline[] = [];
  let buffer = '';
  const flush = () => {
    if (buffer) nodes.push({ type: 'text', text: buffer });
    buffer = '';
  };

  let index = 0;
  while (index < text.length) {
    const char = text[index] ?? '';
    const next = text[index + 1] ?? '';

    // An escaped character is text.
    if (char === '\\' && /[\\`*_[\]()#+\-.!|<>~]/.test(next)) {
      buffer += next;
      index += 2;
      continue;
    }

    // Code: the text as it is, up to the next backtick.
    if (char === '`') {
      const end = text.indexOf('`', index + 1);
      if (end > index) {
        flush();
        nodes.push({ type: 'code', text: text.slice(index + 1, end) });
        index = end + 1;
        continue;
      }
    }

    // Bold, then italic. An underscore in a word is text: `snake_case`.
    const wordBefore = /\w/.test(text[index - 1] ?? '');
    if ((char === '*' || char === '_') && !(char === '_' && wordBefore)) {
      const marker = next === char ? char + char : char;
      const start = index + marker.length;
      const end = /\s/.test(text[start] ?? ' ') ? -1 : closing(text, marker, start);
      if (end !== -1) {
        flush();
        const children = parseInline(text.slice(start, end));
        nodes.push(marker.length === 2 ? { type: 'strong', children } : { type: 'em', children });
        index = end + marker.length;
        continue;
      }
    }

    // A link: `[text](href)`, or `<https://…>`.
    if (char === '[') {
      const close = closingBracket(text, index);
      const end = close !== -1 && text[close + 1] === '(' ? text.indexOf(')', close + 2) : -1;
      if (end !== -1) {
        flush();
        const href = text.slice(close + 2, end).trim();
        const children = parseInline(text.slice(index + 1, close));
        if (SAFE_HREF.test(href)) nodes.push({ type: 'link', href, children });
        else nodes.push(...children);
        index = end + 1;
        continue;
      }
    }
    const autolink =
      char === '<' ? /^<((?:https?:\/\/|mailto:)[^\s<>]+)>/i.exec(text.slice(index)) : null;
    if (autolink?.[1]) {
      flush();
      nodes.push({
        type: 'link',
        href: autolink[1],
        children: [{ type: 'text', text: autolink[1] }],
      });
      index += autolink[0].length;
      continue;
    }

    buffer += char;
    index++;
  }
  flush();
  return nodes;
};

/** The lines of a paragraph: a line that ends with two spaces or a backslash breaks the line. */
const paragraphInline = (lines: string[]): Inline[] =>
  lines.flatMap((line, index) => {
    const last = index === lines.length - 1;
    const hard = !last && /(?: {2,}|\\)$/.test(line);
    const text = line.replace(/(?: {2,}|\\)$/, '').trim();
    const separator: Inline[] = last
      ? []
      : [hard ? { type: 'break' } : { type: 'text', text: ' ' }];
    return [...parseInline(text), ...separator];
  });

/** The text of the nodes, with no markup: the text of a heading in the table of contents. */
export const plainText = (nodes: Inline[]): string =>
  nodes
    .map(node => {
      if (node.type === 'text' || node.type === 'code') return node.text;
      if (node.type === 'break') return ' ';
      return plainText(node.children);
    })
    .join('');

// Blocks -------------------------------------------------------------------------------------

const slug = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'section';

const cells = (row: string): string[] => {
  const trimmed = row
    .trim()
    .replace(/^\|/, '')
    .replace(/(?<!\\)\|$/, '');
  return trimmed.split(/(?<!\\)\|/).map(cell => cell.trim());
};

const alignOf = (cell: string): CellAlign => {
  const left = cell.startsWith(':');
  const right = cell.endsWith(':');
  if (left && right) return 'center';
  if (right) return 'right';
  return left ? 'left' : null;
};

/** A line that starts a block of another kind ends a paragraph. */
const startsBlock = (line: string, next: string | undefined): boolean =>
  FENCE.test(line) ||
  HEADING.test(line) ||
  RULE.test(line) ||
  QUOTE.test(line) ||
  ITEM.test(line) ||
  (line.includes('|') && next !== undefined && TABLE_RULE.test(next) && next.includes('-'));

export const parseMarkdown = (source: string): Block[] => {
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  const raw: Array<Block | { type: 'heading-raw'; depth: number; text: string }> = [];

  let index = 0;
  while (index < lines.length) {
    const line = lines[index] ?? '';
    const next = lines[index + 1];
    if (!line.trim()) {
      index++;
      continue;
    }

    const fence = FENCE.exec(line);
    if (fence?.[1]) {
      const marker = fence[1];
      const body: string[] = [];
      index++;
      while (index < lines.length && !(lines[index] ?? '').trim().startsWith(marker)) {
        body.push(lines[index] ?? '');
        index++;
      }
      raw.push({ type: 'code', text: body.join('\n') });
      index++;
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading?.[1]) {
      raw.push({ type: 'heading-raw', depth: heading[1].length, text: heading[2] ?? '' });
      index++;
      continue;
    }

    if (RULE.test(line)) {
      raw.push({ type: 'rule' });
      index++;
      continue;
    }

    if (QUOTE.test(line)) {
      const body: string[] = [];
      while (index < lines.length && QUOTE.test(lines[index] ?? '')) {
        body.push(QUOTE.exec(lines[index] ?? '')?.[1] ?? '');
        index++;
      }
      const paragraphs = body
        .join('\n')
        .split(/\n\s*\n/)
        .filter(part => part.trim())
        .map(part => paragraphInline(part.split('\n')));
      raw.push({ type: 'quote', paragraphs });
      continue;
    }

    const item = ITEM.exec(line);
    if (item?.[1]) {
      const ordered = /\d/.test(item[1]);
      const items: string[][] = [];
      while (index < lines.length) {
        const current = lines[index] ?? '';
        const match = ITEM.exec(current);
        if (match?.[1] && /\d/.test(match[1]) === ordered) {
          items.push([match[2] ?? '']);
        } else if (current.trim() && /^\s+/.test(current) && items.length > 0) {
          items[items.length - 1]?.push(current.trim());
        } else if (!current.trim() && ITEM.test(lines[index + 1] ?? '')) {
          // A blank line between two items keeps the list.
        } else {
          break;
        }
        index++;
      }
      raw.push({
        type: 'list',
        ordered,
        start: ordered ? Number.parseInt(item[1], 10) : 1,
        items: items.map(paragraphInline),
      });
      continue;
    }

    if (line.includes('|') && next !== undefined && TABLE_RULE.test(next) && next.includes('-')) {
      const head = cells(line);
      const align = cells(next).map(alignOf);
      const rows: Inline[][][] = [];
      index += 2;
      while (index < lines.length && (lines[index] ?? '').includes('|')) {
        const row = cells(lines[index] ?? '');
        rows.push(head.map((_, column) => parseInline(row[column] ?? '')));
        index++;
      }
      raw.push({ type: 'table', align, head: head.map(text => parseInline(text)), rows });
      continue;
    }

    const body = [line];
    index++;
    while (index < lines.length) {
      const current = lines[index] ?? '';
      if (!current.trim() || startsBlock(current, lines[index + 1])) break;
      body.push(current);
      index++;
    }
    raw.push({ type: 'paragraph', children: paragraphInline(body) });
  }

  // A text that opens with its only heading of the top level gives it a title: the page shows
  // its own title, so this heading goes, and the sections under it fill the contents.
  const first = raw[0];
  if (
    first?.type === 'heading-raw' &&
    raw.slice(1).every(block => block.type !== 'heading-raw' || block.depth > first.depth)
  ) {
    raw.shift();
  }

  // The highest heading of the text is an h2, under the title of the page.
  const depths = raw.flatMap(block => (block.type === 'heading-raw' ? [block.depth] : []));
  const top = Math.min(...depths);
  const ids = new Map<string, number>();
  return raw.map(block => {
    if (block.type !== 'heading-raw') return block;
    const children = parseInline(block.text);
    const text = plainText(children);
    const base = slug(text);
    const count = (ids.get(base) ?? 0) + 1;
    ids.set(base, count);
    const level = Math.min(2 + block.depth - top, 4) as 2 | 3 | 4;
    return { type: 'heading', level, id: count === 1 ? base : `${base}-${count}`, text, children };
  });
};

/** The headings of level 2: the table of contents. */
export const tableOfContents = (blocks: Block[]): Heading[] =>
  blocks.flatMap(block =>
    block.type === 'heading' && block.level === 2 ? [{ id: block.id, text: block.text }] : [],
  );
