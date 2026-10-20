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

  it('opens the first job of the list, not the first of the document', () => {
    renderScripting(
      JSON.stringify({
        name: 'web',
        nodes: [
          { id: 'test', deps: ['build'], kind: 'script', shell: 'bash', script: '', env: [] },
          { id: 'build', deps: [], kind: 'script', shell: 'bash', script: '', env: [] },
        ],
      }),
    );

    expect(screen.getByRole('tab', { name: 'build', selected: true })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'test' })).not.toBeInTheDocument();
  });

  it('shows the full document, and no jobs, while the JSON does not parse', () => {
    renderScripting('{ "nodes": [');

    expect(screen.getByRole('tab', { name: 'By job' })).toBeDisabled();
    expect(screen.getByRole('tab', { name: 'Full document', selected: true })).toBeInTheDocument();
  });

  it.each([
    ['two jobs share an id', [{ id: 'a' }, { id: 'a' }]],
    ['a job lists a dependency twice', [{ id: 'a' }, { id: 'b', deps: ['a', 'a'] }]],
  ])('shows the full document, and renders no job, when %s', (_, nodes) => {
    renderScripting(JSON.stringify({ name: 'web', nodes }));

    expect(screen.getByRole('tab', { name: 'By job' })).toBeDisabled();
    expect(screen.getByRole('tab', { name: 'Full document', selected: true })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Jobs' })).not.toBeInTheDocument();
  });

  it('falls back to the full document when an edit of the text repeats a job id', async () => {
    const doc = renderScripting();
    expect(screen.getByRole('navigation', { name: 'Jobs' })).toBeInTheDocument();

    doc().setScript(JSON.stringify({ name: 'web', nodes: [{ id: 'build' }, { id: 'build' }] }));

    expect(
      await screen.findByRole('tab', { name: 'Full document', selected: true }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Jobs' })).not.toBeInTheDocument();
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

  describe('the dependency picker', () => {
    const jobs = JSON.stringify({
      name: 'web',
      nodes: ['a', 'b', 'c'].map(id => ({
        id,
        deps: [],
        kind: 'script',
        shell: 'bash',
        script: id,
        env: [],
      })),
    });
    const pick = async (user: ReturnType<typeof userEvent.setup>, id: string) => {
      await user.click(screen.getByRole('combobox', { name: 'Add a dependency' }));
      await user.click(await findFloating('option', id));
    };
    const depsOf = (doc: () => PipelineScript, id: string) =>
      doc().steps.find(step => step.id === id)?.deps;

    it('offers a dependency again once its chip is removed', async () => {
      const user = userEvent.setup();
      const doc = renderScripting(jobs);

      await pick(user, 'b');
      expect(depsOf(doc, 'a')).toEqual(['b']);
      await user.click(screen.getByRole('button', { name: 'Remove the dependency on b' }));
      expect(depsOf(doc, 'a')).toEqual([]);
      await pick(user, 'b');

      expect(depsOf(doc, 'a')).toEqual(['b']);
    });

    it('adds the dependency that was just picked on another job', async () => {
      const user = userEvent.setup();
      const doc = renderScripting(jobs);

      await pick(user, 'b');
      const list = screen.getByRole('navigation', { name: 'Jobs' });
      await user.click(within(list).getByRole('button', { name: /^c/ }));
      await pick(user, 'b');

      expect(depsOf(doc, 'c')).toEqual(['b']);
    });
  });
});
