import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { PermissionScope, permissionsStore } from '@platform/authz';
import { contextStore } from '@platform/context';
import { installTestNavigator } from '@test/navigator.ts';
import { render, withQueryClient, withRegistry } from '@test/render.ts';
import { ScyllaError } from '@shared/utils/scylla-error.ts';
import type { PipelineFile } from '@base/features/pipeline/domain/structs/pipeline-file.struct.ts';
import FilePipelinePage from './FilePipeline.page.svelte';

const PATH = '.scylla/pipelines/build.toml';

const node = {
  id: 'build',
  deps: [],
  env: [],
  kind: 'exec' as const,
  command: 'cargo',
  args: ['build'],
};

const saved = {
  pipeline: { id: 'pipeline-1', projectId: 'project-1', name: 'build', nodes: [node] },
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

let teardown: Array<() => void> = [];
let getFile: ReturnType<typeof vi.fn>;

const setUp = (
  read: (id: string, ref?: unknown) => Promise<PipelineFile>,
  pipeline: typeof saved = saved,
) => {
  getFile = vi.fn(read);
  const cache = withQueryClient();
  teardown = [
    cache.restore,
    withRegistry({
      pipeline: {
        pipelineRepository: { getWithLayout: () => Promise.resolve(pipeline), getFile },
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

afterEach(() => teardown.forEach(restore => restore()));

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

  it('says that a file with no on section starts on manual runs only', async () => {
    setUp(() => Promise.resolve(file({ rules: {} })));

    expect(await screen.findByText('Manual runs only')).toBeInTheDocument();
  });

  it('reads the file of another branch, and lists its errors with their line', async () => {
    setUp((_id, ref) =>
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

  it('sends an editor pipeline to its editor: it has no file to show', async () => {
    const navigator = installTestNavigator({
      pathname: '/acme/projects/project-1/pipelines/pipeline-1',
    });
    teardown.push(navigator.restore);
    setUp(() => Promise.reject(new ScyllaError('no file', { code: 'FAILED_PRECONDITION' })), {
      ...saved,
      origin: { source: 'editor', filePath: '', fileErrorCount: 0 },
    });

    await vi.waitFor(() =>
      expect(navigator.navigate).toHaveBeenCalledWith('../../edit/pipeline-1', { replace: true }),
    );
    expect(screen.queryByText('From file')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
