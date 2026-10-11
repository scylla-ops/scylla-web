import { mount, unmount } from 'svelte';
import WidgetInjectionHost from './WidgetInjectionHost.svelte';
import { componentsOf, nameOf, type RegisteredComponent } from './widget-injection-registry.ts';
import type { WidgetPoint } from './widget-points.struct.ts';
import { resolveZone } from './widget-zone.calculator.ts';

interface MountedComponent {
  readonly instance: object;
  readonly wrapper: HTMLElement;
}

/** A marker element: invisible in layout (`display: contents`), a stable handle to move or remove. */
const createContainer = (): HTMLElement => {
  const element = document.createElement('div');
  element.dataset.widgetHost = '';
  element.style.display = 'contents';
  return element;
};

/**
 * What a zone point does as an attachment: on the element it is put on, it mounts the components
 * of `zone` that apply to the context, before and after the element's own children, and keeps
 * them in sync as the context changes. Runs inside the attachment's effect: read `context` only
 * in the nested `$effect` and in the components, or every change would remount the zone.
 */
export const mountZone = (
  node: HTMLElement,
  zone: WidgetPoint,
  context: () => unknown,
): (() => void) => {
  const parts = componentsOf(zone);
  node.dataset.widgetZone = nameOf(zone) ?? '';

  if (parts.length === 0) {
    // No contributor: no host, no cost.
    return () => {
      delete node.dataset.widgetZone;
    };
  }

  // One object shared by every mounted component: its getter reads the owner's state, so a change
  // re-renders all of them, with no remount.
  const props = {
    get context() {
      return context();
    },
  };

  const before = createContainer();
  const replaced = createContainer();
  const after = createContainer();
  // In one call, so the order is explicit: `before`, then `replaced`, both ahead of whatever
  // Svelte already rendered as this element's own children.
  node.prepend(before, replaced);
  node.append(after);

  // Imperative bookkeeping of mounted instances, read only inside the `$effect` below —
  // nothing renders from this map reactively.
  // eslint-disable-next-line svelte/prefer-svelte-reactivity
  const mounted = new Map<string, MountedComponent>();

  const mountPart = (part: RegisteredComponent): MountedComponent => {
    const wrapper = createContainer();
    const instance = mount(WidgetInjectionHost, { target: wrapper, props: { part, props } });
    return { instance, wrapper };
  };

  // `when` and the access policy's `can` are reactive too: a permission that loads after mount,
  // or a `when` that flips, re-runs this.
  $effect(() => {
    const resolved = resolveZone(parts, props.context);
    const groups: readonly (readonly [HTMLElement, readonly RegisteredComponent[]])[] = [
      [before, resolved.before],
      [replaced, resolved.replace ? [resolved.replace] : []],
      [after, resolved.after],
    ];
    // A plain lookup built fresh on every effect run, never read outside it.
    // eslint-disable-next-line svelte/prefer-svelte-reactivity
    const wantedKeys = new Set(groups.flatMap(([, wanted]) => wanted.map(part => part.key)));

    for (const [key, entry] of mounted) {
      if (!wantedKeys.has(key)) {
        void unmount(entry.instance);
        entry.wrapper.remove();
        mounted.delete(key);
      }
    }

    for (const [container, wanted] of groups) {
      for (const part of wanted) {
        let entry = mounted.get(part.key);
        if (!entry) {
          entry = mountPart(part);
          mounted.set(part.key, entry);
        }
        // Moves the wrapper to the end of its container: doing this in `wanted`'s order, for
        // every part, reconstructs the exact right order with no diffing and no remount.
        container.appendChild(entry.wrapper);
      }
    }

    node.toggleAttribute('data-widget-replaced', resolved.replace !== undefined);
  });

  return () => {
    for (const entry of mounted.values()) void unmount(entry.instance);
    mounted.clear();
    before.remove();
    replaced.remove();
    after.remove();
    node.removeAttribute('data-widget-replaced');
    delete node.dataset.widgetZone;
  };
};
