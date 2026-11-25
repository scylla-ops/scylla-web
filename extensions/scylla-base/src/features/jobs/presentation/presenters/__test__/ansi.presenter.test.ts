// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { nearestAnsiColor, parseAnsiLine } from '../ansi.presenter.ts';

const ESC = '\x1b';
const parse = (raw: string) => parseAnsiLine(raw).line;

describe('parseAnsiLine', () => {
  it('keeps a line with no control character as it is, with no span', () => {
    expect(parse('cargo build --release')).toEqual({ text: 'cargo build --release', spans: [] });
  });

  it('gives the 8 colors of the text, and the bright ones, as spans of the clean text', () => {
    expect(parse(`${ESC}[31merror${ESC}[0m: ${ESC}[92mok${ESC}[39m`)).toEqual({
      text: 'error: ok',
      spans: [
        { from: 0, to: 5, fg: 'red' },
        { from: 7, to: 9, fg: 'green' },
      ],
    });
  });

  it('shows black and white in the color of the text, and bright black as gray', () => {
    expect(parse(`${ESC}[30mblack ${ESC}[37mwhite ${ESC}[90mgray`).spans).toEqual([
      { from: 12, to: 16, fg: 'gray' },
    ]);
  });

  it('reads bold, dim and their reset', () => {
    expect(parse(`${ESC}[1mbold${ESC}[22m ${ESC}[2mdim${ESC}[22m plain`)).toEqual({
      text: 'bold dim plain',
      spans: [
        { from: 0, to: 4, bold: true },
        { from: 5, to: 8, dim: true },
      ],
    });
  });

  it('reads inverse, and the background colors', () => {
    expect(parse(`${ESC}[7;33m warn ${ESC}[27;44m blue ${ESC}[49m`).spans).toEqual([
      { from: 0, to: 6, fg: 'yellow', inverse: true },
      { from: 6, to: 12, fg: 'yellow', bg: 'blue' },
    ]);
  });

  it('ends each style at a reset, with `ESC[0m` or `ESC[m`', () => {
    const { spans } = parse(`${ESC}[1;31mA${ESC}[mB${ESC}[35mC${ESC}[0mD`);
    expect(spans).toEqual([
      { from: 0, to: 1, fg: 'red', bold: true },
      { from: 2, to: 3, fg: 'magenta' },
    ]);
  });

  it('takes the nearest base color of a 256 color and of a true color', () => {
    expect(parse(`${ESC}[38;5;196mred${ESC}[38;5;46mgreen${ESC}[38;5;244mgray`).spans).toEqual([
      { from: 0, to: 3, fg: 'red' },
      { from: 3, to: 8, fg: 'green' },
      { from: 8, to: 12, fg: 'gray' },
    ]);
    expect(parse(`${ESC}[38;2;0;200;210mcyan${ESC}[48;2;180;0;190mbg`).spans).toEqual([
      { from: 0, to: 4, fg: 'cyan' },
      { from: 4, to: 6, fg: 'cyan', bg: 'magenta' },
    ]);
    expect(parse(`${ESC}[38:2::230:0:0mred`).spans).toEqual([{ from: 0, to: 3, fg: 'red' }]);
  });

  it('keeps the base colors of the 256 colors, and the text color for black and white', () => {
    expect(nearestAnsiColor(0, 0, 0)).toBeUndefined();
    expect(nearestAnsiColor(255, 255, 255)).toBeUndefined();
    expect(nearestAnsiColor(30, 30, 240)).toBe('blue');
    expect(parse(`${ESC}[38;5;3myellow`).spans).toEqual([{ from: 0, to: 6, fg: 'yellow' }]);
  });

  it('keeps only the last state of a line after a carriage return, as a progress bar', () => {
    expect(parse('10%\r50%\r100% done')).toEqual({ text: '100% done', spans: [] });
    expect(parse(`${ESC}[31mold\r${ESC}[32mnew`)).toEqual({
      text: 'new',
      spans: [{ from: 0, to: 3, fg: 'green' }],
    });
  });

  it('keeps the text of a line that ends with a carriage return (CRLF)', () => {
    expect(parse('compiled\r').text).toBe('compiled');
  });

  it('removes one character for each backspace', () => {
    expect(parse('abcd\b\bX').text).toBe('abX');
    expect(parse(`${ESC}[31mab${ESC}[0m\b\bcd`)).toEqual({ text: 'cd', spans: [] });
  });

  it('keeps the text of an OSC 8 link as a link, with its target', () => {
    const line = parse(
      `see ${ESC}]8;;https://scylla.example/docs${ESC}\\the docs${ESC}]8;;${ESC}\\ now`,
    );
    expect(line).toEqual({
      text: 'see the docs now',
      spans: [{ from: 4, to: 12, href: 'https://scylla.example/docs' }],
    });
    // The BEL form, and a link with a color in it.
    expect(parse(`${ESC}]8;id=1;https://a.example\x07${ESC}[31mred${ESC}]8;;\x07`).spans).toEqual([
      { from: 0, to: 3, fg: 'red', href: 'https://a.example' },
    ]);
  });

  it('removes the codes that are not a style: cursor moves, erase, window titles', () => {
    expect(
      parse(`${ESC}[2K${ESC}[1G${ESC}]0;my title\x07${ESC}[?25lStep 1${ESC}[3A${ESC}(B${ESC}=`),
    ).toEqual({ text: 'Step 1', spans: [] });
    expect(parse(`a\x00b\x07c\x7fd\te`).text).toBe('abcd\te');
  });

  it('keeps a style open to the next line until a reset, as a terminal does', () => {
    const first = parseAnsiLine(`${ESC}[33mstart`);
    const second = parseAnsiLine('middle', first.state);
    const third = parseAnsiLine(`end${ESC}[0m after`, second.state);

    expect(second.line.spans).toEqual([{ from: 0, to: 6, fg: 'yellow' }]);
    expect(third.line).toEqual({ text: 'end after', spans: [{ from: 0, to: 3, fg: 'yellow' }] });
    expect(third.state).toEqual({});
  });
});
