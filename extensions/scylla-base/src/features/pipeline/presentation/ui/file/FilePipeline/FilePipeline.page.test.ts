import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { Permission, PermissionScope, permissionsStore } from '@platform/authz';
import { contextStore } from '@platform/context';
import { installTestNavigator } from '@test/navigator.ts';
import { render, withQueryClient, withRegistry } from '@test/render.ts';
import { ScyllaError } from '@shared/utils/scylla-error.ts';
import type { PipelineNodeEntity } from '@base/features/pipeline/domain/entities/pipeline-node.entity.ts';
import type { PipelineFile } from '@base/features/pipeline/domain/structs/pipeline-file.struct.ts';
import FilePipelinePage from './FilePipeline.page.svelte';

const PATH = '.scylla/pipelines/build.toml';
const PAGE = '/acme/projects/project-1/pipelines/pipeline-1';

const node: PipelineNodeEntity = {
  id: 'build',
  deps: [],
  env: [],
  kind: 'exec' as const,
  command: 'cargo',
  args: ['build'],
};

const savedNodes: PipelineNodeEntity[] = [node];

const saved = {
  pipeline: { id: 'pipeline-1', projectId: 'project-1', name: 'build', nodes: savedNodes },
  layout: null,
  origin: { source: 'file', filePath: PATH, fileErrorCount: 0 },
};

const file = (overrides: Partial<PipelineFile> = {}): PipelineFile => ({
  key: 'build',
  path: PATH,
  commitSha: 'a1b2c3d4e5f6',
  url: `https://github.com/acme/api/blob/a1b2c3d4e5f6/${PATH}`,
  format: 'toml',
  content: 'version = 1\n',
  name: 'build',
  nodes: [node],
  rules: { push: { branches: ['main'], excludeBranches: [], skipCi: false } },
  errors: [],
  ...overrides,
});

const link = {
  projectId: 'project-1',
  provider: 'github',
  fullName: 'acme/api',
  defaultBranch: 'main',
};

const refs = [
  { name: 'main', kind: 'branch', sha: 'a1b2c3d4e5f6', defaultBranch: true, webUrl: '' },
  { name: 'feature/bench', kind: 'branch', sha: 'd4e5f6a7b8c9', defaultBranch: false, webUrl: '' },
];

const test: PipelineNodeEntity = {
  id: 'test',
  deps: [{ node: 'build' }],
  kind: 'script',
  shell: 'bash',
  script: ['set -eu', 'pnpm test'].join('\n'),
  env: [
    { key: 'CI', kind: 'literal', value: 'true' },
    { key: 'NPM_TOKEN', kind: 'secret', secretRef: 'npm-token' },
  ],
  workingDir: 'web',
  timeoutSeconds: 1200,
  retries: 2,
  image: 'node:24',
};

let teardown: Array<() => void> = [];
let getFile: ReturnType<typeof vi.fn>;
let saveLayout: ReturnType<typeof vi.fn>;

const setUp = (
  read: (id: string, ref?: unknown) => Promise<PipelineFile>,
  pipeline: typeof saved = saved,
  search = '',
) => {
  getFile = vi.fn(read);
  saveLayout = vi.fn(() => Promise.resolve());
  const cache = withQueryClient();
  const navigator = installTestNavigator({ pathname: PAGE, search });
  teardown = [
    cache.restore,
    navigator.restore,
    withRegistry({
      pipeline: {
        pipelineRepository: { getWithLayout: () => Promise.resolve(pipeline), getFile, saveLayout },
        nodeTemplateRepository: { list: () => Promise.resolve([]) },
      },
      integrations: {
        repositoryLinkRepository: {
          getByProject: () => Promise.resolve(link),
          listRefs: () => Promise.resolve({ refs, nextPageToken: '' }),
        },
      },
    }),
  ];
  render(FilePipelinePage, { projectId: 'project-1', pipelineId: 'pipeline-1' });
  return navigator;
};

beforeEach(() => {
  permissionsStore.setState({
    permissions: {
      scopes: [{ scope: PermissionScope.SYSTEM, scopeId: '', access: { kind: 'fullControl' } }],
    },
  });
  contextStore.setState({
    workspace: { id: 'org-1', name: 'Acme', slug: 'acme' },
    project: { id: 'project-1', name: 'api' },
  });
});

afterEach(() => {
  vi.useRealTimers();
  teardown.forEach(restore => restore());
});

/** A place goes to the server 500 ms after the last move. */
const arrange = async () => {
  await screen.findByRole('heading', { name: 'Pipeline file' });
  vi.useFakeTimers({ shouldAdvanceTime: true });
  await userEvent.click(await screen.findByRole('button', { name: 'Arrange' }));
  await vi.advanceTimersByTimeAsync(600);
};

describe('FilePipelinePage', () => {
  it('shows the pipeline of the file read only, with the file, the branch and the commit', async () => {
    setUp(() => Promise.resolve(file()));

    const notice = await screen.findByRole('note');
    expect(notice).toHaveTextContent(
      `This pipeline comes from ${PATH} on main at a1b2c3d. Change it in the repository.`,
    );
    expect(screen.getByRole('link', { name: 'View file on GitHub' })).toHaveAttribute(
      'href',
      `https://github.com/acme/api/blob/a1b2c3d4e5f6/${PATH}`,
    );
    expect(screen.getByText('From file')).toBeInTheDocument();
    expect(getFile).toHaveBeenCalledWith('pipeline-1', undefined);
  });

  it('lists the triggers of on and the checkout in the locked panel, in place of the palette', async () => {
    setUp(() => Promise.resolve(file()));

    expect(await screen.findByRole('heading', { name: 'Pipeline file' })).toBeInTheDocument();
    expect(screen.getByText('Push')).toBeInTheDocument();
    expect(screen.getByText('main')).toBeInTheDocument();
    expect(screen.getByText('Built in')).toBeInTheDocument();
    expect(screen.queryByText('Add a node')).not.toBeInTheDocument();
  });

  it('opens a node of the file read only, with each of its fields, and goes back to the file', async () => {
    const withTest = { ...saved, pipeline: { ...saved.pipeline, nodes: [node, test] } };
    setUp(() => Promise.resolve(file({ nodes: [node, test] })), withTest);

    await userEvent.click(await screen.findByRole('button', { name: /^test/ }));

    expect(await screen.findByRole('heading', { name: 'test' })).toBeInTheDocument();
    expect(screen.getByText('After')).toBeInTheDocument();
    expect(screen.getByText('Script · bash').closest('section')).toHaveTextContent(
      'set -eu pnpm test',
    );
    expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument();
    expect(screen.getByText('Working directory').nextElementSibling).toHaveTextContent('web');
    expect(screen.getByText('Container image').nextElementSibling).toHaveTextContent('node:24');
    expect(screen.getByText('Timeout').nextElementSibling).toHaveTextContent('20m 0s');
    expect(screen.getByText('Retries').nextElementSibling).toHaveTextContent('2');
    expect(screen.getByText('NPM_TOKEN').nextElementSibling).toHaveTextContent('npm-token');
    expect(screen.getByText('Read only. Change this node in the file of the repository.')).toBeInTheDocument();
    // Nothing edits the node.
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete the node' })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Pipeline file' }));

    expect(await screen.findByRole('heading', { name: 'Pipeline file' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View file on GitHub' })).toBeInTheDocument();
  });

  it('saves the places of an arrange, and leaves the file and the pipeline as they are', async () => {
    setUp(() => Promise.resolve(file()));

    await arrange();

    expect(saveLayout).toHaveBeenCalledWith(
      'pipeline-1',
      expect.objectContaining({ nodes: { build: expect.any(Object) } }),
    );
    expect(screen.getByText(/Scylla keeps their places/)).toBeInTheDocument();
    expect(getFile).toHaveBeenCalledTimes(1);
  });

  it('moves the nodes for the visit only when the reader cannot change the pipeline', async () => {
    permissionsStore.setState({
      permissions: {
        scopes: [
          {
            scope: PermissionScope.SYSTEM,
            scopeId: '',
            access: { kind: 'restricted', permissions: [Permission.READ_PIPELINE] },
          },
        ],
      },
    });
    setUp(() => Promise.resolve(file()));

    await arrange();

    expect(saveLayout).not.toHaveBeenCalled();
    expect(screen.queryByText(/Scylla keeps their places/)).not.toBeInTheDocument();
  });

  it('says that a file with no on section starts on manual runs only', async () => {
    setUp(() => Promise.resolve(file({ rules: {} })));

    expect(await screen.findByText('Manual runs only')).toBeInTheDocument();
  });

  it('reads the file of another branch, and lists its errors with their line', async () => {
    const navigator = setUp((_id, ref) =>
      Promise.resolve(
        ref
          ? file({
              commitSha: 'd4e5f6a7b8c9',
              url: '',
              nodes: [],
              errors: [
                {
                  path: PATH,
                  line: 12,
                  column: 5,
                  field: '',
                  message: 'expected "="',
                  warning: false,
                },
                {
                  path: PATH,
                  line: 14,
                  column: 12,
                  field: 'nodes[2].needs[0]',
                  message: '"tset" is not a node',
                  warning: false,
                },
              ],
            })
          : file(),
      ),
    );
    await screen.findByRole('note');

    await userEvent.click(screen.getByRole('combobox', { name: 'Branch' }));
    const rows = await screen.findAllByRole('option', { hidden: true });
    await userEvent.click(rows.find(row => row.textContent?.includes('feature/bench'))!);

    await waitFor(() =>
      expect(getFile).toHaveBeenCalledWith('pipeline-1', { kind: 'branch', name: 'feature/bench' }),
    );
    // In the URL, so that a copied link opens the same branch.
    expect(navigator.navigate).toHaveBeenCalledWith(`${PAGE}?ref=branch%3Afeature%2Fbench`, {
      replace: true,
    });
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'build.toml has 2 errors on feature/bench at d4e5f6a. The graph shows the last valid version.',
    );
    expect(screen.getByRole('heading', { name: 'Errors on feature/bench' })).toBeInTheDocument();
    expect(screen.getByText('Line 12:5')).toBeInTheDocument();
    expect(screen.getByText('nodes[2].needs[0]: "tset" is not a node')).toBeInTheDocument();
    // A file of an error of the lookup has no page on the provider.
    expect(screen.queryByRole('link', { name: /View file/ })).not.toBeInTheDocument();
  });

  it('says that the branch has no file, and keeps the last valid version', async () => {
    setUp(() => Promise.reject(new ScyllaError('no file', { code: 'NOT_FOUND' })));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This pipeline has no file on main. The graph shows the last valid version.',
    );
    expect(screen.getByRole('tab', { name: 'Scripting' })).toBeDisabled();
  });

  it('opens the branch and the tab of a link, so that a copied link shows the same view', async () => {
    setUp(() => Promise.resolve(file()), saved, '?ref=branch%3Afeature%2Fbench&tab=scripting');

    await waitFor(() =>
      expect(getFile).toHaveBeenCalledWith('pipeline-1', { kind: 'branch', name: 'feature/bench' }),
    );
    expect(
      await screen.findByRole('tab', { name: 'Scripting', selected: true }),
    ).toBeInTheDocument();
  });

  it('writes the open tab in the URL, and names no tab for the graph, the default one', async () => {
    const navigator = setUp(() => Promise.resolve(file()));
    await screen.findByRole('note');

    await userEvent.click(screen.getByRole('tab', { name: 'Scripting' }));
    expect(navigator.navigate).toHaveBeenLastCalledWith(`${PAGE}?tab=scripting`, { replace: true });
    expect(screen.getByRole('tab', { name: 'Scripting', selected: true })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('tab', { name: 'Blueprint' }));
    expect(navigator.navigate).toHaveBeenLastCalledWith(PAGE, { replace: true });
  });

  it('sends an editor pipeline to its editor: it has no file to show', async () => {
    const navigator = setUp(
      () => Promise.reject(new ScyllaError('no file', { code: 'FAILED_PRECONDITION' })),
      {
        ...saved,
        origin: { source: 'editor', filePath: '', fileErrorCount: 0 },
      },
    );

    await vi.waitFor(() =>
      expect(navigator.navigate).toHaveBeenCalledWith('../../edit/pipeline-1', { replace: true }),
    );
    expect(screen.queryByText('From file')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
