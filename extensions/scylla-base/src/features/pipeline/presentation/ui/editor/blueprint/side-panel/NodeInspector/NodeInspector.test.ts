import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { render, withQueryClient } from '@test/render.ts';
import type { PipelineNodeEntity } from '@base/features/pipeline/domain/entities/pipeline-node.entity.ts';
import NodeInspector from './NodeInspector.svelte';

const node: PipelineNodeEntity = {
  id: 'test',
  deps: ['build'],
  kind: 'script',
  shell: 'bash',
  script: 'npm test',
  env: [],
};

let restore: () => void;
const handlers = {
  onChange: vi.fn(),
  // The blueprint keeps the id when the new one is empty.
  onRename: vi.fn((id: string) => id.trim() || node.id),
  onDelete: vi.fn(),
  onClose: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  restore = withQueryClient().restore;
});

afterEach(() => restore());

const renderInspector = (overrides: Partial<PipelineNodeEntity> = {}, detached = false) =>
  render(NodeInspector, {
    node: { ...node, ...overrides } as PipelineNodeEntity,
    dependencies: ['build'],
    detached,
    ...handlers,
  });

describe('NodeInspector', () => {
  it('shows what the node waits for', () => {
    renderInspector();
    expect(screen.getByText('After')).toBeInTheDocument();
    expect(screen.getByText('build')).toBeInTheDocument();
  });

  it('warns that a node with no input link is linked to the start on save', () => {
    renderInspector({}, true);
    expect(
      screen.getByText(
        'This node has no input link. On save, it is linked to the start of the pipeline.',
      ),
    ).toBeInTheDocument();
  });

  it('applies each edit at once, and says why a node cannot run yet', async () => {
    const user = userEvent.setup();
    renderInspector();

    await user.click(screen.getByRole('radio', { name: 'Command' }));
    expect(screen.getByRole('alert')).toHaveTextContent('A command is required.');
    expect(handlers.onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ kind: 'exec', command: '' }),
    );

    await user.type(screen.getByLabelText('Command'), 'make');

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(handlers.onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ kind: 'exec', command: 'make' }),
    );
  });

  it('switches the shell of a script', async () => {
    const user = userEvent.setup();
    renderInspector();

    await user.click(screen.getByRole('radio', { name: 'sh' }));

    expect(handlers.onChange).toHaveBeenLastCalledWith(expect.objectContaining({ shell: 'sh' }));
  });

  it('renames the node when the id field is left', async () => {
    const user = userEvent.setup();
    renderInspector();

    const id = screen.getByLabelText('Node ID');
    await user.clear(id);
    await user.type(id, 'unit-tests{Enter}');

    expect(handlers.onRename).toHaveBeenCalledWith('unit-tests');
  });

  it('shows the kept id again after a refused rename', async () => {
    const user = userEvent.setup();
    renderInspector();

    const id = screen.getByLabelText('Node ID');
    await user.clear(id);
    await user.tab();

    expect(id).toHaveValue('test');
  });

  it('deletes the node and closes the panel', async () => {
    const user = userEvent.setup();
    renderInspector();

    await user.click(screen.getByRole('button', { name: 'Delete the node' }));
    await user.click(screen.getByRole('button', { name: 'Close' }));

    expect(handlers.onDelete).toHaveBeenCalled();
    expect(handlers.onClose).toHaveBeenCalled();
  });

  it('says at once which characters the id cannot hold, and applies the suggested id', async () => {
    const user = userEvent.setup();
    renderInspector();

    const id = screen.getByRole('textbox', { name: 'Node ID' });
    await user.clear(id);
    await user.type(id, 'Run Tests');

    expect(id).toHaveAttribute('aria-invalid', 'true');
    expect(id).toHaveAccessibleDescription(
      'The node ID cannot contain "R", "␣", "T". Use only lowercase letters (a-z), digits, - and _.',
    );
    expect(handlers.onRename).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Use run-tests' }));

    expect(handlers.onRename).toHaveBeenLastCalledWith('run-tests');
  });
});
