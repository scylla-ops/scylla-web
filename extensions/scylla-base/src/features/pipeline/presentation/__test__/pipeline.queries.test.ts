import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { contextStore } from '@platform/context';
import { withQueryClient, withRegistry } from '@test/render.ts';
import { installTestNavigator } from '@test/navigator.ts';
import { runMutationFn, runOnSuccess, runQueryFn } from '@test/queries.ts';
import { ScyllaError, ScyllaResult } from '@shared/utils/scylla-result.ts';
import type { PipelineEntity } from '@base/features/pipeline/domain/entities/pipeline.entity.ts';
import type { PipelineMetadata } from '@base/features/pipeline/domain/structs/pipeline.struct.ts';
import type {
  PipelineRepository,
} from '@base/features/pipeline/domain/repository/pipeline.repository.ts';
import type { NodeTemplate } from '@base/features/pipeline/domain/structs/node-template.struct.ts';
import {
  pipelineMutations,
  pipelineQueries,
  nodeTemplateQueries,
} from '../pipeline.queries.ts';
import { SavePipelineUseCase } from '../../domain/use-cases/save-pipeline.use-case.ts';

const toastSuccess = vi.fn();
vi.mock('svelte-sonner', () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    warning: vi.fn(),
  },
}));

const pipeline = (overrides: Partial<PipelineEntity> = {}): PipelineEntity => ({
  id: 'pipeline-1',
  projectId: 'project-1',
  name: 'ci',
  nodes: [],
  ...overrides,
});

const metadata = (overrides: Partial<PipelineMetadata> = {}): PipelineMetadata => ({
  id: 'pipeline-1',
  projectId: 'project-1',
  name: 'ci',
  nodeCount: 2,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const paginated = <T,>(items: T[], totalCount = items.length) => ({
  items,
  pagination: {
    totalCount,
    page: 1,
    pageSize: 100,
    totalPages: 1,
    hasNext: false,
    hasPrevious: false,
  },
});

const templates: NodeTemplate[] = [
  {
    id: 'make',
    name: 'make',
    nodeId: 'build',
    definition: { kind: 'exec', command: 'make', args: [], env: [] },
  },
];

let repository: Record<keyof PipelineRepository, ReturnType<typeof vi.fn>>;
let cache: ReturnType<typeof withQueryClient>;
let restoreRegistry: () => void;
let navigator: ReturnType<typeof installTestNavigator>;

beforeEach(() => {
  repository = {
    getMetadataByProjectId: vi.fn().mockResolvedValue(ScyllaResult.success(paginated([metadata()]))),
    getMetadataByOrganizationId: vi
      .fn()
      .mockResolvedValue(ScyllaResult.success(paginated([metadata()]))),
    deleteById: vi.fn().mockResolvedValue(ScyllaResult.success(undefined)),
    run: vi.fn().mockResolvedValue(ScyllaResult.success(undefined)),
    create: vi.fn().mockResolvedValue(ScyllaResult.success(undefined)),
    getById: vi.fn().mockResolvedValue(ScyllaResult.success(pipeline())),
    edit: vi.fn().mockResolvedValue(ScyllaResult.success(pipeline())),
  };

  toastSuccess.mockClear();
  cache = withQueryClient();
  restoreRegistry = withRegistry({
    pipeline: {
      pipelineRepository: repository as unknown as PipelineRepository,
      savePipeline: new SavePipelineUseCase(repository as unknown as PipelineRepository),
      nodeTemplateRepository: { list: () => Promise.resolve(ScyllaResult.success(templates)) },
    },
  });
  navigator = installTestNavigator({ pathname: '/acme/projects/project-1' });

  contextStore.setState({
    organization: { id: null, name: null },
    project: { id: null, name: null },
    pipeline: { id: null, name: null },
  });
});

afterEach(() => {
  cache.restore();
  restoreRegistry();
  navigator.restore();
});

describe('pipelineQueries.byProject', () => {
  it('asks for the page it was given', async () => {
    const options = pipelineQueries.byProject('project-1', { page: 2, pageSize: 5 });

    await expect(runQueryFn(options)).resolves.toEqual(paginated([metadata()]));
    expect(repository.getMetadataByProjectId).toHaveBeenCalledWith('project-1', {
      page: 2,
      pageSize: 5,
    });
  });

  it('stays disabled until the caller says its container has been measured', () => {
    const pending = pipelineQueries.byProject('project-1', { page: 1, pageSize: 5 }, { enabled: false });
    expect(pending.enabled).toBe(false);

    const ready = pipelineQueries.byProject('project-1', { page: 1, pageSize: 5 });
    expect(ready.enabled).toBe(true);
  });

  it('does not query without a project', () => {
    expect(pipelineQueries.byProject('', { page: 1, pageSize: 5 }).enabled).toBe(false);
  });
});

describe('pipelineQueries.byOrganization', () => {
  it('reads one page covering the whole organization', async () => {
    await runQueryFn(pipelineQueries.byOrganization('org-1'));
    expect(repository.getMetadataByOrganizationId).toHaveBeenCalledWith('org-1', {
      page: 1,
      pageSize: 100,
    });
  });

  it('does not query for a null organizationId', () => {
    expect(pipelineQueries.byOrganization(null).enabled).toBe(false);
  });
});

describe('pipelineQueries.byId', () => {
  it('fetches the whole pipeline, nodes included', async () => {
    await expect(runQueryFn(pipelineQueries.byId('pipeline-1'))).resolves.toEqual(pipeline());
    expect(repository.getById).toHaveBeenCalledWith('pipeline-1');
  });

  it('propagates a repository failure to TanStack Query', async () => {
    const error = new ScyllaError('boom');
    repository.getById.mockResolvedValue(ScyllaResult.error(error));

    await expect(runQueryFn(pipelineQueries.byId('pipeline-1'))).rejects.toBe(error);
  });
});

describe('pipelineMutations.create', () => {
  it('invalidates that project\'s list and navigates back to it', () => {
    contextStore.setState({ project: { id: 'project-1', name: 'web' } });
    const invalidate = vi.spyOn(cache.queryClient, 'invalidateQueries');

    runOnSuccess(pipelineMutations.create(), undefined, {
      projectId: 'project-1',
      name: 'ci',
      nodes: [],
    });

    expect(toastSuccess).toHaveBeenCalledWith('Pipeline created');
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['pipelines', 'project-1'] });
    expect(navigator.navigate).toHaveBeenCalled();
  });

  it('invalidates the list of its project, but does not navigate without a project in context', () => {
    const invalidate = vi.spyOn(cache.queryClient, 'invalidateQueries');

    runOnSuccess(pipelineMutations.create(), undefined, {
      projectId: 'project-1',
      name: 'ci',
      nodes: [],
    });

    expect(toastSuccess).toHaveBeenCalledWith('Pipeline created');
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['pipelines', 'project-1'] });
    expect(navigator.navigate).not.toHaveBeenCalled();
  });
});

describe('pipelineMutations.update', () => {
  const edited = { id: 'pipeline-1', projectId: 'project-1', name: 'ci', nodes: [] };

  it('edits by id', async () => {
    await runMutationFn(pipelineMutations.update(), edited);
    expect(repository.edit).toHaveBeenCalledWith('pipeline-1', [], 'ci');
  });

  it('refuses a node id the server does not accept, in the words of the user, and sends nothing', async () => {
    const nodes = [
      { id: 'Run Tests', deps: [], env: [], kind: 'exec' as const, command: 'make', args: [] },
    ];

    await expect(runMutationFn(pipelineMutations.update(), { ...edited, nodes })).rejects.toThrow(
      'Fix the ID of these nodes before you save: Run Tests',
    );
    expect(repository.edit).not.toHaveBeenCalled();
  });

  it('invalidates the project list and the single-pipeline entry, then returns to the project', () => {
    contextStore.setState({ project: { id: 'project-1', name: 'web' } });
    const invalidate = vi.spyOn(cache.queryClient, 'invalidateQueries');

    runOnSuccess(pipelineMutations.update(), undefined, edited);

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['pipelines', 'project-1'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['pipeline', 'pipeline-1'] });
    expect(toastSuccess).toHaveBeenCalledWith('Pipeline edited');
    expect(navigator.navigate).toHaveBeenCalled();
  });

  it('does not navigate when there is no active project in context', () => {
    runOnSuccess(pipelineMutations.update(), undefined, edited);

    expect(toastSuccess).toHaveBeenCalledWith('Pipeline edited');
    expect(navigator.navigate).not.toHaveBeenCalled();
  });
});

describe('pipelineMutations.remove', () => {
  it('deletes by id, toasts, and invalidates every pipeline scope', async () => {
    await runMutationFn(pipelineMutations.remove(), 'pipeline-1');
    expect(repository.deleteById).toHaveBeenCalledWith('pipeline-1');

    const invalidate = vi.spyOn(cache.queryClient, 'invalidateQueries');
    runOnSuccess(pipelineMutations.remove(), undefined, 'pipeline-1');

    expect(toastSuccess).toHaveBeenCalledWith('Pipeline deleted');
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['pipelines'] });
  });
});

describe('pipelineMutations.duplicate', () => {
  it('reads the pipeline then saves a copy, its name still one word (<name>-copy)', async () => {
    repository.getById.mockResolvedValue(
      ScyllaResult.success(pipeline({ name: 'ci', projectId: 'project-1', nodes: [] })),
    );

    await runMutationFn(pipelineMutations.duplicate(), 'pipeline-1');

    expect(repository.getById).toHaveBeenCalledWith('pipeline-1');
    expect(repository.create).toHaveBeenCalledWith({
      name: 'ci-copy',
      projectId: 'project-1',
      nodes: [],
    });
  });

  it('propagates a failure from the read node without ever calling create', async () => {
    const error = new ScyllaError('not found');
    repository.getById.mockResolvedValue(ScyllaResult.error(error));

    await expect(runMutationFn(pipelineMutations.duplicate(), 'pipeline-1')).rejects.toBe(error);
    expect(repository.create).not.toHaveBeenCalled();
  });
});

describe('pipelineMutations.run', () => {
  it('runs the pipeline and invalidates its jobs — the run creates one', async () => {
    await runMutationFn(pipelineMutations.run(), 'pipeline-1');
    expect(repository.run).toHaveBeenCalledWith('pipeline-1');

    const invalidate = vi.spyOn(cache.queryClient, 'invalidateQueries');
    runOnSuccess(pipelineMutations.run(), undefined, 'pipeline-1');

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['jobs', 'pipeline', 'pipeline-1'] });
  });

  it('says nothing on its own', () => {
    runOnSuccess(pipelineMutations.run(), undefined, 'pipeline-1');
    expect(toastSuccess).not.toHaveBeenCalled();
  });
});

describe('nodeTemplateQueries', () => {
  it('reads the templates from the module repository, once for the whole app', async () => {
    const options = nodeTemplateQueries.list();

    expect(options.staleTime).toBe(Infinity);
    expect(await runQueryFn(options)).toEqual(templates);
  });
});
