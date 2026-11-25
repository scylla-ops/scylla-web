// @vitest-environment node
import { describe, it, expect } from 'vitest';
import type { PipelineOrigin } from '@base/features/pipeline/domain/entities/pipeline.entity.ts';
import { gitEventsState } from '../git-events.presenter.ts';

const editor: PipelineOrigin = { source: 'editor', filePath: '', fileErrorCount: 0 };
const file: PipelineOrigin = {
  source: 'file',
  filePath: '.scylla/pipelines/build.yaml',
  fileErrorCount: 0,
};

describe('gitEventsState', () => {
  it('waits for an admin for a Scylla pipeline in a project of files', () => {
    expect(gitEventsState(editor, 'file')).toEqual({ needed: true, allowed: false });
    expect(gitEventsState({ ...editor, gitEventsAllowedAt: '2026-11-25T10:00:00Z' }, 'file')).toEqual(
      { needed: true, allowed: true },
    );
  });

  it('needs no opt-in for a file pipeline, in a project of the editor, or while it loads', () => {
    expect(gitEventsState(file, 'file')).toEqual({ needed: false, allowed: true });
    expect(gitEventsState(editor, 'editor')).toEqual({ needed: false, allowed: true });
    expect(gitEventsState(undefined, 'file')).toEqual({ needed: false, allowed: true });
    expect(gitEventsState(editor, undefined)).toEqual({ needed: false, allowed: true });
  });
});
