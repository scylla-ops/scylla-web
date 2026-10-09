import { describe, it, expect, afterEach } from 'vitest';
import { screen } from '@testing-library/svelte';
import { msg } from '@lingui/core/macro';
import { Extension, setAppNavigator, setDependencyRegistry, setQueryClient } from '@scylla/core-sdk';
import { loadExtensions, setShellConfig, startCore } from '@scylla/core';
import { ScyllaBaseExtension } from '@scylla/base';
import { loginPoints } from '@scylla/base-sdk';
import { FormItemType } from '@scylla/ui';

/**
 * The widget injections of an extension that this repo does not ship, applied to the real login
 * page of `scylla-base` and loaded the way the app loads them. A private build (the SaaS one)
 * changes this page the same way.
 */

/** The label and the description name the identifier: override them together. */
const EmailLoginWidgetInjection = [
  loginPoints.texts.override({
    identifier: msg`Email`,
    identifierPlaceholder: msg`you@example.com`,
    description: msg`Enter your email and your password.`,
  }),
  loginPoints.fields.patch(fields =>
    fields.map(field =>
      field.id === 'identifier' && field.type === FormItemType.Input
        ? { ...field, inputType: 'email' as const }
        : field,
    ),
  ),
];

const HelpLinkWidgetInjection = [
  loginPoints.footer.inject({ component: () => import('./ExampleFooter.fixture.svelte') }),
];

@Extension({
  id: 'example-login',
  name: 'Example login',
  version: '0.0.0',
  dependencies: ['scylla-base'],
  modules: [],
  widgetInjections: { EmailLoginWidgetInjection, HelpLinkWidgetInjection },
})
class ExampleLoginExtension {}

const extensions = [ScyllaBaseExtension, ExampleLoginExtension];

afterEach(() => {
  setAppNavigator(null);
  setDependencyRegistry(null);
  setQueryClient(null);
  setShellConfig(null);
  document.body.innerHTML = '';
});

const openLogin = async () => {
  history.replaceState(null, '', '/login');
  const target = document.createElement('div');
  document.body.append(target);
  await startCore({ extensions, target });
};

describe('widget injections of another extension', () => {
  it('pass the loader\'s owner, dependency and conflict checks', () => {
    expect(() => loadExtensions(extensions)).not.toThrow();
  });

  it('change a text and the field it labels together', async () => {
    await openLogin();

    const field = await screen.findByLabelText('Email');
    expect(field).toHaveAttribute('type', 'email');
    expect(field).toHaveAttribute('placeholder', 'you@example.com');
    expect(screen.getByText('Enter your email and your password.')).toBeInTheDocument();
  });

  it('add a component below the card', async () => {
    await openLogin();

    expect(await screen.findByRole('button', { name: 'Need help?' })).toBeInTheDocument();
  });
});
