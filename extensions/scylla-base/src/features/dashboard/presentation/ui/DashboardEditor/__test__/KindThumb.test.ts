import { describe, it, expect } from 'vitest';
import { render } from '@test/render.ts';
import { KINDS } from '@base/features/dashboard/presentation/presenters/widget-catalog.presenter.ts';
import KindThumb from '../KindThumb.svelte';

const artOf = (kind: (typeof KINDS)[number]['kind']) => {
  const { container, unmount } = render(KindThumb, { props: { kind } });
  const svg = container.querySelector('svg[data-art]');
  const markup = svg?.innerHTML.replace(/<!--.*?-->/g, '').trim() ?? '';
  unmount();
  return markup;
};

describe('KindThumb', () => {
  it('draws a picture for each kind of the palette', () => {
    for (const { kind } of KINDS) expect(artOf(kind), kind).not.toBe('');
  });

  it('gives each kind its own picture', () => {
    const pictures = KINDS.map(({ kind }) => artOf(kind));
    expect(new Set(pictures).size).toBe(KINDS.length);
  });
});
