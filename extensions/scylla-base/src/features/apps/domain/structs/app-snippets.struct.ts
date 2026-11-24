import type { CiProvider } from '../entities/ci-identity.entity.ts';

const trim = (server: string) => server.replace(/\/+$/, '');

const exchange = (server: string, appId: string, idToken: string) =>
  `curl -s -X POST ${trim(server)}/api/scylla.auth.v1.TokenService/ExchangeCiToken ` +
  `-H "Content-Type: application/json" ` +
  `-d "{\\"appId\\": {\\"value\\": \\"${appId}\\"}, \\"idToken\\": \\"${idToken}\\"}" | jq -r .token.value`;

/**
 * The steps of a CI job that get a short token of the app from the ID token of the job. The
 * audience of the ID token is the address of the server.
 */
export const ciExample = (provider: CiProvider, server: string, appId: string): string => {
  const audience = trim(server);
  if (provider === 'github') {
    return [
      'permissions:',
      '  id-token: write',
      'steps:',
      '  - name: Sign in to Scylla',
      '    run: |',
      `      ID_TOKEN=$(curl -s -H "Authorization: bearer $ACTIONS_ID_TOKEN_REQUEST_TOKEN" "$ACTIONS_ID_TOKEN_REQUEST_URL&audience=${audience}" | jq -r .value)`,
      `      echo "SCYLLA_TOKEN=$(${exchange(server, appId, '$ID_TOKEN')})" >> "$GITHUB_ENV"`,
    ].join('\n');
  }
  return [
    'scylla:',
    '  id_tokens:',
    '    SCYLLA_ID_TOKEN:',
    `      aud: ${audience}`,
    '  script:',
    `    - export SCYLLA_TOKEN=$(${exchange(server, appId, '$SCYLLA_ID_TOKEN')})`,
  ].join('\n');
};

/** The first exchange of a machine with a key pair, before the SDKs. */
export const JOIN_METHOD = 'POST /api/scylla.auth.v1.TokenService/JoinApp';
