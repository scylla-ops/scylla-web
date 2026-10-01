// @vitest-environment node
import { describe, it, expect, afterEach, vi } from 'vitest';
import { definePoints, point } from '../define-points.ts';
import { setWidgetInjectionRegistry } from '../widget-injection-registry.ts';
import type { RegisteredComponent, RegisteredPatch } from '../widget-injection-registry.ts';

const uniqueScope = (name: string): string => `${name}-${Math.random().toString(36).slice(2)}`;

afterEach(() => {
  setWidgetInjectionRegistry(null);
});

describe('definePoints', () => {
  it('names each point "<scope>.<key>"', () => {
    const scope = uniqueScope('names');
    const points = definePoints(scope, { form: point.zone<{ isPending: boolean }>() });

    expect(points.form.name).toBe(`${scope}.form`);
  });

  it('throws when a scope is defined twice', () => {
    const scope = uniqueScope('dup');
    definePoints(scope, { form: point.zone() });

    expect(() => definePoints(scope, { footer: point.zone() })).toThrow(
      new RegExp(`Two modules define points with the scope "${scope}"`),
    );
  });

  describe('a zone point', () => {
    it('inject() builds a zone WidgetChange carrying the options', () => {
      const scope = uniqueScope('zone-inject');
      const points = definePoints(scope, { form: point.zone() });
      const component = () => Promise.resolve({ default: {} as never });

      const change = points.form.inject({ position: 'after', component });

      expect(change).toEqual({
        point: `${scope}.form`,
        kind: 'zone',
        payload: { position: 'after', component },
      });
    });

    it('with() builds the binding the action reads', () => {
      const scope = uniqueScope('zone-with');
      const points = definePoints(scope, { form: point.zone<{ isPending: boolean }>() });

      const binding = points.form.with({ isPending: true });

      expect(binding).toEqual({ zone: `${scope}.form`, context: { isPending: true } });
    });

    it('hasReplacement() reflects a replace injection active for this context', () => {
      const scope = uniqueScope('zone-replace');
      const points = definePoints(scope, { form: point.zone<{ isPending: boolean }>() });
      const component = () => Promise.resolve({ default: {} as never });
      const replacement: RegisteredComponent<{ isPending: boolean }> = {
        key: 'x#0',
        position: 'replace',
        when: ctx => !ctx.isPending,
        component,
      };
      // The registry stores untyped payloads by design (`RegisteredComponent<unknown>`): a
      // typed fixture built for one specific context does not satisfy that variance, the same
      // way the real loader's merge (working from `unknown` `WidgetChange` payloads) does not.
      setWidgetInjectionRegistry({
        zones: { [`${scope}.form`]: [replacement as RegisteredComponent] },
        texts: {},
        values: {},
      });

      expect(points.form.hasReplacement({ isPending: false })).toBe(true);
      expect(points.form.hasReplacement({ isPending: true })).toBe(false);
    });

    it('hasReplacement() is false with no registry installed', () => {
      const scope = uniqueScope('zone-no-registry');
      const points = definePoints(scope, { form: point.zone() });

      expect(points.form.hasReplacement(undefined)).toBe(false);
    });
  });

  describe('a texts point', () => {
    const messages = { title: 'Login', username: 'Username' };

    it('override() builds a texts WidgetChange carrying the overrides', () => {
      const scope = uniqueScope('texts-override');
      const points = definePoints(scope, { texts: point.texts(messages) });

      const change = points.texts.override({ username: 'Email' });

      expect(change).toEqual({ point: `${scope}.texts`, kind: 'texts', payload: { username: 'Email' } });
    });

    it('messages gives the original object with no registry installed', () => {
      const scope = uniqueScope('texts-default');
      const points = definePoints(scope, { texts: point.texts(messages) });

      expect(points.texts.messages).toBe(messages);
    });

    it('messages merges the overrides of the registry over the originals', () => {
      const scope = uniqueScope('texts-merged');
      const points = definePoints(scope, { texts: point.texts(messages) });
      setWidgetInjectionRegistry({
        zones: {},
        texts: { [`${scope}.texts`]: { username: 'Email' } },
        values: {},
      });

      expect(points.texts.messages).toEqual({ title: 'Login', username: 'Email' });
    });
  });

  describe('a value point', () => {
    it('patch() builds a value WidgetChange carrying the patch function', () => {
      const scope = uniqueScope('value-patch');
      const points = definePoints(scope, { fields: point.value<readonly string[]>() });
      const patch = (fields: readonly string[]) => [...fields, 'new'];

      const change = points.fields.patch(patch);

      expect(change).toEqual({ point: `${scope}.fields`, kind: 'value', payload: patch });
    });

    it('resolve() gives the original value with no registry installed', () => {
      const scope = uniqueScope('value-default');
      const points = definePoints(scope, { fields: point.value<readonly string[]>() });

      expect(points.fields.resolve(['a'])).toEqual(['a']);
    });

    it('resolve() applies the patches of the registry, in order', () => {
      const scope = uniqueScope('value-chain');
      const points = definePoints(scope, { fields: point.value<readonly string[]>() });
      const patches: RegisteredPatch[] = [
        { key: 'x#0', patch: (fields: unknown) => [...(fields as string[]), 'b'] },
        { key: 'x#1', patch: (fields: unknown) => [...(fields as string[]), 'c'] },
      ];
      setWidgetInjectionRegistry({ zones: {}, texts: {}, values: { [`${scope}.fields`]: patches } });

      expect(points.fields.resolve(['a'])).toEqual(['a', 'b', 'c']);
    });

    it('resolve() logs and skips a patch that throws, keeping the earlier result', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const scope = uniqueScope('value-throws');
      const points = definePoints(scope, { fields: point.value<readonly string[]>() });
      const patches: RegisteredPatch[] = [
        {
          key: 'broken#0',
          patch: () => {
            throw new Error('boom');
          },
        },
        { key: 'ok#0', patch: (fields: unknown) => [...(fields as string[]), 'ok'] },
      ];
      setWidgetInjectionRegistry({ zones: {}, texts: {}, values: { [`${scope}.fields`]: patches } });

      expect(points.fields.resolve(['a'])).toEqual(['a', 'ok']);
      expect(spy).toHaveBeenCalledWith('[widget-injections] broken#0 failed:', expect.any(Error));
      spy.mockRestore();
    });
  });
});
