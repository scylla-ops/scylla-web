import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import type { StepTemplate } from '@base/features/pipeline/domain/structs/step-template.struct.ts';
import { flushSync } from 'svelte';
import { catalogEntries } from '@base/features/pipeline/presentation/presenters/catalog.presenter.ts';
import {
  createPaletteDrag,
  type PaletteDrag,
} from '@base/features/pipeline/presentation/ui/editor/blueprint/palette-drag/palette-drag.state.svelte.ts';
import NodePalette from './NodePalette.svelte';

const template: StepTemplate = {
  id: 'npm-ci',
  name: 'npm ci',
  stepId: 'install-deps',
  definition: { kind: 'script', shell: 'bash', script: 'npm ci', env: [] },
};
const entries = catalogEntries([template]);

describe('NodePalette', () => {
  it('offers the blank steps and the templates, in two groups', () => {
    render(NodePalette, { entries, onAdd: vi.fn() });

    expect(screen.getByRole('heading', { name: 'Steps' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Templates' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Bash script/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /npm ci/ })).toBeInTheDocument();
  });

  it('adds the clicked entry', async () => {
    const onAdd = vi.fn();
    render(NodePalette, { entries, onAdd });

    await userEvent.click(screen.getByRole('button', { name: /npm ci/ }));

    expect(onAdd).toHaveBeenCalledWith(entries.find(entry => entry.id === 'template:npm-ci'));
  });

  it('filters the entries and hides an emptied group', async () => {
    render(NodePalette, { entries, onAdd: vi.fn() });

    await userEvent.type(screen.getByRole('textbox', { name: 'Search a node' }), 'npm');

    expect(screen.queryByRole('heading', { name: 'Steps' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  it('says so when nothing matches', async () => {
    render(NodePalette, { entries, onAdd: vi.fn() });

    await userEvent.type(screen.getByRole('textbox', { name: 'Search a node' }), 'kubectl');

    expect(screen.getByText('No node matches this search.')).toBeInTheDocument();
  });

  describe('a row dragged with the pointer', () => {
    let drag: PaletteDrag;
    let cleanup: () => void;
    const drop = vi.fn();

    beforeEach(() => {
      drop.mockClear();
      cleanup = $effect.root(() => {
        drag = createPaletteDrag();
        // The canvas: everything right of x = 500.
        drag.setTarget({ contains: ({ x }) => x >= 500, positionAt: at => at, drop });
      });
    });
    afterEach(() => cleanup());

    const press = (row: HTMLElement, x: number) =>
      fireEvent.pointerDown(row, { pointerId: 1, button: 0, isPrimary: true, clientX: x, clientY: 0 });
    const moveTo = (row: HTMLElement, x: number) =>
      fireEvent.pointerMove(row, { pointerId: 1, clientX: x, clientY: 0 });
    const release = (row: HTMLElement, x: number) =>
      fireEvent.pointerUp(row, { pointerId: 1, clientX: x, clientY: 0 });

    it('drops the entry on the canvas, and the click that ends the drag adds nothing', async () => {
      const onAdd = vi.fn();
      render(NodePalette, { entries, onAdd, drag });
      const row = screen.getByRole('button', { name: /Bash script/ });

      await press(row, 100);
      await moveTo(row, 120);
      flushSync();
      expect(drag.entry?.id).toBe('kind:bash');
      expect(row).toHaveClass('opacity-40');

      await moveTo(row, 800);
      await release(row, 800);
      await fireEvent.click(row);

      expect(drop).toHaveBeenCalledWith(expect.objectContaining({ id: 'kind:bash' }), {
        x: 800,
        y: 0,
      });
      expect(onAdd).not.toHaveBeenCalled();
    });

    it('hides the pointer during the drag: the dragged icon takes its place', async () => {
      render(NodePalette, { entries, onAdd: vi.fn(), drag });
      const row = screen.getByRole('button', { name: /Bash script/ });
      const root = document.documentElement;

      await press(row, 100);
      await moveTo(row, 120);
      expect(root).toHaveClass('cursor-none');

      await release(row, 120);
      expect(root).not.toHaveClass('cursor-none');
    });

    it('is still a click when the pointer barely moves', async () => {
      const onAdd = vi.fn();
      render(NodePalette, { entries, onAdd, drag });
      const row = screen.getByRole('button', { name: /Bash script/ });

      await press(row, 100);
      await moveTo(row, 102);
      await release(row, 102);
      await fireEvent.click(row);

      expect(drag.entry).toBeNull();
      expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ id: 'kind:bash' }));
    });

    it('drops nothing when Escape cancels the drag', async () => {
      const onAdd = vi.fn();
      render(NodePalette, { entries, onAdd, drag });
      const row = screen.getByRole('button', { name: /Bash script/ });

      await press(row, 100);
      await moveTo(row, 800);
      await fireEvent.keyDown(window, { key: 'Escape' });
      await release(row, 800);
      await fireEvent.click(row);

      expect(drag.entry).toBeNull();
      expect(document.documentElement).not.toHaveClass('cursor-none');
      expect(drop).not.toHaveBeenCalled();
      expect(onAdd).not.toHaveBeenCalled();
    });
  });
});
