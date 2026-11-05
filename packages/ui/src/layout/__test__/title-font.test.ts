// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const WORKSPACE = join(dirname(fileURLToPath(import.meta.url)), '../../../../..');
const TITLE = /<(h[1-6]|CardTitle|DialogTitle|AlertDialogTitle)\b[^>]*?\bclass="([^"]*)"/g;
const FONT =
  /(?:^|\s)(?:\S*:)?font-(?:display|sans|thin|light|normal|medium|semibold|bold|black)(?=\s|$)/;
const PAGE_TITLE_SIZE =
  /(?:^|\s)(?:\S*:)?(?:text-(?:xs|sm|base|lg|\d?xl|\[[\d.]+(?:px|rem)\])|leading-\S+|tracking-\S+)(?=\s|$)/;

const sources = ['apps', 'packages', 'sdks', 'extensions'].flatMap(dir =>
  readdirSync(join(WORKSPACE, dir), { recursive: true, encoding: 'utf8' })
    .map(path => `${dir}/${path.replaceAll('\\', '/')}`)
    .filter(path => path.endsWith('.svelte') && !/node_modules|dist\//.test(path)),
);

const titles = sources.flatMap(path =>
  [...readFileSync(join(WORKSPACE, path), 'utf8').matchAll(TITLE)].map(([, tag, classes]) => ({
    tag,
    classes,
    at: `${path}: <${tag} class="${classes}">`,
  })),
);

describe('a title', () => {
  it('is searched in every component, the list header included', () => {
    expect(titles.map(title => title.at).join('\n')).toContain('FeatureHeader.svelte');
  });

  it('sets no font and no weight: the base rule of `styles.css` gives them', () => {
    const own = titles.filter(title => FONT.test(title.classes)).map(title => title.at);

    expect(own, 'remove the class: a utility replaces the base rule').toEqual([]);
  });

  it('sets no size when it is a page title: all pages show the same one', () => {
    const own = titles
      .filter(title => title.tag === 'h1' && PAGE_TITLE_SIZE.test(title.classes))
      .map(title => title.at);

    expect(own, 'remove the class: a utility replaces the base rule').toEqual([]);
  });
});
