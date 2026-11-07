import { untrack } from 'svelte';
import type { Attachment } from 'svelte/attachments';
import { motionDuration } from '@scylla/ui';
import { dialogHoldStore } from '@scylla/ui/stores';
import type { OnboardingSubject } from '@base/features/onboarding/domain/structs/onboarding-status.struct.ts';
import {
  easeRects,
  presentRects,
  scrollPlan,
  spotlightRect,
  unionRect,
  visibleArea,
  type TourRect,
} from '@base/features/onboarding/presentation/presenters/tour-placement.presenter.ts';
import type { TourAnchor, TourCondition, TourSpotStep } from './tour-steps.registry.ts';

export const LOST_AFTER_MS = 2000;
/** A request that hangs must not hold the card away for ever. */
export const LOST_LIMIT_MS = 10000;
export const MOVE_MS = 300;
export const HOLD_MS = 700;

export interface TourLayout {
  /** The boxes of the ring, eased between two steps. */
  targets: readonly (TourRect | null)[];
  /** Where the targets end: the card goes there at once and does not follow the ease. */
  final: readonly (TourRect | null)[];
  allowed: TourRect | null;
  /** The open menus and lists, and the `keepClear` of the step: the card must not cover them. */
  avoid: readonly TourRect[];
  moving: boolean;
}

export interface TourActionState {
  label: string;
  disabled: boolean;
}

export interface TourTracking {
  step: TourSpotStep;
  subject: OnboardingSubject;
  onLayout: (layout: TourLayout) => void;
  onAction: (action: TourActionState | null) => void;
  onAdvance: (found?: OnboardingSubject) => void;
  onUnlock: () => void;
  onLock: () => void;
  onLost: () => void;
  /** The target came back, or the page changed: the step is not lost any more. */
  onFound: () => void;
  onHint: (shown: boolean) => void;
  /** While it is true, an absent target does not count as lost: the page still loads. */
  isLoading: () => boolean;
  /** The user came back to this step with Previous: an `appear` waits until its element goes. */
  rewound?: boolean;
}

/** The layout box: a hover or press `scale` on the element or an ancestor must not move the spotlight. */
export const measure = (element: Element): TourRect | null => {
  const box = element.getBoundingClientRect();
  if (box.width === 0 && box.height === 0) {
    return unionRect(
      [...element.children].map(child => measure(child) ?? { x: 0, y: 0, width: 0, height: 0 }),
    );
  }
  if (!(element instanceof HTMLElement)) {
    return { x: box.x, y: box.y, width: box.width, height: box.height };
  }
  const width = element.offsetWidth;
  const height = element.offsetHeight;
  return {
    x: box.x + (box.width - width) / 2,
    y: box.y + (box.height - height) / 2,
    width,
    height,
  };
};

const rectKey = (rect: TourRect | null) =>
  rect
    ? `${Math.round(rect.x)},${Math.round(rect.y)},${Math.round(rect.width)},${Math.round(rect.height)}`
    : '-';

/** What the card shows of the button it repeats: its text and whether it takes a click. */
export const pressable = (element: Element | null): HTMLElement | null => {
  if (!(element instanceof HTMLElement)) return null;
  if (element.matches('button, a[href]')) return element;
  return element.querySelector<HTMLElement>('button, a[href]') ?? element;
};

export const readAction = (target: Element | null): TourActionState | null => {
  const element = pressable(target);
  if (!element) return null;
  const label = (element.getAttribute('aria-label') ?? element.textContent ?? '').trim();
  const disabled =
    (element instanceof HTMLButtonElement && element.disabled) ||
    element.getAttribute('aria-disabled') === 'true' ||
    element.hasAttribute('data-disabled');
  return { label, disabled };
};

const actionKey = (action: TourActionState | null) =>
  action ? `${action.disabled ? 0 : 1}:${action.label}` : '-';

const scrollersOf = (element: Element): Element[] => {
  const scrollers: Element[] = [];
  const { body } = element.ownerDocument;
  for (
    let parent = element.parentElement;
    parent && parent !== body;
    parent = parent.parentElement
  ) {
    const { display, overflowX, overflowY } = getComputedStyle(parent);
    if (display !== 'contents' && /auto|scroll/.test(overflowX + overflowY)) scrollers.push(parent);
  }
  return scrollers;
};

export const allowedAnchor = (step: TourSpotStep): TourAnchor | null =>
  step.nextWhen?.on === 'click' ? step.nextWhen.anchor : null;

/** Follows the targets of the step at each frame. A new step id starts the step over. */
export const trackTourStep =
  (options: () => TourTracking): Attachment<HTMLElement> =>
  node => {
    const document = node.ownerDocument;
    let tracking = untrack(options);
    let frame = 0;
    let lastLayout = '';
    let startedAt: number | null = null;
    let missingAt: number | null = null;
    let missingIdle = 0;
    let missingTotal = 0;
    let lost = false;
    let scrolled = false;
    let advanced = false;
    let unlocked = false;
    let locked = false;
    let seen = false;
    let hintShown = false;
    let armed = !tracking.rewound;
    let lastAction: string | null = null;
    let lastPathname = document.location.pathname;
    let shown: readonly (TourRect | null)[] = [];
    let moveFrom: readonly (TourRect | null)[] = [];
    let moveStart: number | null = null;
    let scrollers = new WeakMap<Element, Element[]>();

    const resolve = (anchor: TourAnchor) => anchor(document, tracking.subject);

    const clearMissing = () => {
      missingAt = null;
      missingIdle = 0;
      missingTotal = 0;
    };

    const found = () => {
      clearMissing();
      if (!lost) return;
      lost = false;
      tracking.onFound();
    };

    const reset = () => {
      lastLayout = '';
      startedAt = null;
      clearMissing();
      lost = false;
      scrolled = false;
      advanced = false;
      unlocked = false;
      locked = false;
      seen = false;
      hintShown = false;
      armed = !tracking.rewound;
      lastAction = null;
      moveFrom = shown;
      moveStart = null;
      scrollers = new WeakMap();
    };

    const advance = (next?: OnboardingSubject) => {
      if (advanced) return;
      advanced = true;
      tracking.onAdvance(next);
    };

    const unlock = () => {
      if (unlocked) return;
      unlocked = true;
      locked = false;
      tracking.onUnlock();
    };

    const lock = () => {
      if (locked) return;
      locked = true;
      unlocked = false;
      tracking.onLock();
    };

    const boundsOf = (element: Element): TourRect[] => {
      const known = scrollers.get(element) ?? scrollersOf(element);
      scrollers.set(element, known);
      return presentRects(known.map(scroller => measure(scroller)));
    };

    const ease = (targets: readonly (TourRect | null)[], now: number) => {
      if (!moveFrom.some(Boolean) || !targets[0]) return targets;
      moveStart ??= now;
      const duration = motionDuration(MOVE_MS);
      const progress = duration === 0 ? 1 : Math.min((now - moveStart) / duration, 1);
      if (progress >= 1) {
        moveFrom = [];
        lastLayout = '';
      }
      return easeRects(moveFrom, targets, progress);
    };

    const countMissing = (now: number) => {
      const elapsed = missingAt === null ? 0 : now - missingAt;
      missingAt = now;
      missingTotal += elapsed;
      if (!tracking.isLoading()) missingIdle += elapsed;
      if (!lost && (missingIdle >= LOST_AFTER_MS || missingTotal >= LOST_LIMIT_MS)) {
        lost = true;
        tracking.onLost();
      }
    };

    const tick = (now: number) => {
      startedAt ??= now;
      const { step } = tracking;
      const view = { width: window.innerWidth, height: window.innerHeight };
      const elements = step.targets.map(resolve);
      const final = elements.map(element => {
        const box = element && measure(element);
        return element && box ? spotlightRect(box, view, boundsOf(element)) : null;
      });
      const targets = ease(final, now);
      const allowedElement = allowedAnchor(step);
      const allowedTarget = allowedElement ? resolve(allowedElement) : null;
      const allowed = allowedTarget ? measure(allowedTarget) : null;
      const keepClear = step.keepClear ? resolve(step.keepClear) : null;
      const avoid = presentRects(
        [
          ...document.querySelectorAll('[role="menu"], [role="listbox"]'),
          ...(keepClear ? [keepClear] : []),
        ].map(measure),
      );
      const moving = moveFrom.some(Boolean) && !!final[0];

      const holding = !final[0] && moveFrom.some(Boolean) && now - startedAt < HOLD_MS;
      const layout = [...targets, ...final, allowed, ...avoid].map(rectKey).join(';') + moving;
      if (!holding && layout !== lastLayout) {
        lastLayout = layout;
        shown = targets;
        tracking.onLayout({ targets, final, allowed, avoid, moving });
      }

      if (step.action) {
        const action = readAction(resolve(step.action.anchor));
        const key = actionKey(action);
        if (key !== lastAction) {
          lastAction = key;
          tracking.onAction(action);
        }
      }

      const { pathname } = document.location;
      if (pathname !== lastPathname) {
        lastPathname = pathname;
        found();
      }

      const [first] = elements;
      const box = first && measure(first);
      if (first && box) {
        found();
        if (!scrolled) {
          scrolled = true;
          const block = scrollPlan(box, visibleArea(view, boundsOf(first)));
          if (block) first.scrollIntoView({ block, inline: 'nearest' });
        }
      } else {
        countMissing(now);
      }

      if (step.hint) {
        const hint = now - startedAt >= step.hint.afterMs && resolve(step.hint.when) !== null;
        if (hint !== hintShown) {
          hintShown = hint;
          tracking.onHint(hint);
        }
      }

      if (step.advance.on === 'appear') {
        const element = resolve(step.advance.anchor);
        if (!element) armed = true;
        else if (armed) advance(step.advance.found?.(element));
      }
      if (step.advance.on === 'gone') {
        if (resolve(step.advance.anchor)) seen = true;
        else if (seen) advance();
      }
      if (step.nextWhen?.on === 'appear') {
        if (resolve(step.nextWhen.anchor)) unlock();
        else lock();
      }

      frame = requestAnimationFrame(tick);
    };

    const clickedIn = (condition: TourCondition | undefined, target: Node) =>
      condition?.on === 'click' && !!resolve(condition.anchor)?.contains(target);

    const onClick = (event: MouseEvent) => {
      if (!(event.target instanceof Node)) return;
      const { advance: next, nextWhen } = tracking.step;
      if (next.on === 'click' && clickedIn(next, event.target)) advance();
      if (clickedIn(nextWhen, event.target)) unlock();
    };

    $effect(() => {
      const next = options();
      const moved = next.step.id !== untrack(() => tracking.step.id);
      tracking = next;
      if (moved) reset();
    });

    document.addEventListener('click', onClick, true);
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('click', onClick, true);
    };
  };

/** Only Skip leaves a step that holds a dialog: no Escape, outside click or close button. */
export const holdDialogs =
  (held: () => boolean): Attachment<HTMLElement> =>
  () => {
    $effect(() => {
      dialogHoldStore.setState({ held: held() });
    });
    return () => dialogHoldStore.setState({ held: false });
  };

/** Tells what lies outside the tour, such as a launcher in the same corner, to stay out of it. */
export const markTourActive: Attachment<HTMLElement> = node => {
  const root = node.ownerDocument.documentElement;
  root.setAttribute('data-tour-active', '');
  return () => root.removeAttribute('data-tour-active');
};

export interface TourKeyboard {
  /** Stops the search shortcut, which opens over the step. */
  holdSearch: boolean;
  /** Tab goes around the targets and the card, and not into the page behind the dim. */
  loopTab: boolean;
  targets: () => readonly (Element | null)[];
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const canTakeFocus = (element: Element) =>
  !element.closest('[inert]') &&
  element.getClientRects().length > 0 &&
  getComputedStyle(element).visibility !== 'hidden';

export const tourFocusables = (roots: readonly Element[]): HTMLElement[] => {
  const all = roots.flatMap(root => [
    ...(root.matches(FOCUSABLE) ? [root] : []),
    ...root.querySelectorAll(FOCUSABLE),
  ]);
  return all.filter(
    (element, at): element is HTMLElement =>
      all.indexOf(element) === at && element instanceof HTMLElement && canTakeFocus(element),
  );
};

export const holdKeyboard =
  (options: () => TourKeyboard): Attachment<HTMLElement> =>
  node => {
    const view = node.ownerDocument.defaultView;
    const onKeydown = (event: KeyboardEvent) => {
      const { holdSearch, loopTab, targets } = options();
      if (holdSearch && (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      if (!loopTab || event.key !== 'Tab') return;
      const active = node.ownerDocument.activeElement;
      if (active?.closest('[role="menu"], [role="listbox"], [contenteditable="true"]')) return;
      const card = node.querySelector('[data-tour-focus]');
      const list = tourFocusables(presentElements([...targets(), card]));
      event.preventDefault();
      if (list.length === 0) return;
      const at = list.findIndex(element => element === active);
      const next = event.shiftKey ? (at <= 0 ? list.length - 1 : at - 1) : (at + 1) % list.length;
      list[next]?.focus();
    };
    view?.addEventListener('keydown', onKeydown, true);
    return () => view?.removeEventListener('keydown', onKeydown, true);
  };

const presentElements = (elements: readonly (Element | null)[]): Element[] =>
  elements.filter((element): element is Element => !!element);

/** Keeps an open dialog of the page from taking a press on the tour as a click outside. */
export const holdPointer: Attachment<Element> = node => {
  const stop = (event: Event) => event.stopPropagation();
  const keepFocus = (event: Event) => event.preventDefault();
  node.addEventListener('pointerdown', stop);
  node.addEventListener('mousedown', keepFocus);
  return () => {
    node.removeEventListener('pointerdown', stop);
    node.removeEventListener('mousedown', keepFocus);
  };
};

export const portalToBody: Attachment<HTMLElement> = node => {
  node.ownerDocument.body.appendChild(node);
  return () => node.remove();
};

export interface TourBlocking {
  active: boolean;
  allowed: () => Element | null;
}

/** Makes the rest of `<body>` inert: no click, focus or key reaches the page. */
export const blockPage =
  (options: () => TourBlocking): Attachment<HTMLElement> =>
  node => {
    const body = node.ownerDocument.body;
    let blocking = untrack(options);
    // eslint-disable-next-line svelte/prefer-svelte-reactivity -- the elements this attachment made inert, never state
    const made = new Set<Element>();

    const release = (child: Element) => {
      child.removeAttribute('inert');
      made.delete(child);
    };

    const apply = () => {
      const allowed = blocking.active ? blocking.allowed() : null;
      for (const child of [...body.children]) {
        const keep =
          !blocking.active ||
          child === node ||
          child.tagName === 'SCRIPT' ||
          (!!allowed && child.contains(allowed));
        if (keep) {
          if (made.has(child)) release(child);
        } else if (!child.hasAttribute('inert')) {
          child.setAttribute('inert', '');
          made.add(child);
        }
      }
    };

    const focusTour = () => {
      if (blocking.active && !node.contains(node.ownerDocument.activeElement)) {
        node.querySelector<HTMLElement>('[data-tour-focus]')?.focus({ preventScroll: true });
      }
    };

    const observer = new MutationObserver(apply);
    observer.observe(body, { childList: true });

    // Only the options re-run it: `allowed()` reads the page, not the tour's state.
    $effect(() => {
      blocking = options();
      untrack(() => {
        apply();
        focusTour();
      });
    });

    return () => {
      observer.disconnect();
      [...made].forEach(release);
    };
  };
