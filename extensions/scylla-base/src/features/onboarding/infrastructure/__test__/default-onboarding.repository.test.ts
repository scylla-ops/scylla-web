import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { IUserStateServiceClient } from '@base/generated/scylla/accounts/v1/user_state_service.client.ts';
import { createUserState } from '@platform/user-state';
import { failedCall, unaryCall } from '@test/grpc.ts';
import { DefaultOnboardingRepository } from '../default-onboarding.repository.ts';

const flush = () => new Promise(resolve => setTimeout(resolve));

const fakeClient = (entries: { key: string; valueJson: string; version: bigint }[] = []) => {
  const getUserState = vi.fn(() => unaryCall({ entries }));
  const putUserStateEntry = vi.fn(({ key, valueJson }: { key: string; valueJson: string }) =>
    unaryCall({ entry: { key, valueJson, version: 2n } }),
  );
  return {
    getUserState,
    putUserStateEntry,
    client: { getUserState, putUserStateEntry } as unknown as IUserStateServiceClient,
  };
};

const repositoryOn = (client: IUserStateServiceClient) => {
  const state = createUserState(client);
  return { state, repository: new DefaultOnboardingRepository(state) };
};

beforeEach(() => localStorage.clear());

describe('DefaultOnboardingRepository', () => {
  it('keeps the progress of each user apart', async () => {
    const { repository } = repositoryOn(fakeClient().client);

    await repository.saveStatus('ada', { kind: 'skipped' });

    expect(await repository.getStatus('ada')).toEqual({ kind: 'skipped' });
    expect(await repository.getStatus('grace')).toEqual({ kind: 'not-started' });
  });

  it('resumes a tour in progress at its step', async () => {
    const { repository } = repositoryOn(fakeClient().client);
    const status = { kind: 'in-progress', step: 'copy-secret' } as const;

    await repository.saveStatus('ada', status);

    expect(await repository.getStatus('ada')).toEqual(status);
  });

  it('rejects when the storage refuses the write, instead of throwing in the caller', async () => {
    const full = {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
      removeItem: () => undefined,
    };
    const repository = new DefaultOnboardingRepository(
      createUserState(fakeClient().client, () => full),
      () => full,
    );

    await expect(repository.saveStatus('ada', { kind: 'completed' })).rejects.toThrow(
      'QuotaExceededError',
    );
  });

  it('gives the status of the server on a new device, so the welcome dialog does not show', async () => {
    const server = fakeClient([
      { key: 'onboarding', valueJson: '{"kind":"completed"}', version: 1n },
    ]);
    const { state, repository } = repositoryOn(server.client);

    state.load('ada');

    expect(await repository.getStatus('ada')).toEqual({ kind: 'completed' });
    expect(server.putUserStateEntry).not.toHaveBeenCalled();
  });

  it('uploads a local status on the first run, with no entry on the server', async () => {
    localStorage.setItem('onboarding:ada', '{"kind":"skipped"}');
    const server = fakeClient();
    const { state, repository } = repositoryOn(server.client);

    state.load('ada');
    await repository.getStatus('ada');
    await flush();

    expect(server.putUserStateEntry).toHaveBeenCalledWith({
      key: 'onboarding',
      valueJson: '{"kind":"skipped"}',
      expectedVersion: 0n,
    });
  });

  it('rejects after a failed read with no local copy: a failure is not a new person', async () => {
    const server = fakeClient();
    server.getUserState.mockReturnValue(failedCall('UNAVAILABLE') as never);
    const { state, repository } = repositoryOn(server.client);

    state.load('ada');

    await expect(repository.getStatus('ada')).rejects.toMatchObject({ code: 'UNAVAILABLE' });
  });

  it('reads the local copy after a failed read', async () => {
    localStorage.setItem('onboarding:ada', '{"kind":"completed"}');
    const server = fakeClient();
    server.getUserState.mockReturnValue(failedCall('UNAVAILABLE') as never);
    const { state, repository } = repositoryOn(server.client);

    state.load('ada');

    expect(await repository.getStatus('ada')).toEqual({ kind: 'completed' });
  });

  it('never reads the server for a status, so a storage event cannot move the tour back', async () => {
    const server = fakeClient();
    const { state, repository } = repositoryOn(server.client);
    state.load('ada');
    await state.whenLoaded();

    await repository.getStatus('ada');
    await repository.getStatus('ada');

    expect(server.getUserState).toHaveBeenCalledTimes(1);
  });

  it('writes a saved status to the server with its version', async () => {
    const server = fakeClient();
    const { state, repository } = repositoryOn(server.client);
    state.load('ada');
    await state.whenLoaded();

    await repository.saveStatus('ada', { kind: 'skipped' });
    await flush();

    expect(server.putUserStateEntry).toHaveBeenCalledWith({
      key: 'onboarding',
      valueJson: '{"kind":"skipped"}',
      expectedVersion: 0n,
    });
  });

  it('tells the tour when a merge changes the local copy', async () => {
    localStorage.setItem('onboarding:ada', '{"kind":"skipped","done":["a"]}');
    const server = fakeClient([
      { key: 'onboarding', valueJson: '{"kind":"completed","done":["b"]}', version: 1n },
    ]);
    const { state } = repositoryOn(server.client);
    const heard = vi.fn();
    window.addEventListener('storage', heard);

    state.load('ada');
    await state.whenLoaded();
    window.removeEventListener('storage', heard);

    expect(heard).toHaveBeenCalledTimes(1);
    expect(JSON.parse(localStorage.getItem('onboarding:ada') ?? '')).toEqual({
      kind: 'completed',
      done: ['b', 'a'],
    });
  });

  it('removes the local copy of a deleted account', async () => {
    localStorage.setItem('onboarding:ada', '{"kind":"skipped"}');
    const { state } = repositoryOn(fakeClient().client);
    state.load('ada');
    await state.whenLoaded();

    state.forget();

    expect(localStorage.getItem('onboarding:ada')).toBeNull();
  });
});
