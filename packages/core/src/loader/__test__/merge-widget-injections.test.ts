// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { definePoints, point, type ExtensionManifest, type WidgetInjection } from '@scylla/core-sdk';
import { mergeWidgetInjections } from '../merge-widget-injections.ts';

interface Ctx {
  isPending: boolean;
}

const scope = `test-login-${Math.random().toString(36).slice(2)}`;
const points = definePoints(scope, {
  form: point.zone<Ctx>(),
  texts: point.texts({ username: 'Username' }),
});

const owner = (id: string, moduleId: string): ExtensionManifest => ({
  id,
  name: id,
  version: '0.0.0',
  modules: [{ id: moduleId, domain: {} }],
});

const contributor = (
  id: string,
  dependencies: readonly string[],
  injections: readonly WidgetInjection[],
): ExtensionManifest => ({
  id,
  name: id,
  version: '0.0.0',
  modules: [],
  dependencies,
  widgetInjections: injections,
});

const component = () => Promise.resolve({ default: {} as never });

describe('mergeWidgetInjections', () => {
  it('rejects two injections with the same id', () => {
    const injection: WidgetInjection = { id: 'dup', changes: [] };
    const ext = contributor('a', ['base'], [injection]);
    const ext2 = contributor('b', [scope], [injection]);

    expect(() => mergeWidgetInjections([owner('base', scope), ext, ext2])).toThrow(
      /Two widget injections have the id "dup"/,
    );
  });

  it('rejects a change whose scope is not a loaded module', () => {
    const injection: WidgetInjection = {
      id: 'ghost',
      changes: [{ point: 'nowhere.form', kind: 'zone', payload: { component } }],
    };
    const ext = contributor('a', [], [injection]);

    expect(() => mergeWidgetInjections([ext])).toThrow(
      /no loaded module has the id "nowhere"/,
    );
  });

  it('rejects a change on an extension not listed as a dependency', () => {
    const injection: WidgetInjection = {
      id: 'no-dep',
      changes: [points.form.inject({ component })],
    };
    const ext = contributor('a', [], [injection]);

    expect(() => mergeWidgetInjections([owner('base', scope), ext])).toThrow(
      /add "base" to the dependencies of a/,
    );
  });

  it('allows a change on the contributor\'s own extension with no dependency', () => {
    const selfOwner: ExtensionManifest = {
      id: 'self',
      name: 'self',
      version: '0.0.0',
      modules: [{ id: scope, domain: {} }],
      widgetInjections: [{ id: 'self-inject', changes: [points.form.inject({ component })] }],
    };

    expect(() => mergeWidgetInjections([selfOwner])).not.toThrow();
  });

  it('rejects two injections that replace the same zone', () => {
    const first: WidgetInjection = {
      id: 'replace-1',
      changes: [points.form.inject({ position: 'replace', component })],
    };
    const second: WidgetInjection = {
      id: 'replace-2',
      changes: [points.form.inject({ position: 'replace', component })],
    };
    const ext = contributor('a', ['base'], [first, second]);

    expect(() => mergeWidgetInjections([owner('base', scope), ext])).toThrow(
      /Only one injection may replace the zone "test-login-.+\.form": replace-1 \(a\), replace-2 \(a\)/,
    );
  });

  it('rejects two injections that override the same text key', () => {
    const first: WidgetInjection = {
      id: 'text-1',
      changes: [points.texts.override({ username: 'Email' })],
    };
    const second: WidgetInjection = {
      id: 'text-2',
      changes: [points.texts.override({ username: 'E-mail' })],
    };
    const ext = contributor('a', ['base'], [first, second]);

    expect(() => mergeWidgetInjections([owner('base', scope), ext])).toThrow(
      /Two injections override the text "test-login-.+\.texts\.username"/,
    );
  });

  it('sorts a zone\'s components by order, keeping load order for ties', () => {
    const injection: WidgetInjection = {
      id: 'ordered',
      changes: [
        points.form.inject({ order: 2, component }),
        points.form.inject({ order: 1, component }),
        points.form.inject({ component }), // no order: default 0, collected last
      ],
    };
    const ext = contributor('a', ['base'], [injection]);

    const registry = mergeWidgetInjections([owner('base', scope), ext]);
    const keys = registry.zones[`${scope}.form`]?.map(c => c.key);

    expect(keys).toEqual(['ordered#2', 'ordered#1', 'ordered#0']);
  });

  it('keys each zone component "<injectionId>#<index>"', () => {
    const injection: WidgetInjection = {
      id: 'keyed',
      changes: [points.form.inject({ component }), points.form.inject({ component })],
    };
    const ext = contributor('a', ['base'], [injection]);

    const registry = mergeWidgetInjections([owner('base', scope), ext]);

    expect(registry.zones[`${scope}.form`]?.map(c => c.key)).toEqual(['keyed#0', 'keyed#1']);
  });

  it('chains value patches in load order', () => {
    const valueScope = `test-value-${Math.random().toString(36).slice(2)}`;
    const valuePoints = definePoints(valueScope, { fields: point.value<readonly string[]>() });
    const injection: WidgetInjection = {
      id: 'patches',
      changes: [
        valuePoints.fields.patch(items => [...items, 'b']),
        valuePoints.fields.patch(items => [...items, 'c']),
      ],
    };
    const ext = contributor('a', ['base'], [injection]);

    const registry = mergeWidgetInjections([owner('base', valueScope), ext]);
    const result = registry.values[`${valueScope}.fields`]?.reduce<readonly string[]>(
      (value, { patch }) => patch(value) as readonly string[],
      ['a'],
    );

    expect(result).toEqual(['a', 'b', 'c']);
  });

  it('gives the registry the can of the access policy', () => {
    const can = () => true;
    const registry = mergeWidgetInjections([owner('base', scope)], can);

    expect(registry.can).toBe(can);
  });

  it('returns an empty registry with no extension declaring an injection', () => {
    const registry = mergeWidgetInjections([owner('base', scope)]);

    expect(registry).toEqual({ zones: {}, texts: {}, values: {}, can: undefined });
  });
});
