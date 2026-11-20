// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { blockingErrors, type FileError } from '../pipeline-file.struct.ts';

const error = (message: string, warning: boolean): FileError => ({
  path: '.scylla/pipeline.toml',
  line: 1,
  column: 1,
  field: '',
  message,
  warning,
});

describe('blockingErrors', () => {
  it('keeps the errors and drops the warnings: a warning keeps the file valid', () => {
    const syntax = error('expected "="', false);

    expect(blockingErrors({ errors: [error('secret "TOKEN" is missing', true), syntax] })).toEqual([
      syntax,
    ]);
  });
});
