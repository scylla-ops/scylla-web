import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen } from '@testing-library/svelte';
import { render, withRegistry, withQueryClient, withWidgetInjections } from '@test/render.svelte.ts';
import { installTestNavigator } from '@test/navigator.ts';
import { ScyllaResult } from '@shared/utils/scylla-result.ts';
import type { LoginRepository } from '@base/features/login/domain/repository/login.repository.ts';
import { loginPoints } from '../../login.points.ts';
import LoginPage from './Login.page.svelte';

/**
 * The reference case of `widgets_plan.md`: a cloud-like extension turns the identifier field
 * into an email field and adds a sign-up link below the card, through the login page's own
 * widget points — with no change to `Login.page.svelte` or `LoginForm.svelte` for this test.
 */

let teardown: Array<() => void> = [];

beforeEach(() => {
  teardown = [];
});

afterEach(() => teardown.forEach(restore => restore()));

const setUp = () => {
  const cache = withQueryClient();
  const login = vi.fn().mockResolvedValue(ScyllaResult.success(undefined));
  const restoreRegistry = withRegistry({ login: { loginRepository: { login } satisfies LoginRepository } });
  const testNavigator = installTestNavigator();
  teardown.push(cache.restore, restoreRegistry, testNavigator.restore);
};

describe('Login.page with widget injections', () => {
  it('shows the overridden label and placeholder, and patches the field', async () => {
    setUp();
    teardown.push(
      withWidgetInjections({
        'email-login': [
          loginPoints.texts.override({
            identifier: { id: 'cloud.email', message: 'Email' },
            identifierPlaceholder: { id: 'cloud.email-placeholder', message: 'you@example.com' },
          }),
          loginPoints.fields.patch(fields =>
            fields.map(field =>
              field.id === 'identifier' && field.type === 'input'
                ? { ...field, inputType: 'email' as const }
                : field,
            ),
          ),
        ],
      }),
    );

    render(LoginPage);

    const field = await screen.findByLabelText('Email');
    expect(field).toHaveAttribute('type', 'email');
    expect(field).toHaveAttribute('placeholder', 'you@example.com');
  });

  it('renders a component injected into the footer zone, below the card', async () => {
    setUp();
    teardown.push(
      withWidgetInjections({
        'sign-up-link': [
          loginPoints.footer.inject({ component: () => import('./SignUpLinkProbe.fixture.svelte') }),
        ],
      }),
    );

    render(LoginPage);

    await screen.findByTestId('sign-up-link-probe');
  });

  it('renders exactly as it does with no injection installed', () => {
    setUp();

    render(LoginPage);

    expect(screen.getByLabelText('Username')).toHaveAttribute('type', 'text');
    expect(screen.queryByTestId('sign-up-link-probe')).not.toBeInTheDocument();
  });
});
