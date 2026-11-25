// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { ScyllaError } from '@shared/utils/scylla-error.ts';
import { InvalidPipelineError, SavePipelineUseCase } from '../save-pipeline.use-case.ts';
import type { PipelineRepository } from '../../repository/pipeline.repository.ts';
import type { FragmentRepository } from '../../repository/fragment.repository.ts';
import type { PipelineNodeEntity } from '@base/features/pipeline/domain/entities/pipeline-node.entity.ts';

const node = (id: string): PipelineNodeEntity => ({
  id,
  deps: [],
  env: [],
  kind: 'script',
  shell: 'sh',
  script: 'make',
});

const repositoryWith = () => {
  const create = vi.fn().mockResolvedValue(undefined);
  const edit = vi
    .fn()
    .mockResolvedValue({ id: 'p1', projectId: 'proj', name: 'nightly', nodes: [] });
  return { create, edit, repository: { create, edit } as unknown as PipelineRepository };
};

const issueOf = (saving: Promise<unknown>) =>
  saving.then(
    () => null,
    (error: unknown) => (error instanceof InvalidPipelineError ? error.issue : error),
  );

describe('SavePipelineUseCase', () => {
  it('creates a pipeline that has no id yet', async () => {
    const { create, edit, repository } = repositoryWith();

    const issue = await issueOf(
      new SavePipelineUseCase(repository).execute({
        projectId: 'proj',
        name: 'nightly',
        nodes: [node('build')],
      }),
    );

    expect(create).toHaveBeenCalledWith(
      { projectId: 'proj', name: 'nightly', nodes: [node('build')] },
      undefined,
    );
    expect(edit).not.toHaveBeenCalled();
    expect(issue).toBeNull();
  });

  it('edits a pipeline that has an id', async () => {
    const { create, edit, repository } = repositoryWith();

    const issue = await issueOf(
      new SavePipelineUseCase(repository).execute({
        id: 'p1',
        projectId: 'proj',
        name: 'nightly',
        nodes: [node('build')],
      }),
    );

    expect(edit).toHaveBeenCalledWith('p1', [node('build')], 'nightly', undefined, undefined);
    expect(create).not.toHaveBeenCalled();
    expect(issue).toBeNull();
  });

  it('sends the fragment links with the nodes of the edit', async () => {
    const { edit, repository } = repositoryWith();
    const links = [{ blockId: 'ci', fragmentId: 'f1', version: 1, values: {}, nodeIds: ['build'] }];

    await new SavePipelineUseCase(repository).execute({
      id: 'p1',
      projectId: 'proj',
      name: 'nightly',
      nodes: [node('build')],
      links,
    });

    expect(edit).toHaveBeenCalledWith('p1', [node('build')], 'nightly', undefined, links);
  });

  it('sends nothing for a node id the server refuses, and names every refused id', async () => {
    const { create, edit, repository } = repositoryWith();

    const issue = await issueOf(
      new SavePipelineUseCase(repository).execute({
        id: 'p1',
        projectId: 'proj',
        name: 'nightly',
        nodes: [node('Build'), node('test'), node('déployer')],
      }),
    );

    expect(create).not.toHaveBeenCalled();
    expect(edit).not.toHaveBeenCalled();
    expect(issue).toEqual({ kind: 'node-ids', ids: ['Build', 'déployer'] });
  });

  it('sends the needs with their ports, and the places of the new nodes, in one save', async () => {
    const { edit, repository } = repositoryWith();
    const nodes: PipelineNodeEntity[] = [
      node('test'),
      { ...node('notify'), deps: [{ node: 'test', port: 'error' }] },
    ];
    const layout = { nodes: { notify: { x: 5, y: 6 } } };

    const issue = await issueOf(
      new SavePipelineUseCase(repository).execute({
        id: 'p1',
        projectId: 'proj',
        name: 'nightly',
        nodes,
        layout,
      }),
    );

    expect(issue).toBeNull();
    expect(edit).toHaveBeenCalledWith('p1', nodes, 'nightly', layout, undefined);
  });

  it('sends nothing for a need on a port that its node does not have', async () => {
    const { create, repository } = repositoryWith();

    const issue = await issueOf(
      new SavePipelineUseCase(repository).execute({
        projectId: 'proj',
        name: 'nightly',
        nodes: [node('build'), { ...node('deploy'), deps: [{ node: 'build', port: 'true' }] }],
      }),
    );

    expect(create).not.toHaveBeenCalled();
    expect(issue).toEqual({ kind: 'nodes', ids: ['deploy'] });
  });

  it('sends nothing for a name of more than one word', async () => {
    const { create, repository } = repositoryWith();

    const issue = await issueOf(
      new SavePipelineUseCase(repository).execute({
        projectId: 'proj',
        name: 'a\nb',
        nodes: [node('build')],
      }),
    );

    expect(create).not.toHaveBeenCalled();
    expect(issue).toEqual({ kind: 'name', issue: 'not-one-line' });
  });

  it('gives back the error of the server', async () => {
    const { create, repository } = repositoryWith();
    const refused = new ScyllaError('refused', { code: 'INVALID_ARGUMENT' });
    create.mockRejectedValue(refused);

    const issue = await issueOf(
      new SavePipelineUseCase(repository).execute({
        projectId: 'proj',
        name: 'nightly',
        nodes: [node('build')],
      }),
    );

    expect(issue).toBe(refused);
  });
});

describe('SavePipelineUseCase: the links of the blocks', () => {
  const version = {
    number: 1,
    nodes: [node('lint')],
    parameters: [],
    changes: [],
    author: { id: 'rem', name: 'Rem' },
    publishedAt: '',
  };
  const link = {
    blockId: 'checks',
    fragmentId: 'f1',
    version: 1,
    values: {},
    nodeIds: ['checks-lint'],
  };
  const fragments = (getById: () => Promise<unknown>) =>
    ({ getById: vi.fn(getById) }) as unknown as FragmentRepository;
  const save = (nodes: PipelineNodeEntity[], repo: FragmentRepository) => {
    const { edit, repository } = repositoryWith();
    const detached = new SavePipelineUseCase(repository, repo).execute({
      id: 'p1',
      projectId: 'proj',
      name: 'nightly',
      nodes,
      links: [link],
      workspaceId: 'ws',
    });
    return { edit, detached };
  };

  it('keeps the link of a block whose nodes still run its version', async () => {
    const { edit, detached } = save(
      [{ ...node('checks-lint') }],
      fragments(() => Promise.resolve({ versions: [version] })),
    );

    expect(await detached).toEqual([]);
    expect(edit.mock.calls[0][4]).toEqual([link]);
  });

  it('drops the link of a block whose nodes were edited in the scripting tab, and says so', async () => {
    const edited = { ...node('checks-lint'), script: 'make --edited' };
    const { edit, detached } = save(
      [edited],
      fragments(() => Promise.resolve({ versions: [version] })),
    );

    expect(await detached).toEqual(['checks']);
    expect(edit.mock.calls[0][4]).toEqual([]);
  });

  it('keeps a link whose fragment cannot be read', async () => {
    const edited = { ...node('checks-lint'), script: 'make --edited' };
    const { edit, detached } = save(
      [edited],
      fragments(() => Promise.reject(new Error('gone'))),
    );

    expect(await detached).toEqual([]);
    expect(edit.mock.calls[0][4]).toEqual([link]);
  });
});
