import { afterEach, describe, expect, it, vi } from 'vitest';
import { flushSync, tick, untrack } from 'svelte';
import { installTestNavigator } from '@test/navigator.ts';
import { FLASH_MS, focusGroup } from '../group-focus.attachments.svelte.ts';

interface Focus {
  ready: boolean;
  keys: readonly string[];
  open: (key: string) => void;
}

/** The page: a header in a section for each key. */
const page = (keys: readonly string[]) => {
  const node = document.createElement('div');
  for (const key of keys) {
    const section = document.createElement('section');
    section.dataset.section = key;
    const header = document.createElement('div');
    header.dataset.part = 'project-section-header';
    section.append(header);
    node.append(section);
  }
  return node;
};

/** Runs the attachment the way a template does: in an effect, with its options as state. */
const attach = (node: HTMLElement, initial: Focus) => {
  let options = $state.raw(initial);
  const stop = $effect.root(() => {
    $effect(() => untrack(() => focusGroup(() => options)(node)));
  });
  flushSync();
  return {
    update: (next: Focus) => {
      options = next;
      flushSync();
    },
    stop,
  };
};

let restore: (() => void)[] = [];

afterEach(() => {
  restore.forEach(undo => undo());
  restore = [];
});

const open = (search: string) => {
  const navigator = installTestNavigator({ pathname: '/acme/projects', search });
  restore.push(navigator.restore);
  return navigator;
};

describe('focusGroup', () => {
  it('opens the group of the URL, scrolls to it, flashes its header and clears the URL', async () => {
    const { navigate } = open('?group=g2');
    const node = page(['g1', 'g2', 'ungrouped']);
    const section = node.querySelector<HTMLElement>('[data-section="g2"]')!;
    const openSection = vi.fn();

    const focus = attach(node, { ready: true, keys: ['g1', 'g2', 'ungrouped'], open: openSection });
    restore.push(focus.stop);
    await tick();

    expect(openSection).toHaveBeenCalledWith('g2');
    expect(vi.mocked(Element.prototype.scrollIntoView).mock.contexts).toEqual([section]);
    expect(section.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
    expect(section.querySelector('[data-part]')!.animate).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({ duration: FLASH_MS }),
    );
    expect(navigate).toHaveBeenCalledWith('/acme/projects', { replace: true });
  });

  it('waits for the sections before it reads the group', async () => {
    open('?group=g1');
    const openSection = vi.fn();

    const focus = attach(page([]), { ready: false, keys: [], open: openSection });
    restore.push(focus.stop);
    expect(openSection).not.toHaveBeenCalled();

    focus.update({ ready: true, keys: ['g1'], open: openSection });
    await tick();
    expect(openSection).toHaveBeenCalledWith('g1');
  });

  it('jumps with no smooth scroll and no flash for a reduced motion', async () => {
    open('?group=g1');
    vi.mocked(window.matchMedia).mockImplementation(
      query => ({ matches: query.includes('reduce') }) as MediaQueryList,
    );
    const node = page(['g1']);

    const focus = attach(node, { ready: true, keys: ['g1'], open: vi.fn() });
    restore.push(focus.stop);
    await tick();

    const section = node.querySelector<HTMLElement>('[data-section="g1"]')!;
    expect(section.scrollIntoView).toHaveBeenCalledWith({ behavior: 'instant', block: 'start' });
    expect(section.querySelector('[data-part]')!.animate).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({ duration: 0 }),
    );
  });

  it('clears a group that the page does not have, and opens nothing', async () => {
    const { navigate } = open('?group=gone&sort=name');
    const openSection = vi.fn();

    const focus = attach(page(['g1']), { ready: true, keys: ['g1'], open: openSection });
    restore.push(focus.stop);
    await tick();

    expect(openSection).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith('/acme/projects?sort=name', { replace: true });
  });

  it('does nothing with no group in the URL', () => {
    const { navigate } = open('');
    const openSection = vi.fn();

    const focus = attach(page(['g1']), { ready: true, keys: ['g1'], open: openSection });
    restore.push(focus.stop);

    expect(openSection).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });
});
