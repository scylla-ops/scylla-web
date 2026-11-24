// @vitest-environment node
import { beforeEach, describe, expect, it } from 'vitest';
import { contextStore } from '../context.store.ts';

beforeEach(() => {
  contextStore.setState({
    workspace: { id: 'workspace-1', name: 'Acme', slug: 'acme' },
    project: { id: 'project-1', name: 'Web' },
    pipeline: { id: 'pipeline-1', name: 'Deploy' },
  });
});

describe('contextStore', () => {
  it('a new workspace clears the project and the pipeline', () => {
    contextStore.getState().setWorkspace('workspace-2', 'Globex', 'globex');

    expect(contextStore.getState().project).toEqual({ id: null, name: null });
    expect(contextStore.getState().pipeline).toEqual({ id: null, name: null });
  });

  it('a new name of the same workspace keeps its id, the project and the pipeline', () => {
    contextStore.getState().renameWorkspace('Acme Inc', 'acme-inc');

    const { workspace, project, pipeline } = contextStore.getState();
    expect(workspace).toEqual({ id: 'workspace-1', name: 'Acme Inc', slug: 'acme-inc' });
    expect(project).toEqual({ id: 'project-1', name: 'Web' });
    expect(pipeline).toEqual({ id: 'pipeline-1', name: 'Deploy' });
  });
});
