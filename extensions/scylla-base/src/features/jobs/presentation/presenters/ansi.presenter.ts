/**
 * The colors of a terminal, as the log shows them. Black and white take the color of the text,
 * so a line stays readable in the two themes. Bright black is `gray`.
 */
export type AnsiColor = 'red' | 'green' | 'yellow' | 'blue' | 'magenta' | 'cyan' | 'gray';

export interface AnsiStyle {
  fg?: AnsiColor;
  bg?: AnsiColor;
  bold?: boolean;
  dim?: boolean;
  /** The color of the text becomes the background. */
  inverse?: boolean;
  /** The target of an OSC 8 link. */
  href?: string;
}

/** A part of the clean text of a line, in one style. `from` and `to` are offsets in the text. */
export interface AnsiSpan extends AnsiStyle {
  from: number;
  to: number;
}

/** A line of a log with no escape code: its text, and the styles of its parts. */
export interface AnsiLine {
  text: string;
  spans: AnsiSpan[];
}

/** The style that a line leaves open: a terminal keeps it until a reset, also on the next line. */
export type AnsiState = Readonly<AnsiStyle>;

export const INITIAL_ANSI_STATE: AnsiState = {};

const ESC = '\x1b';
const CSI_C1 = '\x9b';
/** A character that the parser reads: an escape code, `\r`, `\b` or another control. */
const isControl = (code: number) =>
  (code < 0x20 && code !== 0x09 && code !== 0x0a) || code === 0x7f || code === 0x9b;

const hasControl = (raw: string) => {
  for (let index = 0; index < raw.length; index += 1) {
    if (isControl(raw.charCodeAt(index))) return true;
  }
  return false;
};

const BASE: (AnsiColor | undefined)[] = [
  undefined,
  'red',
  'green',
  'yellow',
  'blue',
  'magenta',
  'cyan',
  undefined,
];
const BRIGHT: (AnsiColor | undefined)[] = ['gray', ...BASE.slice(1)];

/** The colors of xterm. The nearest one gives the color of a 256 color or of a true color. */
const PALETTE: [AnsiColor | undefined, number, number, number][] = [
  [undefined, 0, 0, 0],
  ['red', 205, 0, 0],
  ['green', 0, 205, 0],
  ['yellow', 205, 205, 0],
  ['blue', 0, 0, 238],
  ['magenta', 205, 0, 205],
  ['cyan', 0, 205, 205],
  ['gray', 127, 127, 127],
  [undefined, 229, 229, 229],
];

const CUBE_LEVELS = [0, 95, 135, 175, 215, 255];

export const nearestAnsiColor = (r: number, g: number, b: number): AnsiColor | undefined => {
  let best: AnsiColor | undefined;
  let bestDistance = Infinity;
  for (const [color, pr, pg, pb] of PALETTE) {
    const distance = (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = color;
    }
  }
  return best;
};

const color256 = (n: number): AnsiColor | undefined => {
  if (!Number.isInteger(n) || n < 0 || n > 255) return undefined;
  if (n < 8) return BASE[n];
  if (n < 16) return BRIGHT[n - 8];
  if (n < 232) {
    const index = n - 16;
    return nearestAnsiColor(
      CUBE_LEVELS[Math.floor(index / 36)],
      CUBE_LEVELS[Math.floor(index / 6) % 6],
      CUBE_LEVELS[index % 6],
    );
  }
  const level = 8 + (n - 232) * 10;
  return nearestAnsiColor(level, level, level);
};

const isPlain = (style: AnsiStyle): boolean =>
  !style.fg && !style.bg && !style.bold && !style.dim && !style.inverse && !style.href;

const sameStyle = (a: AnsiStyle, b: AnsiStyle): boolean =>
  a.fg === b.fg &&
  a.bg === b.bg &&
  !a.bold === !b.bold &&
  !a.dim === !b.dim &&
  !a.inverse === !b.inverse &&
  a.href === b.href;

/** Only the keys that are set: a span compares and prints with no `undefined` field. */
const compact = (style: AnsiStyle): AnsiStyle => {
  const result: AnsiStyle = {};
  if (style.fg) result.fg = style.fg;
  if (style.bg) result.bg = style.bg;
  if (style.bold) result.bold = true;
  if (style.dim) result.dim = true;
  if (style.inverse) result.inverse = true;
  if (style.href) result.href = style.href;
  return result;
};

/** The color of an extended code (`38;5;n`, `38;2;r;g;b`, or the same with colons). */
const extendedColor = (parts: number[]): { color: AnsiColor | undefined; used: number } => {
  if (parts[0] === 5) return { color: color256(parts[1]), used: 2 };
  if (parts[0] === 2) {
    const [r, g, b] = parts.slice(1, 4);
    const valid = [r, g, b].every(value => Number.isFinite(value));
    return { color: valid ? nearestAnsiColor(r, g, b) : undefined, used: 4 };
  }
  return { color: undefined, used: 0 };
};

/** The style after a Select Graphic Rendition code (`ESC [ … m`). */
const applySgr = (style: AnsiStyle, params: string): AnsiStyle => {
  const next: AnsiStyle = { ...style };
  const codes = params.split(';');

  for (let index = 0; index < codes.length; index += 1) {
    const code = codes[index];

    if (code.includes(':')) {
      // `38:2::255:0:0`: the id of the color space is empty or missing.
      const sub = code.split(':').map(part => (part === '' ? NaN : Number(part)));
      const target = sub[0];
      if (target === 38 || target === 48) {
        const values =
          sub[1] === 2 ? [2, ...sub.slice(2).filter(Number.isFinite).slice(-3)] : sub.slice(1);
        const { color } = extendedColor(values);
        if (target === 38) next.fg = color;
        else next.bg = color;
      }
      continue;
    }

    const n = code === '' ? 0 : Number(code);
    if (n === 0) {
      // A reset ends the style, not the link: OSC 8 closes it.
      const href = next.href;
      for (const key of Object.keys(next) as (keyof AnsiStyle)[]) delete next[key];
      if (href) next.href = href;
    } else if (n === 1) next.bold = true;
    else if (n === 2) next.dim = true;
    else if (n === 22) {
      next.bold = false;
      next.dim = false;
    } else if (n === 7) next.inverse = true;
    else if (n === 27) next.inverse = false;
    else if (n >= 30 && n <= 37) next.fg = BASE[n - 30];
    else if (n >= 90 && n <= 97) next.fg = BRIGHT[n - 90];
    else if (n === 39) next.fg = undefined;
    else if (n >= 40 && n <= 47) next.bg = BASE[n - 40];
    else if (n >= 100 && n <= 107) next.bg = BRIGHT[n - 100];
    else if (n === 49) next.bg = undefined;
    else if (n === 38 || n === 48) {
      const { color, used } = extendedColor(codes.slice(index + 1).map(Number));
      if (n === 38) next.fg = color;
      else next.bg = color;
      index += used;
    }
    // Italic, underline, blink and the other codes do not show.
  }

  return compact(next);
};

/** The index after the string terminator (BEL or `ESC \`) from `start`, or the end of the line. */
const afterTerminator = (raw: string, start: number): { end: number; next: number } => {
  for (let index = start; index < raw.length; index += 1) {
    if (raw[index] === '\x07') return { end: index, next: index + 1 };
    if (raw[index] === ESC && raw[index + 1] === '\\') return { end: index, next: index + 2 };
  }
  return { end: raw.length, next: raw.length };
};

/**
 * Reads one line of a log as a terminal shows it. The escape codes of a color (8 colors, 256
 * colors, true colors), bold, dim and inverse become spans; an OSC 8 link keeps its text as a
 * link; the other codes (cursor moves, erase, window titles) go away. A carriage return keeps
 * only the last state of the line (a progress bar), and a backspace removes one character.
 * `state` is the style that the line before left open.
 */
export const parseAnsiLine = (
  raw: string,
  state: AnsiState = INITIAL_ANSI_STATE,
): { line: AnsiLine; state: AnsiState } => {
  if (!hasControl(raw)) {
    return {
      line: {
        text: raw,
        spans: isPlain(state) || !raw ? [] : [{ from: 0, to: raw.length, ...state }],
      },
      state,
    };
  }

  let text = '';
  const spans: AnsiSpan[] = [];
  let style: AnsiStyle = state;
  let runStart = 0;
  let returned = false;

  const closeRun = () => {
    if (text.length <= runStart || isPlain(style)) return;
    const last = spans.at(-1);
    if (last && last.to === runStart && sameStyle(last, style)) last.to = text.length;
    else spans.push({ from: runStart, to: text.length, ...style });
  };

  const setStyle = (next: AnsiStyle) => {
    if (sameStyle(next, style)) return;
    closeRun();
    runStart = text.length;
    style = next;
  };

  const write = (chars: string) => {
    if (returned) {
      // The line starts again: the text before the carriage return is gone.
      text = '';
      spans.length = 0;
      runStart = 0;
      returned = false;
    }
    text += chars;
  };

  const backspace = () => {
    if (!text) return;
    closeRun();
    text = text.slice(0, -1);
    const last = spans.at(-1);
    if (last && last.to > text.length) {
      last.to = text.length;
      if (last.to <= last.from) spans.pop();
    }
    runStart = text.length;
  };

  let index = 0;
  while (index < raw.length) {
    const char = raw[index];

    if (char === ESC || char === CSI_C1) {
      const isCsi = char === CSI_C1 || raw[index + 1] === '[';
      if (isCsi) {
        const start = index + (char === CSI_C1 ? 1 : 2);
        let end = start;
        while (end < raw.length && (raw.charCodeAt(end) < 0x40 || raw.charCodeAt(end) > 0x7e)) {
          end += 1;
        }
        if (raw[end] === 'm') setStyle(applySgr(style, raw.slice(start, end)));
        index = end + 1;
        continue;
      }

      const kind = raw[index + 1];
      if (kind === ']') {
        const { end, next } = afterTerminator(raw, index + 2);
        const body = raw.slice(index + 2, end);
        if (body.startsWith('8;')) {
          const uri = body.split(';').slice(2).join(';');
          setStyle(compact({ ...style, href: uri || undefined }));
        }
        index = next;
        continue;
      }
      if (kind === 'P' || kind === 'X' || kind === '^' || kind === '_') {
        index = afterTerminator(raw, index + 2).next;
        continue;
      }
      // A charset (`ESC ( B`) has one more character; the other codes have one.
      index += kind !== undefined && '()*+#%'.includes(kind) ? 3 : 2;
      continue;
    }

    if (char === '\r') {
      returned = true;
      index += 1;
      continue;
    }
    if (char === '\b') {
      backspace();
      index += 1;
      continue;
    }

    const code = raw.charCodeAt(index);
    if ((code < 0x20 && char !== '\t') || code === 0x7f) {
      index += 1;
      continue;
    }

    // A run of printable characters up to the next control.
    let end = index + 1;
    while (end < raw.length) {
      const next = raw.charCodeAt(end);
      if ((next < 0x20 && next !== 0x09) || next === 0x7f || next === 0x9b) break;
      end += 1;
    }
    write(raw.slice(index, end));
    index = end;
  }

  closeRun();
  return { line: { text, spans }, state: style };
};
