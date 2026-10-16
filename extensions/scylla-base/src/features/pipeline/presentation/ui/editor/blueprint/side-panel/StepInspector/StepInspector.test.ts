import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { render, withQueryClient } from '@test/render.svelte.ts';
import type { PipelineStep } from '@base/features/pipeline/domain/structs/pipeline.struct.ts';
import StepInspector from './StepInspector.svelte';

const step: PipelineStep = {
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
  onRename: vi.fn(),
  onDelete: vi.fn(),
  onClose: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  restore = withQueryClient().restore;
});

afterEach(() => restore());

const renderInspector = (overrides: Partial<PipelineStep> = {}) =>
  render(StepInspector, {
    step: { ...step, ...overrides } as PipelineStep,
    dependencies: ['build'],
    ...handlers,
  });

describe('StepInspector', () => {
  it('shows what the step waits for', () => {
    renderInspector();
    expect(screen.getByText('After')).toBeInTheDocument();
    expect(screen.getByText('build')).toBeInTheDocument();
  });

  it('applies a command at once, and says why an empty one is not applied', async () => {
    const user = userEvent.setup();
    renderInspector();

    await user.click(screen.getByRole('button', { name: 'Command' }));
    expect(screen.getByRole('alert')).toHaveTextContent('A command is required.');
    expect(handlers.onChange).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText('Command'), 'make');

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(handlers.onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ kind: 'exec', command: 'make' }),
    );
  });

  it('switches the shell of a script', async () => {
    const user = userEvent.setup();
    renderInspector();

    await user.click(screen.getByRole('button', { name: 'sh' }));

    expect(handlers.onChange).toHaveBeenLastCalledWith(expect.objectContaining({ shell: 'sh' }));
  });

  it('renames the step when the id field is left', async () => {
    const user = userEvent.setup();
    renderInspector();

    const id = screen.getByLabelText('Step ID');
    await user.clear(id);
    await user.type(id, 'unit-tests{Enter}');

    expect(handlers.onRename).toHaveBeenCalledWith('unit-tests');
  });

  it('does not rename to an empty id', async () => {
    const user = userEvent.setup();
    renderInspector();

    await user.clear(screen.getByLabelText('Step ID'));
    await user.tab();

    expect(handlers.onRename).not.toHaveBeenCalled();
  });

  it('deletes the step and closes the panel', async () => {
    const user = userEvent.setup();
    renderInspector();

    await user.click(screen.getByRole('button', { name: 'Delete the step' }));
    await user.click(screen.getByRole('button', { name: 'Close' }));

    expect(handlers.onDelete).toHaveBeenCalled();
    expect(handlers.onClose).toHaveBeenCalled();
  });
});
