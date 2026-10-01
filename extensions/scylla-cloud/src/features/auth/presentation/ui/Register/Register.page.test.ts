import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { render, withRegistry, withQueryClient } from '@test/render.svelte.ts';
import { installTestNavigator } from '@test/navigator.ts';
import { ScyllaResult } from '@scylla/base-sdk';
import type { RegistrationRepository } from '../../../domain/repository/registration.repository.ts';
import RegisterPage from './Register.page.svelte';

const makeFakeRepository = (overrides: Partial<RegistrationRepository> = {}) => {
  const signup = overrides.signup ?? vi.fn().mockResolvedValue(ScyllaResult.success(undefined));
  return { repository: { signup } satisfies RegistrationRepository, signup };
};

let teardown: Array<() => void> = [];
let testNavigator: ReturnType<typeof installTestNavigator>;

const setUp = (repository: RegistrationRepository) => {
  const cache = withQueryClient();
  const restoreRegistry = withRegistry({ 'cloud-auth': { registrationRepository: repository } });
  testNavigator = installTestNavigator();
  teardown = [cache.restore, restoreRegistry, testNavigator.restore];
};

beforeEach(() => {
  teardown = [];
});

afterEach(() => teardown.forEach(restore => restore()));

const fillAndSubmit = async () => {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Username'), 'ravenne');
  await user.type(screen.getByLabelText('Email'), 'ravenne@example.com');
  await user.type(screen.getByLabelText('Password'), 'hunter22');
  await user.type(screen.getByLabelText('Organization name'), 'Acme');
  await user.click(screen.getByRole('button', { name: 'Sign up' }));
};

describe('RegisterPage', () => {
  it('signs up with the typed fields', async () => {
    const { repository, signup } = makeFakeRepository();
    setUp(repository);
    render(RegisterPage);

    await fillAndSubmit();

    await waitFor(() =>
      expect(signup).toHaveBeenCalledWith({
        username: 'ravenne',
        email: 'ravenne@example.com',
        password: 'hunter22',
        organizationName: 'Acme',
      }),
    );
  });

  it('disables the submit button until every field is valid', () => {
    const { repository } = makeFakeRepository();
    setUp(repository);
    render(RegisterPage);

    expect(screen.getByRole('button', { name: 'Sign up' })).toBeDisabled();
  });

  it('goes back to the login page', async () => {
    const { repository } = makeFakeRepository();
    setUp(repository);
    render(RegisterPage);

    await userEvent.click(screen.getByRole('button', { name: /Sign in/ }));

    expect(testNavigator.navigate).toHaveBeenCalledWith('/login', undefined);
  });

  it('replaces the form with the loading screen once sign-up succeeds', async () => {
    const { repository } = makeFakeRepository();
    setUp(repository);
    render(RegisterPage);

    await fillAndSubmit();

    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Sign up' })).not.toBeInTheDocument(),
    );
  });
});
