import { tick, untrack } from 'svelte';
import { createSearchParams } from '@platform/context';
import { ENTER_EASING, motionDuration, prefersReducedMotion } from '@scylla/ui';

/** The flash of the header of the group, once it is in view. */
export const FLASH_MS = 1200;

interface GroupFocus {
  /** The sections show: a key that is not in them is not a group of the page. */
  ready: boolean;
  /** The keys of the sections of the page. */
  keys: readonly string[];
  open: (key: string) => void;
}

/**
 * `?group=<id>`, from the search bar: the group opens, comes into view and its header flashes
 * once. Then the parameter leaves the URL, so the next pick of the same group does it again.
 */
export const focusGroup = (focus: () => GroupFocus) => (node: HTMLElement) => {
  const params = createSearchParams(['group'] as const);

  $effect(() => {
    const id = params.values.group;
    const { ready, keys, open } = focus();
    if (!id || !ready) return;
    untrack(() => {
      params.write({ group: '' });
      if (!keys.includes(id)) return;
      open(id);
      void tick().then(() => {
        const section = [...node.querySelectorAll<HTMLElement>('[data-section]')].find(
          element => element.dataset.section === id,
        );
        if (!section) return;
        section.scrollIntoView({
          behavior: prefersReducedMotion() ? 'instant' : 'smooth',
          block: 'start',
        });
        section
          .querySelector<HTMLElement>('[data-part="project-section-header"]')
          ?.animate(
            [
              { backgroundColor: 'color-mix(in oklab, var(--primary) 16%, transparent)' },
              { backgroundColor: 'transparent' },
            ],
            { duration: motionDuration(FLASH_MS), easing: ENTER_EASING },
          );
      });
    });
  });
};
