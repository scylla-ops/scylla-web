import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { render, withQueryClient } from '@test/render.svelte.ts';
import type { PipelineStep } from '../../../../../domain/structs/pipeline.struct.ts';
import BlueprintEditor from './BlueprintEditor.fixture.svelte';

const exec = (id: string, deps: string[] = []): PipelineStep => ({
  id,
  deps,
  kind: 'exec',
  command: 'make',
  args: [id],
  env: [],
});

let restore: () => void;
const onStepsChange = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  restore = withQueryClient().restore;
});

afterEach(() => restore());

const lastSteps = () => onStepsChange.mock.lastCall?.[0] as PipelineStep[];
const panel = () => screen.getByRole('complementary', { name: /^(build|test|compile|script)/ });

describe('StepPanel', () => {
  it('sends each edit to the draft at once, with no save button', async () => {
    const user = userEvent.setup();
    render(BlueprintEditor, { steps: [exec('build')], selected: 'build', onStepsChange });

    await user.clear(screen.getByLabelText('Program'));
    await user.type(screen.getByLabelText('Program'), 'cargo');

    expect(lastSteps()[0]).toMatchObject({ id: 'build', kind: 'exec', command: 'cargo' });
    expect(within(panel()).queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
  });

  it('renames the step only when the id is committed', async () => {
    const user = userEvent.setup();
    render(BlueprintEditor, {
      steps: [exec('build'), exec('test', ['build'])],
      selected: 'build',
      onStepsChange,
    });

    const id = screen.getByLabelText('Step id');
    await user.clear(id);
    await user.type(id, 'compile');
    expect(onStepsChange).not.toHaveBeenCalled();

    await user.keyboard('{Enter}');
    expect(lastSteps().map(step => step.id)).toEqual(['compile', 'test']);
    // The step that ran after it follows the rename.
    expect(lastSteps()[1].deps).toEqual(['compile']);
  });

  it('switches a step to a script and keeps it in the draft', async () => {
    const user = userEvent.setup();
    render(BlueprintEditor, { steps: [exec('build')], selected: 'build', onStepsChange });

    await user.click(screen.getByRole('button', { name: 'Script' }));

    expect(screen.getByRole('button', { name: 'Script' })).toHaveAttribute('aria-pressed', 'true');
    expect(lastSteps()[0]).toMatchObject({ kind: 'script', shell: 'sh' });
  });

  it('removes an argument', async () => {
    const user = userEvent.setup();
    render(BlueprintEditor, { steps: [exec('build')], selected: 'build', onStepsChange });

    await user.click(screen.getByRole('button', { name: 'Remove argument' }));

    expect(lastSteps()[0]).toMatchObject({ args: [] });
  });

  it('removes a dependency, and the step then runs first', async () => {
    const user = userEvent.setup();
    render(BlueprintEditor, {
      steps: [exec('build'), exec('test', ['build'])],
      selected: 'test',
      onStepsChange,
    });

    await user.click(screen.getByRole('button', { name: 'Remove the dependency on build' }));

    expect(lastSteps()[1].deps).toEqual([]);
    expect(screen.getByText('Runs first, as soon as the pipeline starts.')).toBeInTheDocument();
  });

  it('deletes the step and closes the panel', async () => {
    const user = userEvent.setup();
    render(BlueprintEditor, {
      steps: [exec('build'), exec('test')],
      selected: 'build',
      onStepsChange,
    });

    await user.click(screen.getByRole('button', { name: 'Delete step' }));

    expect(lastSteps().map(step => step.id)).toEqual(['test']);
    expect(screen.queryByLabelText('Step id')).not.toBeInTheDocument();
  });

  it('closes without changing the draft', async () => {
    const user = userEvent.setup();
    render(BlueprintEditor, { steps: [exec('build')], selected: 'build', onStepsChange });

    await user.click(screen.getByRole('button', { name: 'Close panel' }));

    expect(screen.queryByLabelText('Step id')).not.toBeInTheDocument();
    expect(onStepsChange).not.toHaveBeenCalled();
  });
});

describe('BlueprintPalette', () => {
  it('adds a block on a click, after the selected step, and opens it', async () => {
    const user = userEvent.setup();
    render(BlueprintEditor, { steps: [exec('build')], selected: 'build', onStepsChange });

    await user.click(screen.getByRole('button', { name: /Script · bash/ }));

    expect(lastSteps()[1]).toMatchObject({
      id: 'script',
      kind: 'script',
      shell: 'bash',
      deps: ['build'],
    });
    expect(screen.getByLabelText('Step id')).toHaveValue('script');
  });

  it('lists the steps with what they run after, and selects one on a click', async () => {
    const user = userEvent.setup();
    render(BlueprintEditor, { steps: [exec('build'), exec('test', ['build'])], onStepsChange });

    const steps = within(screen.getByRole('navigation'));
    expect(steps.getByRole('button', { name: /build first/ })).toBeInTheDocument();
    await user.click(steps.getByRole('button', { name: /test after build/ }));

    expect(screen.getByLabelText('Step id')).toHaveValue('test');
  });

  it('says so when there is no step yet', () => {
    render(BlueprintEditor, { steps: [], onStepsChange });

    expect(screen.getByText('No steps yet.')).toBeInTheDocument();
  });
});
