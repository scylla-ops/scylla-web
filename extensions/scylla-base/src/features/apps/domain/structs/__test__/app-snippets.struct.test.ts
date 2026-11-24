// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { httpExample } from '@shared/domain/structs/api-token.struct.ts';
import { ciExample } from '../app-snippets.struct.ts';

describe('app snippets', () => {
  it('calls the JSON gateway of the server with the token', () => {
    const code = httpExample('https://scylla.acme.dev/', 'ws-1');
    expect(code).toContain(
      'https://scylla.acme.dev/api/scylla.pipelines.v1.PipelineService/ListWorkspacePipelines',
    );
    expect(code).toContain('Bearer $SCYLLA_TOKEN');
    expect(code).toContain('"value": "ws-1"');
  });

  it('asks GitHub for an ID token with the server as audience, then exchanges it', () => {
    const code = ciExample('github', 'https://scylla.acme.dev', 'app-1');
    expect(code).toContain('id-token: write');
    expect(code).toContain('audience=https://scylla.acme.dev');
    expect(code).toContain('TokenService/ExchangeCiToken');
    expect(code).toContain('\\"app-1\\"');
  });

  it('declares a GitLab ID token with the server as audience', () => {
    const code = ciExample('gitlab', 'https://scylla.acme.dev', 'app-1');
    expect(code).toContain('aud: https://scylla.acme.dev');
    expect(code).toContain('$SCYLLA_ID_TOKEN');
  });
});
