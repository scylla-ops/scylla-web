// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { ScyllaError } from '@shared/utils/scylla-error.ts';
import { InvalidPipelineError, SavePipelineUseCase } from '../save-pipeline.use-case.ts';
import type { PipelineRepository } from '../../repository/pipeline.repository.ts';
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

const issueOf = (saving: Promise<void>) =>
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

    expect(create).toHaveBeenCalledWith({
      projectId: 'proj',
      name: 'nightly',
      nodes: [node('build')],
    });
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

    expect(edit).toHaveBeenCalledWith('p1', [node('build')], 'nightly');
    expect(create).not.toHaveBeenCalled();
    expect(issue).toBeNull();
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

  it('sends nothing for a name of more than one word', async () => {
    const { create, repository } = repositoryWith();

    const issue = await issueOf(
      new SavePipelineUseCase(repository).execute({
        projectId: 'proj',
        name: 'my pipeline',
        nodes: [node('build')],
      }),
    );

    expect(create).not.toHaveBeenCalled();
    expect(issue).toEqual({ kind: 'name', issue: 'spaces' });
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
