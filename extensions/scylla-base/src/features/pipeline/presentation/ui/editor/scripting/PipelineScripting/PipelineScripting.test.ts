import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { findFloating, render, withQueryClient } from '@test/render.svelte.ts';
import type { PipelineScript } from '@base/features/pipeline/presentation/ui/editor/pipeline-script.state.svelte.ts';
import Fixture from './PipelineScripting.fixture.svelte';

const document = JSON.stringify({
  name: 'web',
  nodes: [
    { id: 'build', deps: [], kind: 'script', shell: 'bash', script: 'make', env: [] },
    { id: 'test', deps: ['build'], kind: 'exec', command: 'make', args: ['test'], env: [] },
  ],
});

let restore: () => void;
beforeEach(() => {
  restore = withQueryClient().restore;
});
afterEach(() => restore());

const renderScripting = (initialScript = document) => {
  let doc!: PipelineScript;
  render(Fixture, { initialScript, onDoc: (next: PipelineScript) => (doc = next) });
  return () => doc;
};

/** The job each pane shows. */
const shownJobs = () =>
  screen
    .getAllByRole('region')
    .map(pane => within(pane).getByRole('tab', { selected: true }).textContent?.trim());

describe('PipelineScripting', () => {
  it('lists the jobs in the order they run, and opens the first one', () => {
    renderScripting();

    const list = screen.getByRole('navigation', { name: 'Jobs' });
    const rows = within(list)
      .getAllByRole('listitem')
      .map(row => row.textContent);
    expect(rows[0]).toContain('build');
    expect(rows[1]).toContain('test');
    expect(screen.getByRole('tab', { name: 'build', selected: true })).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: 'Job properties' })).toBeInTheDocument();
  });

  it('shows the full document, and no jobs, while the JSON does not parse', () => {
    renderScripting('{ "nodes": [');

    expect(screen.getByRole('tab', { name: 'By job' })).toBeDisabled();
    expect(screen.getByRole('tab', { name: 'Full document', selected: true })).toBeInTheDocument();
  });

  it('opens a command job as a form, with the line that runs', async () => {
    const user = userEvent.setup();
    renderScripting();

    const list = screen.getByRole('navigation', { name: 'Jobs' });
    await user.click(within(list).getByRole('button', { name: /^test/ }));

    expect(screen.getByRole('tab', { name: 'test', selected: true })).toBeInTheDocument();
    expect(screen.getByText('make test', { selector: 'code' })).toBeInTheDocument();
  });

  it('opens a job to the side, in a second pane', async () => {
    renderScripting();

    await userEvent.click(screen.getByRole('button', { name: 'Actions of test' }));
    await userEvent.click(await findFloating('menuitem', 'Open to the side'));

    expect(shownJobs()).toEqual(['build', 'test']);
    expect(screen.getAllByRole('button', { name: 'Close the pane' })).toHaveLength(2);
  });

  it('adds a job after the open one, opens it, and writes it to the document', async () => {
    const user = userEvent.setup();
    const doc = renderScripting();

    await user.click(screen.getAllByRole('button', { name: 'New job' })[0]);

    expect(screen.getByRole('tab', { name: 'job', selected: true })).toBeInTheDocument();
    expect(doc().steps.find(step => step.id === 'job')?.deps).toEqual(['build']);
  });

  it('renames a job from its properties, and the jobs that wait for it follow', async () => {
    const user = userEvent.setup();
    const doc = renderScripting();

    const id = screen.getByRole('textbox', { name: 'Step ID' });
    await user.clear(id);
    await user.type(id, 'compile{Enter}');

    expect(screen.getByRole('tab', { name: 'compile', selected: true })).toBeInTheDocument();
    expect(doc().steps.find(step => step.id === 'test')?.deps).toEqual(['compile']);
  });
});
