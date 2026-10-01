// @vitest-environment node
import { describe, it, expect, afterEach } from 'vitest';
import { definePoints, point } from '../define-points.ts';
import { installWidgetInjectionsForTest } from '../install-widget-injections-for-test.ts';
import { componentsOf, setWidgetInjectionRegistry } from '../widget-injection-registry.ts';
import type { WidgetInjection } from '../widget-injection.struct.ts';

const uniqueScope = (name: string): string => `${name}-${Math.random().toString(36).slice(2)}`;
const component = () => Promise.resolve({ default: {} as never });

afterEach(() => {
  setWidgetInjectionRegistry(null);
});

describe('installWidgetInjectionsForTest', () => {
  it('installs a zone component so the point sees it, with no owner or conflict check', () => {
    const scope = uniqueScope('zone');
    const points = definePoints(scope, { form: point.zone() });
    const injection: WidgetInjection = { id: 'fake', changes: [points.form.inject({ component })] };

    installWidgetInjectionsForTest(injection);

    expect(points.form.hasReplacement(undefined)).toBe(false);
  });

  it('installs an overridden text', () => {
    const scope = uniqueScope('texts');
    const points = definePoints(scope, { texts: point.texts({ title: 'Login' }) });
    const injection: WidgetInjection = { id: 'fake', changes: [points.texts.override({ title: 'Sign in' })] };

    installWidgetInjectionsForTest(injection);

    expect(points.texts.messages).toEqual({ title: 'Sign in' });
  });

  it('installs a value patch', () => {
    const scope = uniqueScope('value');
    const points = definePoints(scope, { fields: point.value<readonly string[]>() });
    const injection: WidgetInjection = {
      id: 'fake',
      changes: [points.fields.patch(fields => [...fields, 'new'])],
    };

    installWidgetInjectionsForTest(injection);

    expect(points.fields.resolve(['a'])).toEqual(['a', 'new']);
  });

  it('sorts zone components by order across several injections', () => {
    const scope = uniqueScope('order');
    const points = definePoints(scope, { form: point.zone() });
    const first: WidgetInjection = { id: 'first', changes: [points.form.inject({ order: 2, component })] };
    const second: WidgetInjection = { id: 'second', changes: [points.form.inject({ order: 1, component })] };

    installWidgetInjectionsForTest(first, second);

    // The point's own API does not expose raw order: read the registry directly.
    expect(componentsOf(points.form.name).map(c => c.key)).toEqual(['second#0', 'first#0']);
  });
});
