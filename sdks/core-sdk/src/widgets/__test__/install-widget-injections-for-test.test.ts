// @vitest-environment node
import { describe, it, expect, afterEach } from 'vitest';
import { t } from '@scylla/ui/i18n';
import { point } from '../point.ts';
import { installWidgetInjectionsForTest } from '../install-widget-injections-for-test.ts';
import { componentsOf, setWidgetInjectionRegistry } from '../widget-injection-registry.ts';

const component = () => Promise.resolve({ default: {} as never });

afterEach(() => {
  setWidgetInjectionRegistry(null);
});

describe('installWidgetInjectionsForTest', () => {
  it('installs zone components in the order of the injections, keyed by the injection name', () => {
    const form = point.zone();

    installWidgetInjectionsForTest({
      First: [form.inject({ component })],
      Second: [form.inject({ component })],
    });

    expect(componentsOf(form).map(c => c.key)).toEqual(['First#0', 'Second#0']);
  });

  it('installs an overridden text, which `t` renders in place of the original', () => {
    const messages = { title: { id: 'title', message: 'Login' } };
    const texts = point.texts(messages);

    installWidgetInjectionsForTest({
      Fake: [texts.override({ title: { id: 'sign-in', message: 'Sign in' } })],
    });

    expect(t(messages.title)).toBe('Sign in');
  });

  it('overrides the opened descriptor only, not another message with the same id', () => {
    const messages = { password: { id: 'password', message: 'Password' } };
    const elsewhere = { id: 'password', message: 'Password' };
    const texts = point.texts(messages);

    installWidgetInjectionsForTest({
      Fake: [texts.override({ password: { id: 'passphrase', message: 'Passphrase' } })],
    });

    expect(t(elsewhere)).toBe('Password');
  });

  it('stops overriding a text once the registry is removed', () => {
    const messages = { title: { id: 'title', message: 'Login' } };
    const texts = point.texts(messages);
    installWidgetInjectionsForTest({
      Fake: [texts.override({ title: { id: 'sign-in', message: 'Sign in' } })],
    });

    setWidgetInjectionRegistry(null);

    expect(t(messages.title)).toBe('Login');
  });

  it('installs a value patch', () => {
    const fields = point.value<readonly string[]>();

    installWidgetInjectionsForTest({ Fake: [fields.patch(f => [...f, 'new'])] });

    expect(fields.resolve(['a'])).toEqual(['a', 'new']);
  });

  it('runs the same conflict checks as the app', () => {
    const form = point.zone();

    expect(() =>
      installWidgetInjectionsForTest({
        One: [form.inject({ position: 'replace', component })],
        Two: [form.inject({ position: 'replace', component })],
      }),
    ).toThrow(/Only one injection may replace the zone/);
  });
});
