// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  PIPELINE_KEY_MAX_LENGTH,
  fileKeyOf,
  fileWithKeyOf,
  pipelineKey,
} from '../pipeline-key.struct.ts';

const files = [
  { key: 'build', path: '.scylla/pipelines/build.yaml' },
  { key: 'deploy-api', path: '.scylla/pipelines/deploy-api.toml' },
];

describe('pipelineKey', () => {
  it('keeps the letters in lower case and the digits, with one dash for each run of other characters', () => {
    expect(pipelineKey('Build')).toBe('build');
    expect(pipelineKey('Deploy  API: v2')).toBe('deploy-api-v2');
    expect(pipelineKey('--release--')).toBe('release');
  });

  it('removes the accents, as the server does', () => {
    expect(pipelineKey('Déploiement été')).toBe('deploiement-ete');
  });

  it('gives a fallback key to a name with no letter and no digit', () => {
    expect(pipelineKey('***')).toBe('pipeline');
    expect(pipelineKey('')).toBe('pipeline');
  });

  it('cuts the key to the length of the server, with no dash at the end', () => {
    expect(pipelineKey('a'.repeat(PIPELINE_KEY_MAX_LENGTH + 10))).toHaveLength(
      PIPELINE_KEY_MAX_LENGTH,
    );
    expect(pipelineKey(`${'a'.repeat(PIPELINE_KEY_MAX_LENGTH - 1)} b`)).toBe(
      'a'.repeat(PIPELINE_KEY_MAX_LENGTH - 1),
    );
  });
});

describe('fileWithKeyOf', () => {
  it('finds the file that already has the key of the name', () => {
    expect(fileWithKeyOf('Deploy API', files)).toEqual(files[1]);
    expect(fileWithKeyOf('Lint', files)).toBeNull();
  });

  it('lets a rename keep the key of the saved name: the server checks only a new key', () => {
    expect(fileWithKeyOf('build', files, 'Build')).toBeNull();
    expect(fileWithKeyOf('build', files, 'Lint')).toEqual(files[0]);
  });
});

describe('fileKeyOf', () => {
  it('gives the name of the file with no extension', () => {
    expect(fileKeyOf('.scylla/pipelines/build.yaml')).toBe('build');
    expect(fileKeyOf('.scylla/pipeline.toml')).toBe('pipeline');
    expect(fileKeyOf('deploy')).toBe('deploy');
  });
});
