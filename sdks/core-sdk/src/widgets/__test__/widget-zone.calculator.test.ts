// @vitest-environment node
import { describe, it, expect, afterEach, vi } from 'vitest';
import { setWidgetInjectionRegistry, type RegisteredComponent } from '../widget-injection-registry.ts';
import { resolveZone } from '../widget-zone.calculator.ts';

const component = () => Promise.resolve({ default: {} as never });

const part = <C = undefined>(
  overrides: Partial<RegisteredComponent<C>> & { key: string },
): RegisteredComponent<C> => ({
  component,
  ...overrides,
});

afterEach(() => {
  setWidgetInjectionRegistry(null);
});

describe('resolveZone', () => {
  it('splits by position, defaulting to "after"', () => {
    const before = part({ key: 'b', position: 'before' });
    const after = part({ key: 'a', position: 'after' });
    const implicit = part({ key: 'i' });

    const resolved = resolveZone([before, after, implicit], undefined);

    expect(resolved.before).toEqual([before]);
    expect(resolved.after).toEqual([after, implicit]);
    expect(resolved.replace).toBeUndefined();
  });

  it('keeps the given order within a group (the caller already sorted it)', () => {
    const first = part({ key: 'first', order: 1 });
    const second = part({ key: 'second', order: 2 });

    const resolved = resolveZone([first, second], undefined);

    expect(resolved.after.map(p => p.key)).toEqual(['first', 'second']);
  });

  it('drops a component whose `when` returns false for this context', () => {
    const shown = part<{ isPending: boolean }>({ key: 'shown', when: ctx => !ctx.isPending });
    const hidden = part<{ isPending: boolean }>({ key: 'hidden', when: ctx => ctx.isPending });

    const resolved = resolveZone([shown, hidden], { isPending: false });

    expect(resolved.after.map(p => p.key)).toEqual(['shown']);
  });

  it('drops and logs a component whose `when` throws', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const broken = part({
      key: 'broken',
      when: () => {
        throw new Error('boom');
      },
    });

    const resolved = resolveZone([broken], undefined);

    expect(resolved.after).toEqual([]);
    expect(spy).toHaveBeenCalledWith('[widget-injections] broken failed:', expect.any(Error));
    spy.mockRestore();
  });

  it('denies a component with a `permission` when no `can` is installed', () => {
    const gated = part({ key: 'gated', permission: 'some-permission' as never });

    const resolved = resolveZone([gated], undefined);

    expect(resolved.after).toEqual([]);
  });

  it('allows a component with a `permission` when `can` grants it', () => {
    setWidgetInjectionRegistry({ zones: {}, texts: {}, values: {}, can: () => true });
    const gated = part({ key: 'gated', permission: 'some-permission' as never });

    const resolved = resolveZone([gated], undefined);

    expect(resolved.after.map(p => p.key)).toEqual(['gated']);
  });

  it('gives at most one `replace`, since the loader already rejects a second one', () => {
    const replace = part({ key: 'r', position: 'replace' });

    const resolved = resolveZone([replace], undefined);

    expect(resolved.replace).toBe(replace);
  });
});
