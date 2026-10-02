// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { point, type ExtensionManifest, type WidgetInjection } from '@scylla/core-sdk';
import { mergeWidgetInjections } from '../merge-widget-injections.ts';

interface Ctx {
  isPending: boolean;
}

const loginPoints = {
  form: point.zone<Ctx>(),
  texts: point.texts({ username: { id: 'username', message: 'Username' } }),
};

const owner = (id: string): ExtensionManifest => ({
  id,
  name: id,
  version: '0.0.0',
  modules: [{ id: 'login', domain: {}, points: loginPoints }],
});

const contributor = (
  id: string,
  dependencies: readonly string[],
  injections: Readonly<Record<string, WidgetInjection>>,
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
  it('names each point "<module id>.<key>" from the points its module lists', () => {
    const registry = mergeWidgetInjections([owner('base')]);

    expect(registry.names.get(loginPoints.form)).toBe('login.form');
    expect(registry.names.get(loginPoints.texts)).toBe('login.texts');
  });

  it('rejects a change on a point that no loaded module lists', () => {
    const unlisted = point.zone();
    const ext = contributor('a', ['base'], { Ghost: [unlisted.inject({ component })] });

    expect(() => mergeWidgetInjections([owner('base'), ext])).toThrow(
      'The injection "a/Ghost" changes a point that no loaded module lists in its `points`.',
    );
  });

  it('rejects a point that two modules list', () => {
    const twice: ExtensionManifest = {
      id: 'base',
      name: 'base',
      version: '0.0.0',
      modules: [
        { id: 'login', domain: {}, points: loginPoints },
        { id: 'signin', domain: {}, points: { footer: loginPoints.form } },
      ],
    };

    expect(() => mergeWidgetInjections([twice])).toThrow(
      'The point "signin.footer" is also listed as "login.form".',
    );
  });

  it('rejects a change on an extension not listed as a dependency', () => {
    const ext = contributor('a', [], { NoDep: [loginPoints.form.inject({ component })] });

    expect(() => mergeWidgetInjections([owner('base'), ext])).toThrow(
      'The injection "a/NoDep" changes "login.form" of base: add "base" to the dependencies of a.',
    );
  });

  it("allows a change on the contributor's own extension with no dependency", () => {
    const self: ExtensionManifest = {
      ...owner('self'),
      widgetInjections: { SelfInject: [loginPoints.form.inject({ component })] },
    };

    expect(() => mergeWidgetInjections([self])).not.toThrow();
  });

  it('names each injection "<extension id>/<key>", so two extensions may use the same key', () => {
    const first = contributor('a', ['base'], { Link: [loginPoints.form.inject({ component })] });
    const second = contributor('b', ['base'], { Link: [loginPoints.form.inject({ component })] });

    const registry = mergeWidgetInjections([owner('base'), first, second]);

    expect(registry.zones.get(loginPoints.form)?.map(c => c.key)).toEqual(['a/Link#0', 'b/Link#0']);
  });

  it('names the zone in a conflict error', () => {
    const ext = contributor('a', ['base'], {
      One: [loginPoints.form.inject({ position: 'replace', component })],
      Two: [loginPoints.form.inject({ position: 'replace', component })],
    });

    expect(() => mergeWidgetInjections([owner('base'), ext])).toThrow(
      'Only one injection may replace the zone "login.form": a/One, a/Two.',
    );
  });

  it('gives the registry the can of the access policy', () => {
    const can = () => true;

    expect(mergeWidgetInjections([owner('base')], can).can).toBe(can);
  });
});
