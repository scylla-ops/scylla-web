import type { Action } from 'svelte/action';
import { motionDuration } from '@scylla/ui';
import type { OnboardingSubject } from '../domain/structs/onboarding-status.struct.ts';
import { easeRects, unionRect, type TourRect } from './tour-placement.calculator.ts';
import type { TourAnchor, TourCondition, TourSpotStep } from './tour-steps.ts';

export const LOST_AFTER_MS = 2000;
export const MOVE_MS = 300;
export const HOLD_MS = 700;

export interface TourLayout {
  targets: readonly (TourRect | null)[];
  allowed: TourRect | null;
}

export interface TourTracking {
  step: TourSpotStep;
  subject: OnboardingSubject;
  onLayout: (layout: TourLayout) => void;
  onAdvance: () => void;
  onUnlock: () => void;
  onLost: () => void;
  onHint: (shown: boolean) => void;
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

const isOnScreen = (rect: TourRect) =>
  rect.y >= 0 &&
  rect.x >= 0 &&
  rect.y + rect.height <= window.innerHeight &&
  rect.x + rect.width <= window.innerWidth;

export const allowedAnchor = (step: TourSpotStep): TourAnchor | null =>
  step.nextWhen?.on === 'click' ? step.nextWhen.anchor : null;

export const trackTourStep: Action<HTMLElement, TourTracking> = (node, initial) => {
  const document = node.ownerDocument;
  let tracking = initial;
  let frame = 0;
  let lastLayout = '';
  let startedAt: number | null = null;
  let missingSince: number | null = null;
  let lost = false;
  let scrolled = false;
  let advanced = false;
  let unlocked = false;
  let hintShown = false;
  let shown: readonly (TourRect | null)[] = [];
  let moveFrom: readonly (TourRect | null)[] = [];
  let moveStart: number | null = null;

  const resolve = (anchor: TourAnchor) => anchor(document, tracking.subject);

  const reset = () => {
    lastLayout = '';
    startedAt = null;
    missingSince = null;
    lost = false;
    scrolled = false;
    advanced = false;
    unlocked = false;
    hintShown = false;
    moveFrom = shown;
    moveStart = null;
  };

  const advance = () => {
    if (advanced) return;
    advanced = true;
    tracking.onAdvance();
  };

  const unlock = () => {
    if (unlocked) return;
    unlocked = true;
    tracking.onUnlock();
  };

  const appeared = (condition: TourCondition | undefined) =>
    condition?.on === 'appear' && resolve(condition.anchor) !== null;

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

  const tick = (now: number) => {
    startedAt ??= now;
    const { step } = tracking;
    const elements = step.targets.map(resolve);
    const targets = ease(
      elements.map(element => (element ? measure(element) : null)),
      now,
    );
    const allowedElement = allowedAnchor(step);
    const allowedTarget = allowedElement ? resolve(allowedElement) : null;
    const allowed = allowedTarget ? measure(allowedTarget) : null;

    const holding = !targets[0] && moveFrom.some(Boolean) && now - startedAt < HOLD_MS;
    const layout = [...targets, allowed].map(rectKey).join(';');
    if (!holding && layout !== lastLayout) {
      lastLayout = layout;
      shown = targets;
      tracking.onLayout({ targets, allowed });
    }

    const [first] = elements;
    const [firstRect] = targets;
    if (first && firstRect) {
      missingSince = null;
      lost = false;
      if (!scrolled) {
        scrolled = true;
        if (!isOnScreen(firstRect)) first.scrollIntoView({ block: 'center', inline: 'nearest' });
      }
    } else {
      missingSince ??= now;
      if (!lost && now - missingSince >= LOST_AFTER_MS) {
        lost = true;
        tracking.onLost();
      }
    }

    if (step.hint) {
      const hint = now - startedAt >= step.hint.afterMs && resolve(step.hint.when) !== null;
      if (hint !== hintShown) {
        hintShown = hint;
        tracking.onHint(hint);
      }
    }

    if (step.advance.on === 'appear' && appeared(step.advance)) advance();
    if (appeared(step.nextWhen)) unlock();

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

  document.addEventListener('click', onClick, true);
  frame = requestAnimationFrame(tick);

  return {
    update(next) {
      if (next.step.id !== tracking.step.id) reset();
      tracking = next;
    },
    destroy() {
      cancelAnimationFrame(frame);
      document.removeEventListener('click', onClick, true);
    },
  };
};

/** Keeps an open dialog of the page from taking a press on the tour as a click outside. */
export const holdPointer: Action<Element> = node => {
  const stop = (event: Event) => event.stopPropagation();
  const keepFocus = (event: Event) => event.preventDefault();
  node.addEventListener('pointerdown', stop);
  node.addEventListener('mousedown', keepFocus);
  return {
    destroy() {
      node.removeEventListener('pointerdown', stop);
      node.removeEventListener('mousedown', keepFocus);
    },
  };
};

export const portalToBody: Action<HTMLElement> = node => {
  node.ownerDocument.body.appendChild(node);
  return {
    destroy() {
      node.remove();
    },
  };
};

export interface TourBlocking {
  active: boolean;
  allowed: () => Element | null;
}

/** Makes the rest of `<body>` inert: no click, focus or key reaches the page. */
export const blockPage: Action<HTMLElement, TourBlocking> = (node, initial) => {
  const body = node.ownerDocument.body;
  let blocking = initial;
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
  apply();
  focusTour();

  return {
    update(next) {
      blocking = next;
      apply();
      focusTour();
    },
    destroy() {
      observer.disconnect();
      [...made].forEach(release);
    },
  };
};
