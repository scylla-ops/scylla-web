import type { Action } from 'svelte/action';
import type { OnboardingSubject } from '../domain/structs/onboarding-status.struct.ts';
import { unionRect, type TourRect } from './tour-placement.calculator.ts';
import type { TourAnchor, TourCondition, TourSpotStep } from './tour-steps.ts';

export const LOST_AFTER_MS = 4000;

export interface TourTracking {
  step: TourSpotStep;
  subject: OnboardingSubject;
  onLayout: (rects: readonly (TourRect | null)[]) => void;
  onAdvance: () => void;
  onUnlock: () => void;
  onLost: () => void;
}

const measure = (element: Element): TourRect | null => {
  const box = element.getBoundingClientRect();
  if (box.width > 0 || box.height > 0) {
    return { x: box.x, y: box.y, width: box.width, height: box.height };
  }
  return unionRect([...element.children].map(child => child.getBoundingClientRect()));
};

const layoutKey = (rects: readonly (TourRect | null)[]) =>
  rects
    .map(rect =>
      rect
        ? `${Math.round(rect.x)},${Math.round(rect.y)},${Math.round(rect.width)},${Math.round(rect.height)}`
        : '-',
    )
    .join(';');

const isOnScreen = (rect: TourRect) =>
  rect.y >= 0 &&
  rect.x >= 0 &&
  rect.y + rect.height <= window.innerHeight &&
  rect.x + rect.width <= window.innerWidth;

export const trackTourStep: Action<HTMLElement, TourTracking> = (node, initial) => {
  const document = node.ownerDocument;
  let tracking = initial;
  let frame = 0;
  let lastLayout = '';
  let missingSince: number | null = null;
  let lost = false;
  let scrolled = false;
  let advanced = false;
  let unlocked = false;

  const resolve = (anchor: TourAnchor) => anchor(document, tracking.subject);

  const reset = () => {
    lastLayout = '';
    missingSince = null;
    lost = false;
    scrolled = false;
    advanced = false;
    unlocked = false;
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

  const tick = (now: number) => {
    const elements = tracking.step.targets.map(resolve);
    const rects = elements.map(element => (element ? measure(element) : null));

    const layout = layoutKey(rects);
    if (layout !== lastLayout) {
      lastLayout = layout;
      tracking.onLayout(rects);
    }

    const [first] = elements;
    const [firstRect] = rects;
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

    const { advance: next, nextWhen } = tracking.step;
    if (next.on === 'appear' && appeared(next)) advance();
    if (appeared(nextWhen)) unlock();

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
