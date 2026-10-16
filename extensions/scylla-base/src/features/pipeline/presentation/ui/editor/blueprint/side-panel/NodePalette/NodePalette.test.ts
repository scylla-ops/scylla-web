import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import type { StepTemplate } from '@base/features/pipeline/domain/structs/step-template.struct.ts';
import {
  CATALOG_DRAG_TYPE,
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

  it('shows no picture of the row under the pointer: the canvas draws the node', async () => {
    render(NodePalette, { entries, onAdd: vi.fn() });
    const setDragImage = vi.fn();

    await fireEvent.dragStart(screen.getByRole('button', { name: /Bash script/ }), {
      dataTransfer: { setData: vi.fn(), setDragImage, effectAllowed: 'none' },
    });

    expect(setDragImage).toHaveBeenCalledWith(expect.any(HTMLImageElement), 0, 0);
  });

  it('says when a drag starts and ends, and dims the dragged entry', async () => {
    const onDragStart = vi.fn();
    const onDragEnd = vi.fn();
    const { rerender } = render(NodePalette, { entries, onAdd: vi.fn(), onDragStart, onDragEnd });
    const row = screen.getByRole('button', { name: /Bash script/ });

    await fireEvent.dragStart(row, {
      dataTransfer: { setData: vi.fn(), setDragImage: vi.fn(), effectAllowed: 'none' },
    });
    expect(onDragStart).toHaveBeenCalledWith(expect.objectContaining({ id: 'kind:bash' }));

    await rerender({ entries, onAdd: vi.fn(), onDragStart, onDragEnd, draggingId: 'kind:bash' });
    expect(row).toHaveClass('opacity-40');

    await fireEvent.dragEnd(row);
    expect(onDragEnd).toHaveBeenCalled();
  });
});
