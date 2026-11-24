// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { parseInline, parseMarkdown, tableOfContents } from '../markdown.presenter.ts';

describe('parseMarkdown', () => {
  it('makes the highest heading an h2, with a unique id, and lists the h2 in the contents', () => {
    const blocks = parseMarkdown('# Who we are\n\ntext\n\n## Data\n\n# Who we are\n#### Deep');

    expect(blocks.filter(block => block.type === 'heading')).toEqual([
      expect.objectContaining({ level: 2, id: 'who-we-are', text: 'Who we are' }),
      expect.objectContaining({ level: 3, id: 'data' }),
      expect.objectContaining({ level: 2, id: 'who-we-are-2' }),
      expect.objectContaining({ level: 4, id: 'deep' }),
    ]);
    expect(tableOfContents(blocks)).toEqual([
      { id: 'who-we-are', text: 'Who we are' },
      { id: 'who-we-are-2', text: 'Who we are' },
    ]);
  });

  it('drops a first heading that is the only one of its level: the page has its own title', () => {
    const blocks = parseMarkdown('# Privacy policy\n\nintro\n\n## Who we are\n\n## Your rights');

    expect(blocks[0]).toEqual(expect.objectContaining({ type: 'paragraph' }));
    expect(tableOfContents(blocks).map(heading => heading.text)).toEqual([
      'Who we are',
      'Your rights',
    ]);
    expect(parseMarkdown('# Terms').filter(block => block.type === 'heading')).toEqual([]);
  });

  it('joins the lines of a paragraph, and breaks a line that ends with two spaces', () => {
    expect(parseMarkdown('Acme SAS  \n1 rue de la Paix\nParis')).toEqual([
      {
        type: 'paragraph',
        children: [
          { type: 'text', text: 'Acme SAS' },
          { type: 'break' },
          { type: 'text', text: '1 rue de la Paix' },
          { type: 'text', text: ' ' },
          { type: 'text', text: 'Paris' },
        ],
      },
    ]);
  });

  it('reads lists, quotes, rules and code', () => {
    const blocks = parseMarkdown(
      '- one\n  more\n- two\n\n3. three\n\n> quoted\n\n---\n\n```\n<b>\n```',
    );

    expect(blocks.map(block => block.type)).toEqual(['list', 'list', 'quote', 'rule', 'code']);
    expect(blocks[0]).toMatchObject({
      ordered: false,
      items: [[{ text: 'one' }, {}, { text: 'more' }], [{ text: 'two' }]],
    });
    expect(blocks[1]).toMatchObject({ ordered: true, start: 3 });
    expect(blocks[4]).toEqual({ type: 'code', text: '<b>' });
  });

  it('reads a table with its alignment', () => {
    const [table] = parseMarkdown('| Data | Retention |\n|:---|---:|\n| IP | 30 days |');

    expect(table).toEqual({
      type: 'table',
      align: ['left', 'right'],
      head: [[{ type: 'text', text: 'Data' }], [{ type: 'text', text: 'Retention' }]],
      rows: [[[{ type: 'text', text: 'IP' }], [{ type: 'text', text: '30 days' }]]],
    });
  });
});

describe('parseInline', () => {
  it('reads bold, italic and code, and keeps an underscore in a word', () => {
    expect(parseInline('**a** *b* `c` snake_case_name')).toEqual([
      { type: 'strong', children: [{ type: 'text', text: 'a' }] },
      { type: 'text', text: ' ' },
      { type: 'em', children: [{ type: 'text', text: 'b' }] },
      { type: 'text', text: ' ' },
      { type: 'code', text: 'c' },
      { type: 'text', text: ' snake_case_name' },
    ]);
  });

  it('keeps a safe link, and makes another link text', () => {
    expect(
      parseInline('[mail](mailto:dpo@acme.example) [x](javascript:void) <https://a.example>'),
    ).toEqual([
      { type: 'link', href: 'mailto:dpo@acme.example', children: [{ type: 'text', text: 'mail' }] },
      { type: 'text', text: ' ' },
      { type: 'text', text: 'x' },
      { type: 'text', text: ' ' },
      {
        type: 'link',
        href: 'https://a.example',
        children: [{ type: 'text', text: 'https://a.example' }],
      },
    ]);
  });

  it('keeps markup as text: the view never renders HTML', () => {
    expect(parseInline('<script>alert(1)</script>')).toEqual([
      { type: 'text', text: '<script>alert(1)</script>' },
    ]);
  });
});
