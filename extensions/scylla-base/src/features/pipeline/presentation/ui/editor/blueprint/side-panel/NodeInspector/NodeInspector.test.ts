import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { render, withQueryClient } from '@test/render.ts';
import type { PipelineNodeEntity } from '@base/features/pipeline/domain/entities/pipeline-node.entity.ts';
import NodeInspector from './NodeInspector.svelte';

const node: PipelineNodeEntity = {
  id: 'test',
  deps: [{ node: 'build' }],
  kind: 'script',
  shell: 'bash',
  script: 'npm test',
  env: [],
};

let restore: () => void;
const handlers = {
  onChange: vi.fn(),
  onErrorOutputChange: vi.fn(),
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

const renderInspector = (
  overrides: Partial<PipelineNodeEntity> = {},
  detached = false,
  props: Record<string, unknown> = {},
) =>
  render(NodeInspector, {
    node: { ...node, ...overrides } as PipelineNodeEntity,
    dependencies: [{ node: 'build' }],
    detached,
    ...handlers,
    ...props,
  });

const ifNode: PipelineNodeEntity = {
  id: 'is-main',
  deps: [],
  env: [{ key: 'TARGET', kind: 'literal', value: 'main' }],
  kind: 'switch',
  cases: [
    {
      port: 'true',
      combinator: 'all',
      rules: [
        {
          left: { kind: 'literal', value: '' },
          test: 'equals',
          right: { kind: 'literal', value: '' },
        },
      ],
    },
  ],
  otherwise: 'false',
  allMatches: false,
};

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

  it('applies the timeout and the retries of a node', async () => {
    const user = userEvent.setup();
    renderInspector();

    await user.type(screen.getByLabelText('Timeout (seconds)'), '30');
    await user.clear(screen.getByLabelText('Retries'));
    await user.type(screen.getByLabelText('Retries'), '2');

    expect(handlers.onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ timeoutSeconds: 30, retries: 2 }),
    );
  });

  it('shows the range and does not apply a value out of range', async () => {
    const user = userEvent.setup();
    renderInspector();

    await user.clear(screen.getByLabelText('Retries'));
    await user.type(screen.getByLabelText('Retries'), '11');
    await user.type(screen.getByLabelText('Timeout (seconds)'), '0');

    expect(screen.getByText('Enter a whole number from 0 to 10.')).toBeInTheDocument();
    expect(screen.getByText('Enter a whole number from 1 to 604800.')).toBeInTheDocument();
    expect(screen.getByLabelText('Retries')).toHaveAttribute('aria-invalid', 'true');
    expect(handlers.onChange).not.toHaveBeenCalledWith(expect.objectContaining({ retries: 11 }));
    expect(handlers.onChange).not.toHaveBeenCalledWith(
      expect.objectContaining({ timeoutSeconds: 0 }),
    );
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

  it('turns the error output of a node that runs a step on and off', async () => {
    const user = userEvent.setup();
    renderInspector({}, false, { errorOutput: true });

    const toggle = screen.getByRole('switch', { name: 'Send a failure to an error output' });
    expect(toggle).toBeChecked();
    await user.click(toggle);

    expect(handlers.onErrorOutputChange).toHaveBeenCalledWith(false);
  });

  it('shows a need on the error output in red', () => {
    renderInspector({}, false, { dependencies: [{ node: 'build', port: 'error' }] });
    expect(screen.getByText('build:error')).toHaveClass('text-destructive');
  });

  it('shows the form of a switch, its environment, and no kind and no error output', () => {
    render(NodeInspector, { node: ifNode, dependencies: [], detached: false, ...handlers });

    expect(screen.getByRole('region', { name: 'true' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Port when no case matches' })).toHaveValue('false');
    expect(screen.getByDisplayValue('TARGET')).toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: 'Command' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('switch', { name: 'Send a failure to an error output' }),
    ).not.toBeInTheDocument();
  });

  it('says what the pipeline refuses in the node', () => {
    render(NodeInspector, {
      node: ifNode,
      dependencies: [],
      detached: false,
      issue: { kind: 'switch', issue: { kind: 'output-node', port: 'true', node: 'later' } },
      ...handlers,
    });

    expect(screen.getByRole('alert')).toHaveTextContent(
      'In the case true, later is not a node that runs a step before this switch.',
    );
  });

  it('shows a merge with its id and its needs only', () => {
    render(NodeInspector, {
      node: { id: 'join', deps: [{ node: 'a' }, { node: 'b' }], kind: 'merge' },
      dependencies: [{ node: 'a' }, { node: 'b' }],
      detached: false,
      ...handlers,
    });

    expect(screen.getByRole('textbox', { name: 'Node ID' })).toHaveValue('join');
    expect(screen.getByText('a')).toBeInTheDocument();
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
  });
});
