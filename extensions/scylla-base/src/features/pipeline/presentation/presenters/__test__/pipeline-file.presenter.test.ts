import { describe, it, expect } from 'vitest';
import {
  checkoutRow,
  errorPlace,
  errorText,
  fileName,
  fileNotice,
  originNote,
  providerName,
  ruleRows,
  shortSha,
} from '../pipeline-file.presenter.ts';

const notice = {
  path: '.scylla/pipelines/build.toml',
  branch: 'main',
  commitSha: 'a1b2c3d4e5f6',
  errorCount: 0,
  unreadable: false,
  notFound: false,
};

describe('the names of a file', () => {
  it('shows the first 7 characters of a SHA, the name of a file, and the brand of a provider', () => {
    expect(shortSha('a1b2c3d4e5f6')).toBe('a1b2c3d');
    expect(fileName('.scylla/pipelines/build.toml')).toBe('build.toml');
    expect(fileName('pipeline.toml')).toBe('pipeline.toml');
    expect(providerName('gitlab')).toBe('GitLab');
    expect(providerName('github')).toBe('GitHub');
  });
});

describe('ruleRows', () => {
  it('gives one row per rule of on, in the order of the file format', () => {
    const rows = ruleRows({
      tag: { patterns: [] },
      push: { branches: ['main', 'release/*'], excludeBranches: ['wip/*'], skipCi: true },
      pullRequest: { branches: [], events: ['opened'], drafts: false },
    });

    expect(rows).toEqual([
      { kind: 'push', title: 'Push', detail: 'main, release/* · except wip/* · [skip ci] skipped' },
      { kind: 'pull_request', title: 'Pull request', detail: 'into each branch · drafts skipped' },
      { kind: 'tag', title: 'Tag', detail: 'each tag' },
    ]);
  });

  it('gives no row for a file with no on section: the pipeline starts on manual runs only', () => {
    expect(ruleRows({})).toEqual([]);
  });
});

describe('checkoutRow', () => {
  it('reads no settings as the default of the server: on, with the last commit only', () => {
    expect(checkoutRow(undefined)).toEqual({
      title: 'Built in',
      detail: 'before the first node, depth 1',
    });
  });

  it('names the full history, the submodules and LFS', () => {
    expect(checkoutRow({ enabled: true, depth: 0, submodules: true, lfs: true }).detail).toBe(
      'before the first node, full history · submodules · LFS',
    );
  });

  it('says that the nodes start in an empty folder when the checkout is off', () => {
    expect(checkoutRow({ enabled: false, depth: 1, submodules: false, lfs: false })).toEqual({
      title: 'Off',
      detail: 'the nodes start in an empty folder',
    });
  });
});

describe('errorPlace and errorText', () => {
  it('places an error on its line and its column, else on its line, else on the file', () => {
    expect(errorPlace({ line: 12, column: 5 })).toBe('Line 12:5');
    expect(errorPlace({ line: 12, column: 0 })).toBe('Line 12');
    expect(errorPlace({ line: 0, column: 0 })).toBe('File');
  });

  it('writes the path of the value before the message, when the error has one', () => {
    expect(errorText({ field: 'nodes[2].needs[0]', message: '"tset" is not a node' })).toBe(
      'nodes[2].needs[0]: "tset" is not a node',
    );
    expect(errorText({ field: '', message: 'expected "="' })).toBe('expected "="');
  });
});

describe('originNote', () => {
  const file = {
    source: 'file',
    filePath: '.scylla/pipelines/build.toml',
    fileErrorCount: 0,
  } as const;

  it('says how many errors the file has on the default branch', () => {
    expect(originNote({ ...file, fileErrorCount: 3 }, 'main')).toEqual({
      tone: 'error',
      text: 'build.toml has 3 errors on main',
    });
  });

  it('says that the file left the default branch, before its errors', () => {
    expect(
      originNote({ ...file, fileErrorCount: 1, removedAt: '2026-11-12T10:00:00Z' }, 'main'),
    ).toEqual({
      tone: 'muted',
      text: 'Removed from main',
    });
  });

  it('names the default branch in words while the link loads', () => {
    expect(originNote({ ...file, removedAt: '2026-11-12T10:00:00Z' })?.text).toBe(
      'Removed from the default branch',
    );
  });

  it('says nothing about a valid file or an active editor pipeline', () => {
    expect(originNote(file, 'main')).toBeNull();
    expect(originNote({ source: 'editor', filePath: '', fileErrorCount: 0 }, 'main')).toBeNull();
  });

  it('says why an archived editor pipeline is read only', () => {
    expect(
      originNote(
        { source: 'editor', filePath: '', fileErrorCount: 0, archivedAt: '2026-11-12T10:00:00Z' },
        'main',
      ),
    ).toEqual({ tone: 'muted', text: 'Archived: the project uses the repository files' });
  });
});

describe('fileNotice', () => {
  it('names the file, the branch and the commit of a valid file', () => {
    expect(fileNotice(notice)).toEqual({
      tone: 'muted',
      text: 'This pipeline comes from .scylla/pipelines/build.toml on main at a1b2c3d. Change it in the repository.',
    });
  });

  it('counts the errors of an invalid file and says that the graph is the last valid version', () => {
    expect(fileNotice({ ...notice, errorCount: 1 })).toEqual({
      tone: 'error',
      text: 'build.toml has 1 error on main at a1b2c3d. The graph shows the last valid version.',
    });
  });

  it('tells a branch with no file from a failed read', () => {
    expect(fileNotice({ ...notice, unreadable: true, notFound: true }).text).toBe(
      'This pipeline has no file on main. The graph shows the last valid version.',
    );
    expect(fileNotice({ ...notice, unreadable: true }).text).toBe(
      'Scylla could not read the file. The graph shows the last valid version.',
    );
  });
});

describe('fileNotice while the branch is not known', () => {
  it('names the default branch in words: the link loads, or the user may not read it', () => {
    expect(fileNotice({ ...notice, branch: '', notFound: true, unreadable: true }).text).toBe(
      'This pipeline has no file on the default branch. The graph shows the last valid version.',
    );
  });
});
