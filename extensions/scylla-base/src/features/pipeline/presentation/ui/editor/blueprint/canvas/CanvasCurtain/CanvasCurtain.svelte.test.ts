import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync } from 'svelte';
import { screen } from '@testing-library/svelte';
import { render } from '@test/render.ts';
import { createCanvasCurtain, type CanvasCurtain } from './canvas-curtain.state.svelte.ts';
import CanvasCurtainView from './CanvasCurtain.svelte';

let cleanup: () => void = () => {};

const renderCurtain = () => {
  const state = $state({ ready: false, failed: false });
  let curtain!: CanvasCurtain;
  cleanup = $effect.root(() => {
    curtain = createCanvasCurtain({ ready: () => state.ready, failed: () => state.failed });
  });
  render(CanvasCurtainView, { curtain, onRetry: vi.fn() });
};

const advance = (ms: number) => {
  vi.advanceTimersByTime(ms);
  flushSync();
};

beforeEach(() => vi.useFakeTimers());

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('CanvasCurtain', () => {
  it('shows the logo after 300 ms only', () => {
    renderCurtain();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    advance(300);

    expect(screen.getByRole('status', { name: 'Loading the pipeline…' })).toBeInTheDocument();
  });

  it('says under the logo that the load takes long, after 4 s', () => {
    renderCurtain();
    advance(3999);
    expect(screen.queryByText('Taking longer than usual…')).not.toBeInTheDocument();

    advance(1);

    expect(screen.getByText('Taking longer than usual…')).toBeInTheDocument();
  });
});
