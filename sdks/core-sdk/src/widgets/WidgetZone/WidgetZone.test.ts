import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import { point } from '../point.ts';
import { installWidgetInjectionsForTest } from '../install-widget-injections-for-test.ts';
import { setWidgetInjectionRegistry } from '../widget-injection-registry.ts';
import WidgetZone from './WidgetZone.fixture.svelte';
import { counts, resetCounts } from './widget-zone.fixtures.ts';

interface Ctx {
  show: boolean;
}

beforeEach(() => {
  resetCounts();
});

afterEach(() => {
  setWidgetInjectionRegistry(null);
});

describe('WidgetZone', () => {
  it('renders a "before" component before the default content, and an "after" one after it', async () => {
    const points = { zone: point.zone<Ctx>() };
    installWidgetInjectionsForTest({
      positions: [
        points.zone.inject({
          position: 'before',
          component: () => import('./InjectedA.fixture.svelte'),
        }),
        points.zone.inject({
          position: 'after',
          component: () => import('./InjectedB.fixture.svelte'),
        }),
      ],
    });

    render(WidgetZone, { props: { point: points.zone, context: { show: true } } });

    const before = await screen.findByTestId('injected-a');
    const after = await screen.findByTestId('injected-b');
    const defaultContent = screen.getByTestId('default-content');

    // `before` precedes the default content, which precedes `after`, in document order.
    expect(
      before.compareDocumentPosition(defaultContent) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      defaultContent.compareDocumentPosition(after) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('does not render the default content as soon as a "replace" component is active, before its import resolves', () => {
    const points = { zone: point.zone<Ctx>() };
    installWidgetInjectionsForTest({
      replace: [
        points.zone.inject({
          position: 'replace',
          component: () => new Promise(() => {}), // never resolves in this test
        }),
      ],
    });

    render(WidgetZone, { props: { point: points.zone, context: { show: true } } });

    expect(screen.queryByTestId('default-content')).not.toBeInTheDocument();
  });

  it('gives an injected component the Svelte context of the owner', async () => {
    const points = { zone: point.zone<Ctx>() };
    installWidgetInjectionsForTest({
      reader: [points.zone.inject({ component: () => import('./ContextReader.fixture.svelte') })],
    });

    render(WidgetZone, { props: { point: points.zone, context: { show: true } } });

    expect(await screen.findByTestId('context-reader')).toHaveTextContent('from the owner');
  });

  it("updates an already-mounted component's context without remounting it", async () => {
    const points = { zone: point.zone<Ctx>() };
    installWidgetInjectionsForTest({
      counting: [
        points.zone.inject({ component: () => import('./CountingInjected.fixture.svelte') }),
      ],
    });

    const { rerender } = render(WidgetZone, {
      props: { point: points.zone, context: { show: true } },
    });
    await screen.findByTestId('counting');
    expect(counts.mounts).toBe(1);

    await rerender({ point: points.zone, context: { show: true } });

    expect(counts.mounts).toBe(1);
    expect(counts.cleanups).toBe(0);
  });

  it('mounts and unmounts a component as its `when` crosses the context', async () => {
    const points = { zone: point.zone<Ctx>() };
    installWidgetInjectionsForTest({
      conditional: [
        points.zone.inject({
          when: (ctx: Ctx) => ctx.show,
          component: () => import('./InjectedA.fixture.svelte'),
        }),
      ],
    });

    const { rerender } = render(WidgetZone, {
      props: { point: points.zone, context: { show: false } },
    });
    await waitFor(() => expect(screen.queryByTestId('injected-a')).not.toBeInTheDocument());

    await rerender({ point: points.zone, context: { show: true } });
    await screen.findByTestId('injected-a');

    await rerender({ point: points.zone, context: { show: false } });
    await waitFor(() => expect(screen.queryByTestId('injected-a')).not.toBeInTheDocument());
  });

  it('logs and renders nothing for a component whose import rejects', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const points = { zone: point.zone<Ctx>() };
    installWidgetInjectionsForTest({
      'broken-import': [points.zone.inject({ component: () => Promise.reject(new Error('boom')) })],
    });

    render(WidgetZone, { props: { point: points.zone, context: { show: true } } });

    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith(
        '[widget-injections] broken-import#0 failed:',
        expect.any(Error),
      ),
    );
    expect(screen.getByTestId('default-content')).toBeInTheDocument();
    spy.mockRestore();
  });

  it('logs and renders nothing for a component that throws while rendering, and keeps the others', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const points = { zone: point.zone<Ctx>() };
    installWidgetInjectionsForTest({
      'broken-render': [
        points.zone.inject({ component: () => import('./ThrowingInjected.fixture.svelte') }),
      ],
      working: [points.zone.inject({ component: () => import('./InjectedA.fixture.svelte') })],
    });

    render(WidgetZone, { props: { point: points.zone, context: { show: true } } });

    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith(
        '[widget-injections] broken-render#0 failed:',
        expect.any(Error),
      ),
    );
    expect(await screen.findByTestId('injected-a')).toBeInTheDocument();
    expect(screen.getByTestId('default-content')).toBeInTheDocument();
    spy.mockRestore();
  });

  it("runs every mounted component's own cleanup on destroy", async () => {
    const points = { zone: point.zone<Ctx>() };
    installWidgetInjectionsForTest({
      counting: [
        points.zone.inject({ component: () => import('./CountingInjected.fixture.svelte') }),
      ],
    });

    const { unmount } = render(WidgetZone, {
      props: { point: points.zone, context: { show: true } },
    });
    await screen.findByTestId('counting');
    expect(counts.mounts).toBe(1);

    unmount();

    expect(counts.cleanups).toBe(1);
  });

  it('renders only the default content for a zone that no injection changes', () => {
    const points = { zone: point.zone<Ctx>() };

    render(WidgetZone, { props: { point: points.zone, context: { show: true } } });

    expect(screen.getByTestId('zone')).toHaveTextContent(/^default content$/);
  });
});
