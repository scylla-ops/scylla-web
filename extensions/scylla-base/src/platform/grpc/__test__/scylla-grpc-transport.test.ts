import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { base64encode } from '@protobuf-ts/runtime';
import { SecretServiceClient } from '@base/generated/scylla/projects/v1/secret_service.client.ts';
import { JobServiceClient } from '@base/generated/scylla/pipelines/v1/job_service.client.ts';
import { Status } from '@base/generated/google/rpc/status.ts';
import { BadRequest, ErrorInfo } from '@base/generated/google/rpc/error_details.ts';
import { RefreshResponse } from '@base/generated/scylla/auth/v1/token_service.ts';
import { ScyllaError } from '@shared/utils/scylla-error.ts';
import { ScyllaGrpcTransport } from '../scylla-grpc-transport.ts';
import { forgetSession, openSession } from '../session.ts';

/** A gRPC-Web answer that carries only a status, as the server gives for a refused call. */
const refusal = (status: number, message: string, details?: Status) =>
  new Response(null, {
    status: 200,
    headers: {
      'content-type': 'application/grpc-web+proto',
      'grpc-status': String(status),
      'grpc-message': message,
      ...(details && { 'grpc-status-details-bin': base64encode(Status.toBinary(details)) }),
    },
  });

/** A gRPC-Web answer with one message and an OK status in the trailers. */
const answer = (message: Uint8Array) => {
  const trailer = new TextEncoder().encode('grpc-status: 0\r\n');
  const frame = (flag: number, bytes: Uint8Array) => {
    const out = new Uint8Array(5 + bytes.length);
    out[0] = flag;
    new DataView(out.buffer).setUint32(1, bytes.length);
    out.set(bytes, 5);
    return out;
  };
  const body = new Uint8Array([...frame(0, message), ...frame(0x80, trailer)]);
  return new Response(body, {
    status: 200,
    headers: { 'content-type': 'application/grpc-web+proto' },
  });
};

const urlOf = (input: RequestInfo | URL) =>
  input instanceof Request ? input.url : input.toString();

const farFuture = { seconds: BigInt(Math.floor(Date.now() / 1000) + 3600), nanos: 0 };

const any = (typeName: string, value: Uint8Array) => ({
  typeUrl: `type.googleapis.com/${typeName}`,
  value,
});

const transport = () => new ScyllaGrpcTransport().getTransport();
const listSecrets = () =>
  new SecretServiceClient(transport()).listSecrets({ projectId: { value: 'p' } }).response;
const headersOf = (call: unknown[]) => new Headers((call[1] as RequestInit).headers);

beforeEach(() => openSession({ value: 'access-1', expiresAt: farFuture }));
afterEach(() => {
  vi.unstubAllGlobals();
  forgetSession();
});

describe('ScyllaGrpcTransport', () => {
  it('rejects a refused call with a ScyllaError that keeps the gRPC code', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(refusal(5, 'no such secret')));

    const error = await listSecrets().catch((thrown: unknown) => thrown);

    expect(error).toBeInstanceOf(ScyllaError);
    expect(error).toMatchObject({
      code: 'NOT_FOUND',
      message: 'no such secret',
      rpc: 'scylla.projects.v1.SecretService/ListSecrets',
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

  it('reads the reason and the metadata of an ErrorInfo', async () => {
    const info = ErrorInfo.create({
      reason: 'RESEND_TOO_SOON',
      domain: 'scylla',
      metadata: { retry_after_seconds: '42' },
    });
    const details = Status.create({
      code: 9,
      details: [any('google.rpc.ErrorInfo', ErrorInfo.toBinary(info))],
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(refusal(9, 'too soon', details)));

    const error = (await listSecrets().catch((thrown: unknown) => thrown)) as ScyllaError;

    expect(error.reason).toBe('RESEND_TOO_SOON');
    expect(error.metadata).toEqual({ retry_after_seconds: '42' });
    expect(error.userMessage()).toContain('42');
  });

  it('reads the field violations of a BadRequest', async () => {
    const request = BadRequest.create({
      fieldViolations: [{ field: 'display_name', description: 'is required' }],
    });
    const details = Status.create({
      code: 3,
      details: [any('google.rpc.BadRequest', BadRequest.toBinary(request))],
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(refusal(3, 'bad', details)));

    const error = (await listSecrets().catch((thrown: unknown) => thrown)) as ScyllaError;

    expect(error.violationOf('display_name')?.description).toBe('is required');
  });

  it('calls a request that does not get to the server UNAVAILABLE, whatever the browser says', async () => {
    for (const text of [
      'Failed to fetch',
      'Load failed',
      'NetworkError when attempting to fetch',
    ]) {
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
      for await (const _ of new JobServiceClient(transport()).tailJobLogs({ nodeId: '', after: '' }).responses) {
        // no message comes before the failure
      }
    };

    await expect(read()).rejects.toMatchObject({ code: 'PERMISSION_DENIED', name: 'ScyllaError' });
  });

  it('sends the access token and the cookie', async () => {
    const fetch = vi.fn().mockResolvedValue(refusal(5, 'none'));
    vi.stubGlobal('fetch', fetch);

    await listSecrets().catch(() => undefined);

    expect(headersOf(fetch.mock.calls[0]).get('authorization')).toBe('Bearer access-1');
    expect((fetch.mock.calls[0][1] as RequestInit).credentials).toBe('include');
  });

  it('refreshes the token one time on UNAUTHENTICATED and sends the call again', async () => {
    const fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      if (urlOf(input).endsWith('TokenService/Refresh')) {
        return Promise.resolve(
          answer(
            RefreshResponse.toBinary({
              token: { value: 'access-2', expiresAt: farFuture },
              refreshToken: '',
            }),
          ),
        );
      }
      const token = new Headers(init?.headers).get('authorization');
      return Promise.resolve(
        token === 'Bearer access-2' ? refusal(5, 'second try') : refusal(16, 'token ended'),
      );
    });
    vi.stubGlobal('fetch', fetch);

    await expect(listSecrets()).rejects.toMatchObject({ code: 'NOT_FOUND', message: 'second try' });

    const urls = fetch.mock.calls.map(([input]) => urlOf(input));
    expect(urls.filter(url => url.endsWith('TokenService/Refresh'))).toHaveLength(1);
    expect(urls.filter(url => url.endsWith('SecretService/ListSecrets'))).toHaveLength(2);
  });

  it('sends the call one time only when the refresh fails', async () => {
    const fetch = vi.fn((input: RequestInfo | URL) =>
      Promise.resolve(
        urlOf(input).endsWith('TokenService/Refresh')
          ? refusal(16, 'no cookie')
          : refusal(16, 'token ended'),
      ),
    );
    vi.stubGlobal('fetch', fetch);

    await expect(listSecrets()).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });

    const urls = fetch.mock.calls.map(([input]) => urlOf(input));
    expect(urls.filter(url => url.endsWith('SecretService/ListSecrets'))).toHaveLength(1);
  });

  it('sends no token to a public call', async () => {
    const fetch = vi.fn().mockResolvedValue(refusal(5, 'none'));
    vi.stubGlobal('fetch', fetch);
    const { AccountServiceClient } =
      await import('@base/generated/scylla/accounts/v1/account_service.client.ts');

    await new AccountServiceClient(transport()).listSignInMethods({}).response.catch(() => null);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(headersOf(fetch.mock.calls[0]).get('authorization')).toBeNull();
  });
});
