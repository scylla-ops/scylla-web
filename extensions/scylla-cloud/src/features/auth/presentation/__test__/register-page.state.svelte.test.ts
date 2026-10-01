import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { waitFor } from '@testing-library/svelte';
import { withRegistry, withQueryClient } from '@test/render.svelte.ts';
import { installTestNavigator } from '@test/navigator.ts';
import { ScyllaResult, ScyllaError } from '@scylla/base-sdk';
import type { RegistrationRepository } from '../../domain/repository/registration.repository.ts';
import { RegisterPageState } from '../register-page.state.svelte.ts';

const input = {
  username: 'ravenne',
  email: 'ravenne@example.com',
  password: 'hunter22',
  organizationName: 'Acme',
};

let teardown: Array<() => void> = [];
let testNavigator: ReturnType<typeof installTestNavigator>;
let cleanup: () => void;
let state!: RegisterPageState;

const setUp = (repository: RegistrationRepository) => {
  const cache = withQueryClient();
  const restoreRegistry = withRegistry({ 'cloud-auth': { registrationRepository: repository } });
  testNavigator = installTestNavigator();
  teardown = [cache.restore, restoreRegistry, testNavigator.restore];

  cleanup = $effect.root(() => {
    state = new RegisterPageState();
  });
};

beforeEach(() => {
  teardown = [];
});

afterEach(() => {
  cleanup();
  teardown.forEach(restore => restore());
});

describe('RegisterPageState', () => {
  it('redirects to the root, replacing history, once sign-up succeeds', async () => {
    const signup = vi.fn().mockResolvedValue(ScyllaResult.success(undefined));
    setUp({ signup });

    state.submit(input);

    await waitFor(() => expect(signup).toHaveBeenCalledWith(input));
    await waitFor(() =>
      expect(testNavigator.navigate).toHaveBeenCalledWith('/', { replace: true }),
    );
  });

  it('does not redirect when sign-up fails', async () => {
    const error = new ScyllaError('already used', { cause: { code: 'ALREADY_EXISTS' } });
    const signup = vi.fn().mockResolvedValue(ScyllaResult.error(error));
    setUp({ signup });

    state.submit(input);

    await waitFor(() => expect(signup).toHaveBeenCalled());
    expect(testNavigator.navigate).not.toHaveBeenCalled();
    expect(state.isSuccess).toBe(false);
  });
});
