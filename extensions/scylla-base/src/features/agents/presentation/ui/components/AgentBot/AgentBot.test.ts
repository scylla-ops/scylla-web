import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/svelte';
import { render } from '@test/render.ts';
import type { AgentState } from '@base/features/agents/domain/entities/agent.entity.ts';
import { compile } from 'svelte/compiler';
import AgentBot from './AgentBot.svelte';
import source from './AgentBot.svelte?raw';

/** `css: false` in the test config leaves the rendered tile unstyled: the styles come from the compiler. */
const styles = compile(source, { filename: 'AgentBot.svelte' }).css?.code ?? '';

const LABELS: Record<AgentState, string> = {
  idle: 'Agent idle',
  running: 'Agent running a job',
  offline: 'Agent offline',
  never: 'Agent never connected',
  disabled: 'Agent disabled',
};

describe('AgentBot', () => {
  it.each(Object.entries(LABELS) as [AgentState, string][])(
    'names the %s state for a screen reader and marks the tile with it',
    (state, label) => {
      render(AgentBot, { state });

      expect(screen.getByRole('img', { name: label })).toHaveAttribute('data-state', state);
    },
  );

  it('draws one element per moving part, all inside the body', () => {
    const { container } = render(AgentBot, { state: 'idle' });

    const body = container.querySelector('g.body');
    for (const part of ['antenna', 'head', 'ear-l', 'ear-r', 'eye-l', 'eye-r']) {
      expect(body?.querySelector(`.${part}`), part).not.toBeNull();
    }
  });

  it('adds the pulse ring while running and the signal arcs while never connected', () => {
    const { container, unmount } = render(AgentBot, { state: 'running' });
    expect(container.querySelector('.ring')).not.toBeNull();
    expect(container.querySelectorAll('.arc')).toHaveLength(0);
    unmount();

    const never = render(AgentBot, { state: 'never' });
    expect(never.container.querySelectorAll('.arc')).toHaveLength(2);
    expect(never.container.querySelector('.ring')).toBeNull();
  });

  it('lets the offline bot snore at the detail size only', () => {
    const { container, unmount } = render(AgentBot, { state: 'offline', size: 'lg' });
    expect(container.querySelectorAll('.z')).toHaveLength(2);
    unmount();

    const small = render(AgentBot, { state: 'offline', size: 'sm' });
    expect(small.container.querySelectorAll('.z')).toHaveLength(0);
  });

  it('hides the drawing from assistive technology: the label says it all', () => {
    const { container } = render(AgentBot, { state: 'idle' });

    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('stops every animation in its compiled styles when the user asks for reduced motion', () => {
    const reduced = styles.slice(styles.indexOf('@media (prefers-reduced-motion: reduce)'));

    expect(reduced).toMatch(
      /^@media \(prefers-reduced-motion: reduce\) \{[^@]*animation: none !important/,
    );
  });

  it.each([
    ['idle', '2.4s'],
    ['running', '1.2s'],
    ['offline', '2.4s'],
    ['never', '2.4s'],
    ['disabled', '2.4s'],
  ])('moves the %s bot in its compiled styles, %s per loop', (state, duration) => {
    const rule = new RegExp(
      `\\[data-state='${state}'\\][^{]*\\.body[^{]*\\{[^}]*animation: [\\w-]+ ${duration}`,
    );

    expect(styles).toMatch(rule);
  });
});
