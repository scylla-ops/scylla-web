import { describe, it, expect, vi, afterEach } from 'vitest';
import { SecretServiceClient } from '@base/generated/scylla/secret/v1/secret.client.ts';
import { JobServiceClient } from '@base/generated/scylla/job/v1/job.client.ts';
import { ScyllaError } from '@shared/utils/scylla-error.ts';
import { ScyllaGrpcTransport } from '../scylla-grpc-transport.ts';

/** A gRPC-Web answer that carries only a status, as the server gives for a refused call. */
const refusal = (status: number, message: string) =>
  new Response(null, {
    status: 200,
    headers: {
      'content-type': 'application/grpc-web+proto',
      'grpc-status': String(status),
      'grpc-message': message,
    },
  });

const transport = () => new ScyllaGrpcTransport().getTransport();
const listSecrets = () => new SecretServiceClient(transport()).listSecrets({}).response;

afterEach(() => vi.unstubAllGlobals());

describe('ScyllaGrpcTransport', () => {
  it('rejects a refused call with a ScyllaError that keeps the gRPC code', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(refusal(5, 'no such secret')));

    const error = await listSecrets().catch((thrown: unknown) => thrown);

    expect(error).toBeInstanceOf(ScyllaError);
    expect(error).toMatchObject({
      code: 'NOT_FOUND',
      message: 'no such secret',
      rpc: 'scylla.secret.v1.SecretService/ListSecrets',
      raw: true,
    });
  });

  it('decodes the percent-encoded message of the server', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(refusal(9, 'Hand%20over%20%C2%AB%20acme%20%C2%BB%20first')),
    );

    await expect(listSecrets()).rejects.toMatchObject({
      code: 'FAILED_PRECONDITION',
      message: 'Hand over « acme » first',
    });
  });

  it('calls a request that does not get to the server UNAVAILABLE, whatever the browser says', async () => {
    for (const text of ['Failed to fetch', 'Load failed', 'NetworkError when attempting to fetch']) {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError(text)));

      await expect(listSecrets()).rejects.toMatchObject({ code: 'UNAVAILABLE' });
    }
  });

  it('keeps an aborted request CANCELLED, not a network failure', async () => {
    const abort = Object.assign(new Error('The operation was aborted.'), { name: 'AbortError' });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abort));

    await expect(listSecrets()).rejects.toMatchObject({ code: 'CANCELLED' });
  });

  it('ends a server stream with a ScyllaError when the call fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(refusal(7, 'not yours')));

    const read = async () => {
      for await (const _ of new JobServiceClient(transport()).tailJobLogs({}).responses) {
        // no message comes before the failure
      }
    };

    await expect(read()).rejects.toMatchObject({ code: 'PERMISSION_DENIED', name: 'ScyllaError' });
  });
});
