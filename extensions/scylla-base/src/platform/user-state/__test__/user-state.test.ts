import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { IUserStateServiceClient } from '@base/generated/scylla/accounts/v1/user_state_service.client.ts';
import { failedCall, unaryCall } from '@test/grpc.ts';
import { createUserState, type UserStateDefinition } from '../user-state.ts';

interface Stored {
  key: string;
  valueJson: string;
  version: bigint;
}

const entry = (key: string, value: unknown, version = 1n): Stored => ({
  key,
  valueJson: JSON.stringify(value),
  version,
});

const flush = () => new Promise(resolve => setTimeout(resolve));

const fakeServer = (entries: Stored[] = []) => {
  const getUserState = vi.fn(() => unaryCall({ entries }));
  const putUserStateEntry = vi.fn(
    ({ key, valueJson }: { key: string; valueJson: string }) =>
      unaryCall({ entry: { key, valueJson, version: 9n } }),
  );
  return {
    getUserState,
    putUserStateEntry,
    client: { getUserState, putUserStateEntry } as unknown as IUserStateServiceClient,
  };
};

/** A value in a local slot, with the shape of a definition. */
const localValue = (overrides: Partial<UserStateDefinition<string>> = {}) => {
  const slot: { value: string | null } = { value: null };
  const definition: UserStateDefinition<string> = {
    key: 'color',
    decode: value => (typeof value === 'string' ? value : null),
    readLocal: () => slot.value,
    writeLocal: (_, value) => {
      slot.value = value;
    },
    ...overrides,
  };
  return { slot, definition };
};

const joined = (server: string, local: string) => [...new Set([server, local])].sort().join('+');

const book = (user = 'ada') =>
  JSON.parse(localStorage.getItem(`scylla-user-state:${user}`) ?? '{}') as Record<
    string,
    { version?: string; dirty?: boolean }
  >;

const setBook = (marks: Record<string, { version?: string; dirty?: boolean }>) =>
  localStorage.setItem('scylla-user-state:ada', JSON.stringify(marks));

beforeEach(() => localStorage.clear());

afterEach(() => vi.restoreAllMocks());

describe('the first read of a key', () => {
  it('uploads a local value when the server has no entry, with version 0 for a merged key', async () => {
    const server = fakeServer();
    const state = createUserState(server.client);
    const { slot, definition } = localValue({ merge: joined });
    slot.value = 'red';
    state.define(definition);

    state.load('ada');
    await state.whenLoaded();
    await flush();

    expect(server.putUserStateEntry).toHaveBeenCalledWith({
      key: 'color',
      valueJson: '"red"',
      expectedVersion: 0n,
    });
    expect(book().color).toEqual({ version: '9', dirty: false });
  });

  it('sends nothing when neither side has a value', async () => {
    const server = fakeServer();
    const state = createUserState(server.client);
    state.define(localValue().definition);

    state.load('ada');
    await state.whenLoaded();
    await flush();

    expect(server.putUserStateEntry).not.toHaveBeenCalled();
  });

  it('does not upload a local value that does not prove a choice', async () => {
    const server = fakeServer();
    const state = createUserState(server.client);
    const { slot, definition } = localValue({ upload: false });
    slot.value = 'red';
    state.define(definition);

    state.load('ada');
    await state.whenLoaded();
    await flush();

    expect(server.putUserStateEntry).not.toHaveBeenCalled();
  });

  it('lets the server win in a first run with no merge', async () => {
    const server = fakeServer([entry('color', 'blue', 4n)]);
    const state = createUserState(server.client);
    const { slot, definition } = localValue();
    slot.value = 'red';
    state.define(definition);

    state.load('ada');
    await state.whenLoaded();
    await flush();

    expect(slot.value).toBe('blue');
    expect(server.putUserStateEntry).not.toHaveBeenCalled();
    expect(book().color).toEqual({ version: '4', dirty: false });
  });

  it('merges in a first run, and writes the merge with the version of the server', async () => {
    const server = fakeServer([entry('color', 'blue', 4n)]);
    const state = createUserState(server.client);
    const { slot, definition } = localValue({ merge: joined });
    slot.value = 'red';
    state.define(definition);

    state.load('ada');
    await state.whenLoaded();
    await flush();

    expect(slot.value).toBe('blue+red');
    expect(server.putUserStateEntry).toHaveBeenCalledWith({
      key: 'color',
      valueJson: '"blue+red"',
      expectedVersion: 4n,
    });
  });
});

describe('a later read of a key', () => {
  it('copies the value of the server when this browser has no change to send', async () => {
    setBook({ color: { version: '3' } });
    const server = fakeServer([entry('color', 'blue', 4n)]);
    const state = createUserState(server.client);
    const { slot, definition } = localValue({ merge: joined });
    slot.value = 'red';
    state.define(definition);

    state.load('ada');
    await state.whenLoaded();
    await flush();

    expect(slot.value).toBe('blue');
    expect(server.putUserStateEntry).not.toHaveBeenCalled();
  });

  it('sends a marked value as it is when the server did not move', async () => {
    setBook({ color: { version: '4', dirty: true } });
    const server = fakeServer([entry('color', 'blue', 4n)]);
    const state = createUserState(server.client);
    const { slot, definition } = localValue({ merge: joined });
    slot.value = 'red';
    state.define(definition);

    state.load('ada');
    await state.whenLoaded();
    await flush();

    expect(slot.value).toBe('red');
    expect(server.putUserStateEntry).toHaveBeenCalledWith({
      key: 'color',
      valueJson: '"red"',
      expectedVersion: 4n,
    });
  });

  it('merges a marked value when the server moved', async () => {
    setBook({ color: { version: '3', dirty: true } });
    const server = fakeServer([entry('color', 'blue', 4n)]);
    const state = createUserState(server.client);
    const { slot, definition } = localValue({ merge: joined });
    slot.value = 'red';
    state.define(definition);

    state.load('ada');
    await state.whenLoaded();
    await flush();

    expect(slot.value).toBe('blue+red');
  });

  it('sends a marked value over the server with no merge: the last choice wins', async () => {
    setBook({ color: { version: '3', dirty: true } });
    const server = fakeServer([entry('color', 'blue', 4n)]);
    const state = createUserState(server.client);
    const { slot, definition } = localValue();
    slot.value = 'red';
    state.define(definition);

    state.load('ada');
    await state.whenLoaded();
    await flush();

    expect(slot.value).toBe('red');
    expect(server.putUserStateEntry).toHaveBeenCalledWith({ key: 'color', valueJson: '"red"' });
  });

  it('writes over a value that this build cannot read', async () => {
    const server = fakeServer([entry('color', 12, 2n)]);
    const state = createUserState(server.client);
    const { slot, definition } = localValue({ merge: joined });
    slot.value = 'red';
    state.define(definition);

    state.load('ada');
    await state.whenLoaded();
    await flush();

    expect(server.putUserStateEntry).toHaveBeenCalledWith({
      key: 'color',
      valueJson: '"red"',
      expectedVersion: 2n,
    });
  });
});

describe('a failed read', () => {
  it('resolves whenLoaded and tells that the read failed, so a reader never hangs', async () => {
    const server = fakeServer();
    server.getUserState.mockReturnValue(failedCall('UNAVAILABLE') as never);
    const state = createUserState(server.client);

    state.load('ada');
    await state.whenLoaded();

    expect(state.loadFailed()).toBe(true);
  });

  it('reads again at the online event, and sends what stayed marked', async () => {
    const server = fakeServer([]);
    server.getUserState.mockReturnValueOnce(failedCall('UNAVAILABLE') as never);
    const state = createUserState(server.client);
    const { slot, definition } = localValue({ upload: false });
    const color = state.define(definition);

    state.load('ada');
    await state.whenLoaded();
    server.putUserStateEntry.mockReturnValueOnce(failedCall('UNAVAILABLE') as never);
    slot.value = 'red';
    color.save('red');
    await flush();
    expect(book().color?.dirty).toBe(true);

    window.dispatchEvent(new Event('online'));
    await state.whenLoaded();
    await flush();

    expect(state.loadFailed()).toBe(false);
    expect(server.putUserStateEntry).toHaveBeenLastCalledWith({ key: 'color', valueJson: '"red"' });
    expect(book().color?.dirty).toBe(false);
  });
});

describe('save', () => {
  it('sends nothing with no user: the page before the sign-in keeps a local value only', () => {
    const server = fakeServer();
    const state = createUserState(server.client);

    state.define(localValue().definition).save('red');

    expect(server.putUserStateEntry).not.toHaveBeenCalled();
  });

  it('sends nothing when the server already holds the value', async () => {
    const server = fakeServer([entry('color', 'blue')]);
    const state = createUserState(server.client);
    const color = state.define(localValue().definition);
    state.load('ada');
    await state.whenLoaded();

    color.save('blue');
    await flush();

    expect(server.putUserStateEntry).not.toHaveBeenCalled();
  });

  it('a value saved during the read goes out when the read ends', async () => {
    setBook({ color: { version: '1' } });
    const server = fakeServer([entry('color', 'blue')]);
    const state = createUserState(server.client);
    const { slot, definition } = localValue();
    const color = state.define(definition);

    state.load('ada');
    slot.value = 'red';
    color.save('red');
    await state.whenLoaded();
    await flush();

    expect(slot.value).toBe('red');
    expect(server.putUserStateEntry).toHaveBeenCalledWith({ key: 'color', valueJson: '"red"' });
  });

  it('sends one write at a time, and keeps only the last value that waits', async () => {
    const server = fakeServer();
    const state = createUserState(server.client);
    const color = state.define(localValue({ merge: joined }).definition);
    state.load('ada');
    await state.whenLoaded();

    color.save('a');
    color.save('b');
    color.save('c');
    await flush();

    expect(server.putUserStateEntry.mock.calls.map(([call]) => call.valueJson)).toEqual([
      '"a"',
      '"c"',
    ]);
    expect(server.putUserStateEntry).toHaveBeenLastCalledWith({
      key: 'color',
      valueJson: '"c"',
      expectedVersion: 9n,
    });
  });

  it('sends a value equal to the known one when another write goes first', async () => {
    const server = fakeServer([entry('color', 'blue')]);
    const state = createUserState(server.client);
    const color = state.define(localValue().definition);
    state.load('ada');
    await state.whenLoaded();

    color.save('red');
    color.save('blue');
    await flush();

    expect(server.putUserStateEntry).toHaveBeenLastCalledWith({
      key: 'color',
      valueJson: '"blue"',
    });
  });

  it('keeps the mark after a failed write, for the next page load', async () => {
    const server = fakeServer();
    const state = createUserState(server.client);
    const color = state.define(localValue().definition);
    state.load('ada');
    await state.whenLoaded();
    server.putUserStateEntry.mockReturnValue(failedCall('UNAVAILABLE') as never);

    color.save('red');
    await flush();

    expect(book().color?.dirty).toBe(true);
  });

  it('merges after a conflict, and writes the merge with the new version', async () => {
    setBook({ color: { version: '1' } });
    const server = fakeServer([entry('color', 'blue', 1n)]);
    const state = createUserState(server.client);
    const { slot, definition } = localValue({ merge: joined });
    const color = state.define(definition);
    state.load('ada');
    await state.whenLoaded();

    server.getUserState.mockReturnValue(unaryCall({ entries: [entry('color', 'green', 2n)] }) as never);
    server.putUserStateEntry.mockReturnValueOnce(failedCall('ABORTED') as never);
    slot.value = 'red';
    color.save('red');
    await flush();

    expect(slot.value).toBe('green+red');
    expect(server.putUserStateEntry).toHaveBeenLastCalledWith({
      key: 'color',
      valueJson: '"green+red"',
      expectedVersion: 2n,
    });
  });

  it('stops after three conflicts, with the mark still set', async () => {
    const server = fakeServer([entry('color', 'blue', 1n)]);
    const state = createUserState(server.client);
    const { slot, definition } = localValue({ merge: joined });
    const color = state.define(definition);
    state.load('ada');
    await state.whenLoaded();

    server.putUserStateEntry.mockReturnValue(failedCall('ABORTED') as never);
    slot.value = 'red';
    color.save('red');
    await flush();

    expect(server.putUserStateEntry).toHaveBeenCalledTimes(3);
    expect(book().color?.dirty).toBe(true);
  });
});

describe('load', () => {
  it('reads the server one time for a user, at each route of the guard', async () => {
    const server = fakeServer();
    const state = createUserState(server.client);

    state.load('ada');
    state.load('ada');
    await state.whenLoaded();

    expect(server.getUserState).toHaveBeenCalledTimes(1);
  });

  it('reads again for another user, with the marks of that user', async () => {
    setBook({ color: { version: '7' } });
    const server = fakeServer([entry('color', 'blue', 2n)]);
    const state = createUserState(server.client);
    const { slot, definition } = localValue({ merge: joined });
    slot.value = 'red';
    state.define(definition);
    state.load('ada');
    await state.whenLoaded();
    await flush();

    slot.value = 'red';
    state.load('grace');
    await state.whenLoaded();
    await flush();

    expect(server.getUserState).toHaveBeenCalledTimes(2);
    expect(slot.value).toBe('blue+red');
    expect(book('grace').color).toEqual({ version: '9', dirty: false });
    expect(book('ada').color?.version).toBe('2');
  });
});

describe('forget', () => {
  it('removes the marks and the local copies of a deleted account', async () => {
    const server = fakeServer();
    const state = createUserState(server.client);
    const removeLocal = vi.fn();
    state.define(localValue({ removeLocal }).definition);
    setBook({ color: { version: '1' } });
    state.load('ada');
    await state.whenLoaded();

    state.forget();

    expect(removeLocal).toHaveBeenCalledWith('ada');
    expect(localStorage.getItem('scylla-user-state:ada')).toBeNull();
  });
});
