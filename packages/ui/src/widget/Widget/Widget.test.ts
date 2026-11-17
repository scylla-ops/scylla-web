import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/svelte';
import { render, textSnippet } from '@test/render.ts';
import Widget from './Widget.svelte';

describe('Widget', () => {
  it('is a region named by its title, with its content', () => {
    render(Widget, { size: 's', title: 'Success rate', children: textSnippet('89 %') });

    const region = screen.getByRole('region', { name: 'Success rate' });
    expect(region).toHaveTextContent('89 %');
    expect(screen.getByRole('heading', { name: 'Success rate' })).toBeInTheDocument();
  });

  it('shows the meta after the title and the aside at the end of the header', () => {
    render(Widget, {
      size: 'm',
      title: 'Needs you',
      meta: 'open now',
      aside: textSnippet('2 new'),
      children: textSnippet('content'),
    });

    const header = screen.getByRole('heading', { name: 'Needs you' }).parentElement!;
    expect(header).toHaveTextContent('Needs you open now 2 new');
  });

  it('takes the cells of its size on the two grids', () => {
    render(Widget, { size: 'l', title: 'Pipelines', children: textSnippet('content') });

    const region = screen.getByRole('region', { name: 'Pipelines' });
    expect(region).toHaveAttribute('data-size', 'l');
    expect(region.style.getPropertyValue('--widget-columns')).toBe('2');
    expect(region.style.getPropertyValue('--widget-rows')).toBe('4');
    expect(region.style.getPropertyValue('--widget-columns-wide')).toBe('4');
    expect(region.style.getPropertyValue('--widget-rows-wide')).toBe('4');
  });
});
