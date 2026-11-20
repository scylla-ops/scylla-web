import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { render } from '@test/render.ts';
import SegmentedControlFixture from './SegmentedControl.fixture.svelte';
import type { SegmentedOption } from './segmented-control.ts';
import { REDUCED_MS, SETTLE, STRETCH_MS, type Box } from './thumb-motion.ts';

const OPTIONS: SegmentedOption[] = [
  { value: 'all', label: 'All', count: 3 },
  { value: 'online', label: 'Online', count: 2, dot: { color: 'text-success', pulse: true } },
  { value: 'offline', label: 'Offline', count: 0 },
];

const BOXES: Record<string, Box> = {
  all: { x: 3, y: 3, width: 48, height: 28 },
  online: { x: 53, y: 3, width: 80, height: 28 },
  offline: { x: 135, y: 3, width: 76, height: 28 },
};

const OFFSETS = {
  offsetLeft: 'x',
  offsetTop: 'y',
  offsetWidth: 'width',
  offsetHeight: 'height',
} as const;

const setReducedMotion = (reduce: boolean) => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: reduce && query === '(prefers-reduced-motion: reduce)',
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
};

const thumb = () => document.querySelector<HTMLElement>('[data-part="segmented-thumb"]')!;

const thumbBox = (): Box => ({
  x: parseFloat(thumb().style.left),
  y: parseFloat(thumb().style.top),
  width: parseFloat(thumb().style.width),
  height: parseFloat(thumb().style.height),
});

const lastMove = () => {
  const animate = vi.mocked(Element.prototype.animate).mock;
  const moves = animate.calls.filter((_, i) => animate.contexts[i] === thumb());
  return moves.at(-1) ?? null;
};

beforeEach(() => {
  for (const [property, key] of Object.entries(OFFSETS)) {
    vi.spyOn(HTMLElement.prototype, property as keyof typeof OFFSETS, 'get').mockImplementation(
      function (this: HTMLElement) {
        return BOXES[this.dataset.value ?? '']?.[key] ?? 0;
      },
    );
  }
});

afterEach(() => vi.restoreAllMocks());

describe('SegmentedControl', () => {
  it('is a group of radios, each named by its label and its count', () => {
    render(SegmentedControlFixture, { options: OPTIONS, initial: 'all' });

    expect(screen.getByRole('group', { name: 'Status' })).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(3);
    expect(screen.getByRole('radio', { name: 'All 3' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Online 2' })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: 'Offline 0' })).not.toBeChecked();
  });

  it('selects a segment on a click, and keeps it on a second click', async () => {
    const onChange = vi.fn();
    render(SegmentedControlFixture, { options: OPTIONS, initial: 'all', onChange });

    await userEvent.click(screen.getByRole('radio', { name: 'Online 2' }));
    await userEvent.click(screen.getByRole('radio', { name: 'Online 2' }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('online');
    expect(screen.getByRole('radio', { name: 'Online 2' })).toBeChecked();
  });

  it('moves between the segments with the arrow keys', async () => {
    render(SegmentedControlFixture, { options: OPTIONS, initial: 'all' });

    await userEvent.tab();
    await userEvent.keyboard('{ArrowRight}{ArrowRight}{Enter}');

    expect(screen.getByRole('radio', { name: 'Offline 0' })).toHaveFocus();
    expect(screen.getByRole('radio', { name: 'Offline 0' })).toBeChecked();
  });

  it('fades a segment with a count of 0 only while it is not selected', () => {
    render(SegmentedControlFixture, { options: OPTIONS, initial: 'all' });

    expect(screen.getByRole('radio', { name: 'Offline 0' })).toHaveClass(
      'data-[state=off]:opacity-45',
    );
    expect(screen.getByRole('radio', { name: 'Online 2' })).not.toHaveClass(
      'data-[state=off]:opacity-45',
    );
  });

  it('puts the thumb under the selected segment, with no move on the first render', () => {
    render(SegmentedControlFixture, { options: OPTIONS, initial: 'online' });

    expect(thumbBox()).toEqual(BOXES.online);
    expect(lastMove()).toBeNull();
  });

  it('stretches the thumb to the new segment, then lets it settle there', async () => {
    render(SegmentedControlFixture, { options: OPTIONS, initial: 'all' });

    await userEvent.click(screen.getByRole('radio', { name: 'Offline 0' }));

    expect(thumbBox()).toEqual(BOXES.offline);
    const [keyframes, options] = lastMove()!;
    expect(options).toEqual({ duration: STRETCH_MS + SETTLE.duration });
    const frames = keyframes as Keyframe[];
    expect(frames[0]).toMatchObject({ left: '3px', width: '48px' });
    expect(frames.at(-1)).toMatchObject({ left: '135px', width: '76px', offset: 1 });
  });

  it('moves the thumb in a short slide when the user asks for less motion', async () => {
    setReducedMotion(true);
    render(SegmentedControlFixture, { options: OPTIONS, initial: 'all' });

    await userEvent.click(screen.getByRole('radio', { name: 'Online 2' }));

    expect(lastMove()![1]).toEqual({ duration: REDUCED_MS });
  });

  it('keeps the name of a segment on its new count while the old one rolls away', async () => {
    const { rerender } = render(SegmentedControlFixture, { options: OPTIONS, initial: 'all' });

    await rerender({
      options: OPTIONS.map(option =>
        option.value === 'online' ? { ...option, count: 3 } : option,
      ),
    });

    const online = screen.getByRole('radio', { name: 'Online 3' });
    expect(online.querySelector('[data-part="segmented-count"]')).toHaveTextContent('23');
  });

  it('spreads the segments over the full width in equal columns with fill', () => {
    render(SegmentedControlFixture, { options: OPTIONS, initial: 'all', fill: true });

    expect(screen.getByRole('group', { name: 'Status' })).toHaveClass(
      'grid',
      'w-full',
      'auto-cols-fr',
      'grid-flow-col',
    );
  });
});
