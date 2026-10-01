import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import { definePoints, point } from '../define-points.ts';
import { installWidgetInjectionsForTest } from '../install-widget-injections-for-test.ts';
import { setWidgetInjectionRegistry } from '../widget-injection-registry.ts';
import type { WidgetInjection } from '../widget-injection.struct.ts';
import WidgetZone from './WidgetZone.fixture.svelte';
import { counts, resetCounts } from './counting-injected.counts.ts';

interface Ctx {
  show: boolean;
}

const uniqueScope = (name: string): string => `${name}-${Math.random().toString(36).slice(2)}`;

beforeEach(() => {
  resetCounts();
});

afterEach(() => {
  setWidgetInjectionRegistry(null);
});

describe('widgetZone', () => {
  it('mounts a "before" component before the default content, and an "after" one after it', async () => {
    const scope = uniqueScope('positions');
    const points = definePoints(scope, { zone: point.zone<Ctx>() });
    const injection: WidgetInjection = {
      id: 'positions',
      changes: [
        points.zone.inject({ position: 'before', component: () => import('./InjectedA.fixture.svelte') }),
        points.zone.inject({ position: 'after', component: () => import('./InjectedB.fixture.svelte') }),
      ],
    };
    installWidgetInjectionsForTest(injection);

    render(WidgetZone, { props: { binding: points.zone.with({ show: true }) } });

    const before = await screen.findByTestId('injected-a');
    const after = await screen.findByTestId('injected-b');
    const defaultContent = screen.getByTestId('default-content');

    // `before` precedes the default content, which precedes `after`, in document order.
    expect(before.compareDocumentPosition(defaultContent) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(defaultContent.compareDocumentPosition(after) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('marks the zone as replaced as soon as a "replace" component is active, before its import resolves', () => {
    const scope = uniqueScope('replace');
    const points = definePoints(scope, { zone: point.zone<Ctx>() });
    const injection: WidgetInjection = {
      id: 'replace',
      changes: [
        points.zone.inject({
          position: 'replace',
          component: () => new Promise(() => {}), // never resolves in this test
        }),
      ],
    };
    installWidgetInjectionsForTest(injection);

    render(WidgetZone, { props: { binding: points.zone.with({ show: true }) } });

    expect(screen.getByTestId('zone')).toHaveAttribute('data-widget-replaced');
  });

  it("updates an already-mounted component's context without remounting it", async () => {
    const scope = uniqueScope('update');
    const points = definePoints(scope, { zone: point.zone<Ctx>() });
    const injection: WidgetInjection = {
      id: 'counting',
      changes: [points.zone.inject({ component: () => import('./CountingInjected.fixture.svelte') })],
    };
    installWidgetInjectionsForTest(injection);

    const { rerender } = render(WidgetZone, { props: { binding: points.zone.with({ show: true }) } });
    await screen.findByTestId('counting');
    expect(counts.mounts).toBe(1);

    await rerender({ binding: points.zone.with({ show: true }) });

    expect(counts.mounts).toBe(1);
    expect(counts.cleanups).toBe(0);
  });

  it('mounts and unmounts a component as its `when` crosses the context', async () => {
    const scope = uniqueScope('when');
    const points = definePoints(scope, { zone: point.zone<Ctx>() });
    const injection: WidgetInjection = {
      id: 'conditional',
      changes: [
        points.zone.inject({
          when: (ctx: Ctx) => ctx.show,
          component: () => import('./InjectedA.fixture.svelte'),
        }),
      ],
    };
    installWidgetInjectionsForTest(injection);

    const { rerender } = render(WidgetZone, { props: { binding: points.zone.with({ show: false }) } });
    await waitFor(() => expect(screen.queryByTestId('injected-a')).not.toBeInTheDocument());

    await rerender({ binding: points.zone.with({ show: true }) });
    await screen.findByTestId('injected-a');

    await rerender({ binding: points.zone.with({ show: false }) });
    await waitFor(() => expect(screen.queryByTestId('injected-a')).not.toBeInTheDocument());
  });

  it('logs and renders nothing for a component whose import rejects', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const scope = uniqueScope('import-fails');
    const points = definePoints(scope, { zone: point.zone<Ctx>() });
    const injection: WidgetInjection = {
      id: 'broken-import',
      changes: [points.zone.inject({ component: () => Promise.reject(new Error('boom')) })],
    };
    installWidgetInjectionsForTest(injection);

    render(WidgetZone, { props: { binding: points.zone.with({ show: true }) } });

    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith('[widget-injections] broken-import#0 failed:', expect.any(Error)),
    );
    expect(screen.getByTestId('default-content')).toBeInTheDocument();
    spy.mockRestore();
  });

  it('logs and renders nothing for a component that throws while rendering', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const scope = uniqueScope('render-fails');
    const points = definePoints(scope, { zone: point.zone<Ctx>() });
    const injection: WidgetInjection = {
      id: 'broken-render',
      changes: [points.zone.inject({ component: () => import('./ThrowingInjected.fixture.svelte') })],
    };
    installWidgetInjectionsForTest(injection);

    render(WidgetZone, { props: { binding: points.zone.with({ show: true }) } });

    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith('[widget-injections] broken-render#0 failed:', expect.any(Error)),
    );
    expect(screen.getByTestId('default-content')).toBeInTheDocument();
    spy.mockRestore();
  });

  it('leaves no host element and runs every mounted component\'s own cleanup on destroy', async () => {
    const scope = uniqueScope('destroy');
    const points = definePoints(scope, { zone: point.zone<Ctx>() });
    const injection: WidgetInjection = {
      id: 'counting',
      changes: [points.zone.inject({ component: () => import('./CountingInjected.fixture.svelte') })],
    };
    installWidgetInjectionsForTest(injection);

    const { unmount } = render(WidgetZone, { props: { binding: points.zone.with({ show: true }) } });
    const zone = screen.getByTestId('zone');
    await screen.findByTestId('counting');
    expect(counts.mounts).toBe(1);

    unmount();

    expect(zone).not.toHaveAttribute('data-widget-zone');
    expect(zone).not.toHaveAttribute('data-widget-replaced');
    expect(zone.querySelector('[data-widget-host]')).toBeNull();
    expect(counts.cleanups).toBe(1);
  });

  it('sets no host element for a zone that no injection changes', () => {
    const scope = uniqueScope('empty');
    const points = definePoints(scope, { zone: point.zone<Ctx>() });

    render(WidgetZone, { props: { binding: points.zone.with({ show: true }) } });

    const zone = screen.getByTestId('zone');
    expect(zone.querySelector('[data-widget-host]')).toBeNull();
  });
});
