// @vitest-environment node
import { describe, it, expect, afterEach, vi } from 'vitest';
import { point } from '../point.ts';
import { buildWidgetInjectionRegistry } from '../build-widget-injection-registry.ts';
import { setWidgetInjectionRegistry } from '../widget-injection-registry.ts';

afterEach(() => {
  setWidgetInjectionRegistry(null);
});

describe('point', () => {
  describe('a zone point', () => {
    it('inject() builds a change that carries the point itself and the options', () => {
      const footer = point.zone();
      const component = () => Promise.resolve({ default: {} as never });

      const change = footer.inject({ position: 'after', component });

      expect(change.point).toBe(footer);
      expect(change.payload).toEqual({ position: 'after', component });
    });

    it('is itself the Svelte action that opens the zone', () => {
      expect(typeof point.zone()).toBe('function');
    });
  });

  describe('a texts point', () => {
    const messages = {
      title: { id: 'title', message: 'Login' },
      username: { id: 'username', message: 'Username' },
    };

    it('override() pairs each overridden message with its original descriptor', () => {
      const texts = point.texts(messages);
      const email = { id: 'email', message: 'Email' };

      const change = texts.override({ username: email });

      expect(change.point).toBe(texts);
      expect(change.payload).toEqual({ username: { original: messages.username, override: email } });
    });
  });

  describe('a value point', () => {
    it('resolve() gives the original value with no registry installed', () => {
      const fields = point.value<readonly string[]>();

      expect(fields.resolve(['a'])).toEqual(['a']);
    });

    it('resolve() applies its own patches in order, and not those of another point', () => {
      const fields = point.value<readonly string[]>();
      const other = point.value<readonly string[]>();
      setWidgetInjectionRegistry(
        buildWidgetInjectionRegistry([
          { id: 'x', changes: [fields.patch(f => [...f, 'b']), fields.patch(f => [...f, 'c'])] },
          { id: 'y', changes: [other.patch(f => [...f, 'other'])] },
        ]),
      );

      expect(fields.resolve(['a'])).toEqual(['a', 'b', 'c']);
    });

    it('resolve() logs and skips a patch that throws, keeping the earlier result', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const fields = point.value<readonly string[]>();
      setWidgetInjectionRegistry(
        buildWidgetInjectionRegistry([
          {
            id: 'broken',
            changes: [
              fields.patch(() => {
                throw new Error('boom');
              }),
            ],
          },
          { id: 'ok', changes: [fields.patch(f => [...f, 'ok'])] },
        ]),
      );

      expect(fields.resolve(['a'])).toEqual(['a', 'ok']);
      expect(spy).toHaveBeenCalledWith('[widget-injections] broken#0 failed:', expect.any(Error));
      spy.mockRestore();
    });
  });
});
