import { describe, it, expect, vi, afterEach } from 'vitest';
import { flushSync } from 'svelte';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import {
  createQuickAdd,
  type QuickAdd,
} from '@base/features/pipeline/presentation/quick-add.state.svelte.ts';
import { BLANK_STEPS, catalogText } from '../catalog.ts';
import QuickAddMenu from './QuickAddMenu.svelte';

let cleanup: (() => void) | undefined;

const setup = () => {
  const onPick = vi.fn();
  let quickAdd!: QuickAdd;
  cleanup = $effect.root(() => {
    quickAdd = createQuickAdd({ entries: () => BLANK_STEPS, resolve: catalogText, onPick });
  });
  render(QuickAddMenu, { quickAdd });
  return { quickAdd, onPick };
};

afterEach(() => cleanup?.());

describe('QuickAddMenu', () => {
  it('shows nothing until a link is dropped', () => {
    setup();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('names the step the new one follows, and focuses the search', () => {
    const { quickAdd } = setup();
    quickAdd.open({ client: { x: 5, y: 5 }, flow: { x: 0, y: 0 }, link: { after: 'build' } });
    flushSync();

    expect(screen.getByRole('dialog', { name: 'Add a step after build' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Search a node' })).toHaveFocus();
  });

  it('picks with the keyboard', async () => {
    const { quickAdd, onPick } = setup();
    quickAdd.open({ client: { x: 5, y: 5 }, flow: { x: 0, y: 0 }, link: {} });
    flushSync();

    await userEvent.keyboard('{ArrowDown}');
    const search = screen.getByRole('combobox', { name: 'Search a node' });
    const active = screen.getByRole('option', { selected: true });
    expect(search).toHaveAttribute('aria-activedescendant', active.id);
    expect(active).toHaveAccessibleName(/sh script/);

    await userEvent.keyboard('{Enter}');

    expect(onPick).toHaveBeenCalledWith(BLANK_STEPS[1], expect.anything());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('picks with the mouse', async () => {
    const { quickAdd, onPick } = setup();
    quickAdd.open({ client: { x: 5, y: 5 }, flow: { x: 0, y: 0 }, link: { replacing: 'a->b' } });
    flushSync();

    expect(screen.getByRole('dialog', { name: 'Insert a step here' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('option', { name: /Command/ }));

    expect(onPick).toHaveBeenCalledWith(
      BLANK_STEPS[2],
      expect.objectContaining({ link: { replacing: 'a->b' } }),
    );
  });

  it('closes on Escape and on a click outside, without adding anything', async () => {
    const { quickAdd, onPick } = setup();
    quickAdd.open({ client: { x: 5, y: 5 }, flow: { x: 0, y: 0 }, link: {} });
    flushSync();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    quickAdd.open({ client: { x: 5, y: 5 }, flow: { x: 0, y: 0 }, link: {} });
    flushSync();
    await userEvent.click(screen.getByRole('button', { name: 'Close the menu' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(onPick).not.toHaveBeenCalled();
  });

  it('closes when Tab moves the focus out of the menu', async () => {
    const { quickAdd } = setup();
    quickAdd.open({ client: { x: 5, y: 5 }, flow: { x: 0, y: 0 }, link: {} });
    flushSync();

    await userEvent.keyboard('{Tab}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
