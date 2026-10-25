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
    .map(pane => within(pane).getByRole('button', { current: true }).textContent?.trim());

describe('PipelineScripting', () => {
  it('lists the jobs in the order they run, and opens the first one', () => {
    renderScripting();

    const list = screen.getByRole('navigation', { name: 'Steps' });
    const rows = within(list)
      .getAllByRole('listitem')
      .map(row => row.textContent);
    expect(rows[0]).toContain('build');
    expect(rows[1]).toContain('test');
    expect(screen.getByRole('button', { name: 'build', current: true })).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: 'Step properties' })).toBeInTheDocument();
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

    expect(screen.getByRole('button', { name: 'build', current: true })).toBeInTheDocument();
    expect(
      within(screen.getByRole('group', { name: 'Open steps' })).queryByRole('button', {
        name: 'test',
      }),
    ).not.toBeInTheDocument();
  });

  it.each([
    ['list', 'Show or hide the steps', 'navigation', 'Steps'],
    ['properties', 'Show or hide the step properties', 'complementary', 'Step properties'],
  ] as const)('hides and restores the %s with its toggle', async (_, label, role, name) => {
    const user = userEvent.setup();
    renderScripting();
    const toggle = screen.getByRole('button', { name: label });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');

    await user.click(toggle);
    expect(screen.queryByRole(role, { name })).not.toBeInTheDocument();
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    await user.click(toggle);
    expect(screen.getByRole(role, { name })).toBeInTheDocument();
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
  });

  it('shows the full document, and no jobs, while the JSON does not parse', () => {
    renderScripting('{ "nodes": [');

    expect(screen.getByRole('tab', { name: 'By step' })).toBeDisabled();
    expect(screen.getByRole('tab', { name: 'Full document', selected: true })).toBeInTheDocument();
  });

  it.each([
    ['two jobs share an id', [{ id: 'a' }, { id: 'a' }]],
    ['a job lists a dependency twice', [{ id: 'a' }, { id: 'b', deps: ['a', 'a'] }]],
  ])('shows the full document, and renders no job, when %s', (_, nodes) => {
    renderScripting(JSON.stringify({ name: 'web', nodes }));

    expect(screen.getByRole('tab', { name: 'By step' })).toBeDisabled();
    expect(screen.getByRole('tab', { name: 'Full document', selected: true })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Steps' })).not.toBeInTheDocument();
  });

  it('falls back to the full document when an edit of the text repeats a job id', async () => {
    const doc = renderScripting();
    expect(screen.getByRole('navigation', { name: 'Steps' })).toBeInTheDocument();

    doc().setScript(JSON.stringify({ name: 'web', nodes: [{ id: 'build' }, { id: 'build' }] }));

    expect(
      await screen.findByRole('tab', { name: 'Full document', selected: true }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Steps' })).not.toBeInTheDocument();
  });

  it('opens a command job as a form, with the line that runs', async () => {
    const user = userEvent.setup();
    renderScripting();

    const list = screen.getByRole('navigation', { name: 'Steps' });
    await user.click(within(list).getByRole('button', { name: /^test/ }));

    expect(screen.getByRole('button', { name: 'test', current: true })).toBeInTheDocument();
    expect(screen.getByText('make test', { selector: 'code' })).toBeInTheDocument();
  });

  it('marks only the shown job as current among the open ones, each with a close button', async () => {
    const user = userEvent.setup();
    renderScripting();
    await user.click(
      within(screen.getByRole('navigation', { name: 'Steps' })).getByRole('button', {
        name: /^test/,
      }),
    );

    const open = screen.getByRole('group', { name: 'Open steps' });
    expect(within(open).getByRole('button', { name: 'test', current: true })).toBeInTheDocument();
    expect(within(open).getByRole('button', { name: 'build', current: false })).toBeInTheDocument();
    expect(within(open).getByRole('button', { name: 'Close build' })).toBeInTheDocument();
    expect(within(open).getByRole('button', { name: 'Close test' })).toBeInTheDocument();
    expect(within(open).queryByRole('tab')).not.toBeInTheDocument();
  });

  it('opens a job to the side, in a second pane', async () => {
    renderScripting();

    await userEvent.click(screen.getByRole('button', { name: 'Actions of test' }));
    await userEvent.click(await findFloating('menuitem', 'Open to the side'));

    expect(shownJobs()).toEqual(['build', 'test']);
    expect(screen.getAllByRole('button', { name: 'Close the pane' })).toHaveLength(2);
  });

  it('puts a resize handle between the panels and the open job, and one more per open job', async () => {
    renderScripting();
    expect(screen.getAllByRole('separator', { name: 'Resize panel' })).toHaveLength(2);

    await userEvent.click(screen.getByRole('button', { name: 'Actions of test' }));
    await userEvent.click(await findFloating('menuitem', 'Open to the side'));

    expect(screen.getAllByRole('separator', { name: 'Resize panel' })).toHaveLength(3);
  });

  it('shows no properties, and a hidden handle for them, in a pipeline with no job', () => {
    renderScripting(JSON.stringify({ name: 'web', nodes: [] }));

    expect(screen.getByRole('navigation', { name: 'Steps' })).toBeInTheDocument();
    expect(screen.queryByRole('complementary', { name: 'Step properties' })).not.toBeInTheDocument();
    expect(
      globalThis.document.querySelector('[data-pane-id="jobs-view-properties"]'),
    ).toHaveAttribute('data-collapsed', '');
    // The list handle only: the one of the properties is hidden.
    const handles = screen.getAllByRole('separator', { name: 'Resize panel' });
    expect(handles.filter(handle => !handle.classList.contains('hidden'))).toHaveLength(1);
  });

  it('keeps a list that was hidden hidden when a second job opens', async () => {
    const user = userEvent.setup();
    renderScripting();
    await user.click(screen.getByRole('button', { name: 'Actions of test' }));
    await user.click(await findFloating('menuitem', 'Open to the side'));
    await user.click(screen.getByRole('button', { name: 'Show or hide the steps' }));
    expect(screen.queryByRole('navigation', { name: 'Steps' })).not.toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: 'Close the pane' })[1]);

    expect(shownJobs()).toEqual(['build']);
    expect(screen.queryByRole('navigation', { name: 'Steps' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show or hide the steps' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('adds a job after the open one, opens it, and writes it to the document', async () => {
    const user = userEvent.setup();
    const doc = renderScripting();

    await user.click(screen.getAllByRole('button', { name: 'New step' })[0]);

    expect(screen.getByRole('button', { name: 'job', current: true })).toBeInTheDocument();
    expect(doc().steps.find(step => step.id === 'job')?.deps).toEqual(['build']);
  });

  it('renames a job from its properties, and the jobs that wait for it follow', async () => {
    const user = userEvent.setup();
    const doc = renderScripting();

    const id = screen.getByRole('textbox', { name: 'Step ID' });
    await user.clear(id);
    await user.type(id, 'compile{Enter}');

    expect(screen.getByRole('button', { name: 'compile', current: true })).toBeInTheDocument();
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
      const list = screen.getByRole('navigation', { name: 'Steps' });
      await user.click(within(list).getByRole('button', { name: /^c/ }));
      await pick(user, 'b');

      expect(depsOf(doc, 'c')).toEqual(['b']);
    });
  });
});
