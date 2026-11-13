import { describe, it, expect } from 'vitest';
import type {
  FoundPipelineFile,
  PipelineFileIssue,
  PipelineFiles,
} from '@base/features/integrations/domain/structs/pipeline-files.struct.ts';
import {
  filesHeading,
  hasBlockingIssues,
  lookupIssueText,
  pipelineFileRow,
} from '../pipeline-files.presenter.ts';

const issue = (patch: Partial<PipelineFileIssue> = {}): PipelineFileIssue => ({
  path: '.scylla/pipelines/build.toml',
  line: 12,
  column: 5,
  message: 'expected "="',
  warning: false,
  ...patch,
});

const file = (patch: Partial<FoundPipelineFile> = {}): FoundPipelineFile => ({
  key: 'build',
  path: '.scylla/pipelines/build.toml',
  url: '',
  issues: [],
  triggers: [],
  ...patch,
});

const listing = (patch: Partial<PipelineFiles> = {}): PipelineFiles => ({
  commitSha: 'a1b2c3d4e5f60718',
  files: [file()],
  issues: [],
  ...patch,
});

describe('pipeline files presenter', () => {
  it('keeps a file with warnings valid, and counts only the errors', () => {
    const warned = pipelineFileRow(file({ issues: [issue({ warning: true })], triggers: ['tag'] }));
    const broken = pipelineFileRow(
      file({ issues: [issue({ warning: true, line: 2 }), issue(), issue({ line: 0 })] }),
    );

    expect(warned).toMatchObject({ valid: true, badge: 'Valid', detail: 'on: tag' });
    expect(broken).toMatchObject({
      valid: false,
      badge: '2 errors',
      detail: 'line 12: expected "="',
    });
    expect(
      hasBlockingIssues(listing({ files: [file({ issues: [issue({ warning: true })] })] })),
    ).toBe(false);
  });

  it('says that a file with no on section starts only on manual runs', () => {
    expect(pipelineFileRow(file()).detail).toBe('no on section: manual runs only');
  });

  it('gives the short commit, and says when the branch has no file', () => {
    expect(filesHeading(listing(), 'main')).toBe('Found on main at a1b2c3d');
    expect(filesHeading(listing({ files: [] }), 'main')).toBe(
      'No pipeline file on main at a1b2c3d.',
    );
  });

  it('names the file of an error of the lookup when it has one', () => {
    const twice = issue({ path: '', line: 0, message: 'two definitions of "build"' });

    expect(lookupIssueText(twice)).toBe('two definitions of "build"');
    expect(lookupIssueText(issue())).toBe('.scylla/pipelines/build.toml: line 12: expected "="');
    expect(hasBlockingIssues(listing({ issues: [twice] }))).toBe(true);
  });
});
