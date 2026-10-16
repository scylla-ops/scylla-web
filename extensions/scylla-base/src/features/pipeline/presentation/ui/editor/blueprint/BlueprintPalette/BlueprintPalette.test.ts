import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { render, withQueryClient } from '@test/render.svelte.ts';
import type { PipelineStep } from '../../../../../domain/structs/pipeline.struct.ts';
import BlueprintEditor from '../__test__/BlueprintEditor.fixture.svelte';

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
