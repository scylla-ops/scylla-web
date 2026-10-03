// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { point } from '../point.ts';
import { buildWidgetInjectionRegistry } from '../build-widget-injection-registry.ts';

const component = () => Promise.resolve({ default: {} as never });
const messages = { username: { id: 'username', message: 'Username' } };

describe('buildWidgetInjectionRegistry', () => {
  it('keys each zone component "<injection id>#<index>"', () => {
    const form = point.zone();

    const registry = buildWidgetInjectionRegistry([
      { id: 'a/keyed', changes: [form.inject({ component }), form.inject({ component })] },
    ]);

    expect(registry.zones.get(form)?.map(c => c.key)).toEqual(['a/keyed#0', 'a/keyed#1']);
  });

  it("keeps a zone's components in the order of the injections, then of their items", () => {
    const form = point.zone();

    const registry = buildWidgetInjectionRegistry([
      { id: 'a', changes: [form.inject({ component }), form.inject({ component })] },
      { id: 'b', changes: [form.inject({ component })] },
    ]);

    expect(registry.zones.get(form)?.map(c => c.key)).toEqual(['a#0', 'a#1', 'b#0']);
  });

  it('keeps two zones apart, even with no name', () => {
    const first = point.zone();
    const second = point.zone();

    const registry = buildWidgetInjectionRegistry([
      { id: 'x', changes: [first.inject({ component })] },
    ]);

    expect(registry.zones.get(first)).toHaveLength(1);
    expect(registry.zones.get(second)).toBeUndefined();
  });

  it('rejects two injections that replace the same zone, with the name of the zone', () => {
    const form = point.zone();

    expect(() =>
      buildWidgetInjectionRegistry(
        [
          { id: 'a/one', changes: [form.inject({ position: 'replace', component })] },
          { id: 'b/two', changes: [form.inject({ position: 'replace', component })] },
        ],
        { names: new Map([[form, 'login.form']]) },
      ),
    ).toThrow('Only one injection may replace the zone "login.form": a/one, b/two.');
  });

  it('maps each overridden descriptor to its override', () => {
    const texts = point.texts(messages);
    const email = { id: 'email', message: 'Email' };

    const registry = buildWidgetInjectionRegistry([
      { id: 'email', changes: [texts.override({ username: email })] },
    ]);

    expect(registry.texts.get(messages.username)).toBe(email);
  });

  it('rejects two injections that override the same message', () => {
    const texts = point.texts(messages);

    expect(() =>
      buildWidgetInjectionRegistry(
        [
          { id: 'a/one', changes: [texts.override({ username: { id: 'e', message: 'Email' } })] },
          { id: 'a/two', changes: [texts.override({ username: { id: 'f', message: 'E-mail' } })] },
        ],
        { names: new Map([[texts, 'login.texts']]) },
      ),
    ).toThrow('Two injections override the text "login.texts.username": a/one, a/two.');
  });

  it('gives the registry the names and the can it receives', () => {
    const form = point.zone();
    const names = new Map([[form, 'login.form']]);
    const can = () => true;

    const registry = buildWidgetInjectionRegistry([], { names, can });

    expect(registry.names).toBe(names);
    expect(registry.can).toBe(can);
  });
});
