import { describe, expect, it } from 'vitest';
import { canGoPublic, publicationChecks } from '../publication-check.struct.ts';
import { execNode, literal, version } from './fragment-test-data.ts';

const failed = (checks: ReturnType<typeof publicationChecks>) =>
  checks.filter(check => !check.passed).map(check => check.kind);

describe('publicationChecks', () => {
  it('passes a documented version with no secret nor private default', () => {
    const checks = publicationChecks(version(1), 'acme');

    expect(failed(checks)).toEqual([]);
    expect(canGoPublic(checks)).toBe(true);
  });

  it('stops a version with a secret default, or a node that names the workspace', () => {
    const checks = publicationChecks(
      version(1, {
        nodes: [execNode('push', 'publish', '--registry', 'npm.acme.io')],
        parameters: [literal('NPM_TOKEN', 'abc123')],
      }),
      'acme',
    );

    expect(failed(checks)).toEqual(['secret-defaults', 'workspace-references']);
    expect(canGoPublic(checks)).toBe(false);
  });

  it('warns on an undocumented parameter and a private address, without stopping', () => {
    const checks = publicationChecks(
      version(1, { parameters: [literal('REGISTRY', 'registry.internal', '')] }),
      'acme',
    );

    expect(failed(checks)).toEqual(['documented', 'private-defaults']);
    expect(canGoPublic(checks)).toBe(true);
  });
});
