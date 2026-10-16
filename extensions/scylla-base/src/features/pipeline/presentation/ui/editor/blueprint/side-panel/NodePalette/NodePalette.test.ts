import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import type { StepTemplate } from '@base/features/pipeline/domain/structs/step-template.struct.ts';
import {
  CATALOG_DRAG_TYPE,
  DRAG_LIFT,
  catalogEntries,
} from '@base/features/pipeline/presentation/ui/editor/blueprint/catalog.ts';
import NodePalette from './NodePalette.svelte';

const template: StepTemplate = {
  id: 'npm-ci',
  name: 'npm ci',
  nodeId: 'install-deps',
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

  it('carries the entry id when it is dragged to the canvas', async () => {
    render(NodePalette, { entries, onAdd: vi.fn() });
    const setData = vi.fn();

    await fireEvent.dragStart(screen.getByRole('button', { name: /Bash script/ }), {
      dataTransfer: { setData, setDragImage: vi.fn(), effectAllowed: 'none' },
    });

    expect(setData).toHaveBeenCalledWith(CATALOG_DRAG_TYPE, 'kind:bash');
  });

  it('drags only the icon of the row, above the pointer, where the icon of the node lands', async () => {
    render(NodePalette, { entries, onAdd: vi.fn() });
    const setDragImage = vi.fn();
    const row = screen.getByRole('button', { name: /Bash script/ });

    await fireEvent.dragStart(row, {
      dataTransfer: { setData: vi.fn(), setDragImage, effectAllowed: 'none' },
    });

    const icon = row.querySelector<HTMLElement>('[data-drag-image]');
    expect(icon).not.toBeNull();
    expect(setDragImage).toHaveBeenCalledWith(
      icon,
      icon!.offsetWidth / 2,
      icon!.offsetHeight / 2 + DRAG_LIFT,
    );
  });

  it('moves the entry rather than copying it, so the pointer has no "+" badge', async () => {
    render(NodePalette, { entries, onAdd: vi.fn() });
    const dataTransfer = { setData: vi.fn(), setDragImage: vi.fn(), effectAllowed: 'none' };

    await fireEvent.dragStart(screen.getByRole('button', { name: /Bash script/ }), {
      dataTransfer,
    });

    expect(dataTransfer.effectAllowed).toBe('move');
  });
});
