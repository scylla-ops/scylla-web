import { describe, it, expect, vi, afterEach } from 'vitest';
import { screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { render, withWidgetInjections } from '@test/render.ts';
import { pipelinePoints } from '@base/features/pipeline/presentation/pipeline.points.ts';
import StartPanel from './StartPanel.svelte';
import StartPanelProbe from './StartPanelProbe.fixture.svelte';

let restore: () => void = () => {};

afterEach(() => restore());

describe('StartPanel', () => {
  it('says that only the members who manage the triggers see them, with no part to show', async () => {
    const onClose = vi.fn();
    render(StartPanel, { pipelineId: 'pipeline-1', projectId: 'project-1', onClose });

    expect(screen.getByRole('heading', { name: 'Triggers' })).toBeInTheDocument();
    expect(
      screen.getByText('Only the members who can manage the triggers see them here.'),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Close the panel' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('gives its body to the part of another module, with the pipeline and its project', async () => {
    restore = withWidgetInjections({
      TriggersProbe: [
        pipelinePoints.startPanel.inject({
          position: 'replace',
          component: () => Promise.resolve({ default: StartPanelProbe }),
        }),
      ],
    });
    render(StartPanel, { pipelineId: 'pipeline-1', projectId: 'project-1', onClose: vi.fn() });

    expect(await screen.findByText('Triggers of pipeline-1 in project-1')).toBeInTheDocument();
    expect(
      screen.queryByText('Only the members who can manage the triggers see them here.'),
    ).not.toBeInTheDocument();
  });
});
