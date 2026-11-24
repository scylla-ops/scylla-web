import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { flushSync } from 'svelte';
import { screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { holdsLeave } from '@scylla/core-sdk';
import { PermissionScope, permissionsStore } from '@platform/authz';
import { contextStore } from '@platform/context';
import { installTestNavigator } from '@test/navigator.ts';
import { findFloating, render, withQueryClient, withRegistry } from '@test/render.ts';
import { ScyllaError } from '@shared/utils/scylla-error.ts';
import type { PipelineRepository } from '@base/features/pipeline/domain/repository/pipeline.repository.ts';
import { SavePipelineUseCase } from '@base/features/pipeline/domain/use-cases/save-pipeline.use-case.ts';
import PipelineUpdatePage from './PipelineUpdate.page.svelte';

const loaded = {
  pipeline: {
    id: 'pipeline-1',
    projectId: 'project-1',
    name: 'nightly',
    nodes: [{ id: 'build', deps: [], env: [], kind: 'script', shell: 'bash', script: 'make' }],
  },
  layout: null,
  origin: { source: 'editor', filePath: '', fileErrorCount: 0 },
};

let teardown: Array<() => void> = [];

/** Svelte sets `inert` as a property, which jsdom does not reflect as an attribute. */
const isInert = (element: Element) => {
  for (let node: Element | null = element; node; node = node.parentElement) {
    if ((node as HTMLElement).inert) return true;
  }
  return false;
};

const renderPage = (
  getWithLayout: () => Promise<unknown>,
  edit: () => Promise<unknown> = () => new Promise(() => {}),
  setAgentLabels: (id: string, labels: string[]) => Promise<unknown> = () => new Promise(() => {}),
) => {
  const cache = withQueryClient();
  const pipelineRepository = { getWithLayout, edit, setAgentLabels };
  teardown = [
    cache.restore,
    withRegistry({
      pipeline: {
        pipelineRepository,
        savePipeline: new SavePipelineUseCase(pipelineRepository as unknown as PipelineRepository),
        nodeTemplateRepository: { list: () => Promise.resolve([]) },
        fragmentRepository: { list: () => Promise.resolve([]), linksOf: () => Promise.resolve([]) },
      },
    }),
  ];
  return render(PipelineUpdatePage, { pipelineId: 'pipeline-1' });
};

beforeEach(() =>
  permissionsStore.setState({
    permissions: {
      scopes: [{ scope: PermissionScope.SYSTEM, scopeId: '', access: { kind: 'fullControl' } }],
    },
  }),
);

afterEach(() => {
  teardown.forEach(restore => restore());
  contextStore.setState({ project: { id: null, name: null } });
});

/** Renames the pipeline in the header, then saves it. */
const renameAndSave = async () => {
  const name = await screen.findByDisplayValue('nightly');
  await userEvent.type(name, '-v2{Enter}');
  await userEvent.click(screen.getByRole('button', { name: 'Save' }));
};

/** The router asks the leave guard at each navigation: the fake navigator records its answer. */
const recordLeaves = () => {
  const navigator = installTestNavigator({ pathname: '/acme/projects/project-1/edit/pipeline-1' });
  teardown.push(navigator.restore);
  const held: boolean[] = [];
  navigator.navigate.mockImplementation(() => {
    held.push(holdsLeave(vi.fn()));
  });
  return { navigator, held };
};

describe('PipelineUpdatePage', () => {
  it('shows the frame of the editor while the pipeline loads, with nothing to save', () => {
    renderPage(() => new Promise(() => {}));

    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    expect(screen.getByRole('tab', { name: 'Scripting' })).toBeDisabled();
    expect(screen.queryByText('All changes saved')).not.toBeInTheDocument();
    expect(screen.queryByText('Add a node')).not.toBeInTheDocument();
  });

  it('shows a failed load inside the canvas, and loads again on Try again', async () => {
    const getWithLayout = vi
      .fn()
      .mockRejectedValueOnce(new ScyllaError('down', { code: 'UNAVAILABLE' }))
      .mockResolvedValueOnce(loaded);
    renderPage(getWithLayout);

    expect(
      await screen.findByRole('heading', { name: "Couldn't load the pipeline" }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByDisplayValue('nightly')).toBeInTheDocument();
    expect(getWithLayout).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('heading', { name: "Couldn't load the pipeline" })).not.toBeInTheDocument();
  });

  it('keeps the side panel covered and inert until the graph is fitted', async () => {
    renderPage(() => Promise.resolve(loaded));

    expect(await screen.findByDisplayValue('nightly')).toBeInTheDocument();
    // jsdom measures nothing: Svelte Flow never fits the view, so the canvas stays not ready.
    const palette = await screen.findByText('Add a node');
    const canvas = await screen.findByRole('application', { name: 'Blueprint' });

    expect(isInert(palette)).toBe(true);
    expect(isInert(canvas)).toBe(true);
    expect(document.querySelector('[data-slot="canvas-curtain"]')).toBeInTheDocument();
  });

  it('puts the side panel under the canvas in a narrow blueprint, and right of it in a wide one', async () => {
    type Notify = (entries: Array<{ contentRect: { width: number } }>) => void;
    const observed: Array<{ element: Element; notify: Notify }> = [];
    vi.stubGlobal(
      'ResizeObserver',
      class {
        readonly #notify: Notify;
        constructor(notify: Notify) {
          this.#notify = notify;
        }
        observe = (element: Element) => observed.push({ element, notify: this.#notify });
        unobserve = vi.fn();
        disconnect = vi.fn();
      },
    );
    renderPage(() => Promise.resolve(loaded));
    const separator = () => screen.getByRole('separator', { name: 'Resize panel' });
    /** The blueprint measures the box around its panes, not the viewport. */
    const resizeBlueprint = (width: number) => {
      const blueprint = separator().closest('[data-pane-group]')?.parentElement;
      for (const { element, notify } of observed) {
        if (element === blueprint) notify([{ contentRect: { width } }]);
      }
      flushSync();
    };

    expect(await screen.findByText('Add a node')).toBeInTheDocument();
    expect(separator()).toHaveAttribute('data-direction', 'horizontal');

    resizeBlueprint(390);
    expect(separator()).toHaveAttribute('data-direction', 'vertical');
    expect(screen.getByText('Add a node')).toBeInTheDocument();

    resizeBlueprint(1280);
    expect(separator()).toHaveAttribute('data-direction', 'horizontal');
  });

  it('keeps Export inert for a saved pipeline with a merge, and says why', async () => {
    const [build] = loaded.pipeline.nodes;
    renderPage(() =>
      Promise.resolve({
        ...loaded,
        pipeline: {
          ...loaded.pipeline,
          nodes: [build, { id: 'm', deps: [{ node: 'build' }], kind: 'merge' }],
        },
      }),
    );

    await screen.findByDisplayValue('nightly');
    const exportButton = screen.getByRole('button', { name: 'Export' });

    expect(exportButton).toHaveAttribute('aria-disabled', 'true');
    expect(exportButton).toHaveAccessibleDescription(
      'The saved pipeline has a switch, a merge or a node linked to an error output. A file cannot hold them yet.',
    );
  });

  it('shows a name as unsaved while it is typed', async () => {
    renderPage(() => Promise.resolve(loaded));
    const name = await screen.findByDisplayValue('nightly');
    expect(screen.getByText('All changes saved')).toBeInTheDocument();

    await userEvent.type(name, '-v2');

    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
  });

  it('goes back to the project after a save, with no leave dialog and no unsaved status', async () => {
    contextStore.setState({ project: { id: 'project-1', name: 'web' } });
    const { navigator, held } = recordLeaves();
    let succeed: (pipeline: unknown) => void = () => {};
    // The saved pipeline is read again after the save: it has not come back yet.
    const getWithLayout = vi
      .fn()
      .mockResolvedValueOnce(loaded)
      .mockReturnValue(new Promise(() => {}));
    renderPage(getWithLayout, () => new Promise(resolve => (succeed = resolve)));

    await renameAndSave();
    expect(screen.getByText('Saving…')).toBeInTheDocument();
    succeed(loaded.pipeline);

    await vi.waitFor(() => expect(navigator.navigate).toHaveBeenCalledOnce());
    expect(held).toEqual([false]);
    expect(screen.getByText('All changes saved')).toBeInTheDocument();
    expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('keeps the leave guard after a failed save, and tells the conflict in the words of the app', async () => {
    contextStore.setState({ project: { id: 'project-1', name: 'web' } });
    const { navigator } = recordLeaves();
    renderPage(
      () => Promise.resolve(loaded),
      () =>
        Promise.reject(
          new ScyllaError('the pipeline changed: read it again', { code: 'ABORTED', raw: true }),
        ),
    );

    await renameAndSave();

    expect(
      await screen.findByText(
        'Someone else changed this item in the meantime. Check the latest version and try again.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText('the pipeline changed: read it again')).not.toBeInTheDocument();
    expect(navigator.navigate).not.toHaveBeenCalled();
    expect(holdsLeave(vi.fn())).toBe(true);
    expect(await screen.findByRole('alertdialog')).toHaveTextContent('Leave without saving?');
  });

  it('saves the agent labels at once, apart from the nodes', async () => {
    const setAgentLabels = vi.fn((_id: string, labels: string[]) =>
      Promise.resolve({ ...loaded.pipeline, agentLabels: labels }),
    );
    const labelled = { ...loaded, pipeline: { ...loaded.pipeline, agentLabels: ['deploy'] } };
    const edit = vi.fn(() => new Promise(() => {}));
    renderPage(() => Promise.resolve(labelled), edit, setAgentLabels);
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: /Agent labels/ }));
    // jsdom leaves the floating layer `visibility: hidden`, and a hidden field has no name.
    const field = await screen.findByPlaceholderText('deploy');
    // The caret goes to the new label, not to the remove button of the first label.
    await waitFor(() => expect(field).toHaveFocus());
    await user.type(field, 'linux{Enter}');
    await user.click(await findFloating('button', 'Save labels'));

    await waitFor(() =>
      expect(setAgentLabels).toHaveBeenCalledWith('pipeline-1', ['deploy', 'linux']),
    );
    expect(await screen.findByRole('button', { name: /Agent labels 2/ })).toBeInTheDocument();
    expect(edit).not.toHaveBeenCalled();
  });

  it('sends a file pipeline to its read-only page: its file changes in the repository', async () => {
    const navigator = installTestNavigator({
      pathname: '/acme/projects/project-1/edit/pipeline-1',
    });
    teardown.push(navigator.restore);
    renderPage(() =>
      Promise.resolve({
        ...loaded,
        origin: { source: 'file', filePath: '.scylla/pipeline.toml', fileErrorCount: 0 },
      }),
    );

    await vi.waitFor(() =>
      expect(navigator.navigate).toHaveBeenCalledWith('../../pipelines/pipeline-1', {
        replace: true,
      }),
    );
  });
});
