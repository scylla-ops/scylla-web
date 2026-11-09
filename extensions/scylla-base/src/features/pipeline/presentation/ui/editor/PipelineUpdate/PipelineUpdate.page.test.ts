import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { PermissionScope, permissionsStore } from '@platform/authz';
import { render, withQueryClient, withRegistry } from '@test/render.ts';
import { ScyllaError } from '@shared/utils/scylla-error.ts';
import PipelineUpdatePage from './PipelineUpdate.page.svelte';

const loaded = {
  pipeline: {
    id: 'pipeline-1',
    projectId: 'project-1',
    name: 'nightly',
    nodes: [{ id: 'build', deps: [], env: [], kind: 'script', shell: 'bash', script: 'make' }],
  },
  layout: null,
};

let teardown: Array<() => void> = [];

/** Svelte sets `inert` as a property, which jsdom does not reflect as an attribute. */
const isInert = (element: Element) => {
  for (let node: Element | null = element; node; node = node.parentElement) {
    if ((node as HTMLElement).inert) return true;
  }
  return false;
};

const renderPage = (getWithLayout: () => Promise<unknown>) => {
  const cache = withQueryClient();
  teardown = [
    cache.restore,
    withRegistry({
      pipeline: {
        pipelineRepository: { getWithLayout },
        nodeTemplateRepository: { list: () => Promise.resolve([]) },
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

afterEach(() => teardown.forEach(restore => restore()));

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
});
