import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { render, withRegistry, withQueryClient } from '@test/render.ts';
import { installTestNavigator } from '@test/navigator.ts';
import { ScyllaResult, ScyllaError } from '@shared/utils/scylla-result.ts';
import type { LoginRepository } from '@base/features/login/domain/repository/login.repository.ts';
import { loginPath } from '@base/features/login/presentation/return-path.ts';
import LoginPage from './Login.page.svelte';

const makeFakeRepository = (overrides: Partial<LoginRepository> = {}) => {
  const login = overrides.login ?? vi.fn().mockResolvedValue(ScyllaResult.success(undefined));
  const repository: LoginRepository = {
    login,
    requestPasswordReset: vi.fn(),
    resetPassword: vi.fn(),
  };
  return { repository, login };
};

let teardown: Array<() => void> = [];
let testNavigator: ReturnType<typeof installTestNavigator>;

const setUp = (repository: LoginRepository) => {
  const cache = withQueryClient();
  const restoreRegistry = withRegistry({ login: { loginRepository: repository } });
  testNavigator = installTestNavigator();
  teardown = [cache.restore, restoreRegistry, testNavigator.restore];
};

beforeEach(() => {
  teardown = [];
});

afterEach(() => {
  teardown.forEach(restore => restore());
  history.replaceState(null, '', '/');
});

const signIn = async (identifier = 'ravenne', password = 'hunter2') => {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Email or username'), identifier);
  await user.type(screen.getByLabelText('Password'), password);
  await user.click(screen.getByRole('button', { name: 'Sign in' }));
};

describe('LoginPage', () => {
  it('signs in with the typed credentials and redirects to the root, replacing history', async () => {
    const { repository, login } = makeFakeRepository();
    setUp(repository);
    render(LoginPage);

    await signIn();

    await waitFor(() => expect(login).toHaveBeenCalledWith('ravenne', 'hunter2'));
    await waitFor(() =>
      expect(testNavigator.navigate).toHaveBeenCalledWith('/', { replace: true }),
    );
  });

  it('stays on the page when the credentials are refused', async () => {
    const error = new ScyllaError('bad credentials', { cause: { code: 'INVALID_CREDENTIALS' } });
    const { repository } = makeFakeRepository({
      login: vi.fn().mockResolvedValue(ScyllaResult.error(error)),
    });
    setUp(repository);
    render(LoginPage);

    await signIn('ravenne', 'wrong');

    await waitFor(() => expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled());
    expect(testNavigator.navigate).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Email or username')).toBeInTheDocument();
  });

  it('replaces the form with the loading screen once sign-in succeeds', async () => {
    const { repository } = makeFakeRepository();
    setUp(repository);
    render(LoginPage);

    await signIn();

    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Sign in' })).not.toBeInTheDocument(),
    );
  });

  it('goes back to the return path after the sign-in, with its fragment', async () => {
    history.replaceState(null, '', loginPath('/invite#token=abc'));
    const { repository } = makeFakeRepository();
    setUp(repository);
    render(LoginPage);

    await signIn();

    await waitFor(() =>
      expect(testNavigator.navigate).toHaveBeenCalledWith('/invite#token=abc', { replace: true }),
    );
  });

  it.each([
    ['another host', '//evil.example/invite'],
    ['an absolute URL', 'https://evil.example'],
    ['a javascript: URL', 'javascript:alert(1)'],
  ])('goes to the root, not to a return path to %s', async (_case, next) => {
    history.replaceState(null, '', loginPath(next));
    const { repository } = makeFakeRepository();
    setUp(repository);
    render(LoginPage);

    await signIn();

    await waitFor(() =>
      expect(testNavigator.navigate).toHaveBeenCalledWith('/', { replace: true }),
    );
  });

  it('is titled "Sign in"', () => {
    const { repository } = makeFakeRepository();
    setUp(repository);
    render(LoginPage);

    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('signs in with an email as the identifier', async () => {
    const { repository, login } = makeFakeRepository();
    setUp(repository);
    render(LoginPage);

    await signIn('ada@example.com', 'hunter22');

    await waitFor(() => expect(login).toHaveBeenCalledWith('ada@example.com', 'hunter22'));
  });
});
