import { describe, it, expect } from 'vitest';
import { render } from '@test/render.ts';
import LogoMark from './LogoMark.svelte';

describe('LogoMark', () => {
  it('draws the four dots of the logo, clockwise from the top left', () => {
    const { container } = render(LogoMark);

    const dots = [...container.querySelectorAll('circle')].map(dot => [
      dot.getAttribute('cx'),
      dot.getAttribute('cy'),
    ]);
    expect(dots).toEqual([
      ['14', '14'],
      ['58', '14'],
      ['58', '58'],
      ['14', '58'],
    ]);
  });

  it('gives its state to the dots, idle by default', async () => {
    const { container, rerender } = render(LogoMark);
    const mark = container.querySelector('[data-slot="logo-mark"]');
    expect(mark).toHaveAttribute('data-state', 'idle');
    expect(mark).toHaveAttribute('aria-hidden', 'true');

    await rerender({ state: 'lit' });

    expect(mark).toHaveAttribute('data-state', 'lit');
  });
});
