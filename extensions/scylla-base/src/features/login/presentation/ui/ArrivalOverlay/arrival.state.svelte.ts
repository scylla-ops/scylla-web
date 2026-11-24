import type { Attachment } from 'svelte/attachments';
import { getQueryClient } from '@scylla/core-sdk';
import { prefersReducedMotion } from '@scylla/ui';

/**
 * After the sign-in, from the answer of the server:
 * - `back`: after a sign-in with a provider, the app starts under the panel of the sign-in page,
 *   with the dots of its mark idle.
 * - `lit`: the dots of the mark light.
 * - `cover`: the panel closes over the form (`curtain`), or a veil fades in (`fade`).
 * - `stage`: the screen is the panel, or the veil. The app loads under it. At its end, the veil
 *   fades out (`fade`).
 * - `landing`: the mark flies to the logo of the shell and the panel fades out (`curtain`).
 * - `arrived`: the logo of the shell shows again, under the mark (`curtain`).
 */
export type ArrivalPhase = 'idle' | 'back' | 'lit' | 'cover' | 'stage' | 'landing' | 'arrived';

/** `fade` when the panel is not on the screen (below lg) or the motion is reduced. */
export type ArrivalMode = 'curtain' | 'fade';

/** The times of the spec frame of the Figma design, in ms. */
export const ARRIVAL_MS = {
  back: 200,
  light: 450,
  curtain: 550,
  stageMin: 150,
  waitMax: 3000,
  landing: 600,
  wordmark: 300,
  fade: 200,
} as const;

/** The queries must stay idle this long: a page can start a query after the first ones end. */
export const QUIET_MS = 100;
const POLL_MS = 50;
const WIDE = '(min-width: 64rem)';

/** The tab keeps it from the click on a provider to the return of the provider. */
const MARKER_KEY = 'scylla.sign-in-arrival';
/** The server forgets a sign-in with a provider after 10 minutes (`FLOW_TTL`). */
export const MARKER_MAX_MS = 10 * 60 * 1000;

const isWide = (): boolean =>
  typeof window.matchMedia === 'function' && window.matchMedia(WIDE).matches;

/** The page of the app shows: the router puts each page of a frame in a `main`. */
const pageShown = (): boolean => document.querySelector('main') !== null;

const writeMarker = (returnPath: string): void => {
  try {
    sessionStorage.setItem(MARKER_KEY, JSON.stringify({ at: Date.now(), to: returnPath }));
  } catch {
    // With no storage, the app opens with no motion.
  }
};

/**
 * Removes the marker, and tells if the provider sent the tab back to its return path in time. A
 * failed sign-in goes to `/sign-in-error`, and the back button to `/login`.
 */
const takeMarker = (): boolean => {
  try {
    const marker: unknown = JSON.parse(sessionStorage.getItem(MARKER_KEY) ?? 'null');
    sessionStorage.removeItem(MARKER_KEY);
    if (typeof marker !== 'object' || marker === null) return false;
    if (!('at' in marker) || typeof marker.at !== 'number') return false;
    if (!('to' in marker) || typeof marker.to !== 'string') return false;
    const age = Date.now() - marker.at;
    const path = new URL(marker.to, window.location.origin).pathname;
    return age >= 0 && age <= MARKER_MAX_MS && path === window.location.pathname;
  } catch {
    return false;
  }
};

class ArrivalState {
  #phase = $state<ArrivalPhase>('idle');
  #mode = $state<ArrivalMode>('curtain');
  #fromProvider = $state(false);
  #leaving = $state(false);
  #run = 0;
  #timers = new Set<ReturnType<typeof setTimeout>>();
  #targets = new Set<Element>();

  get phase(): ArrivalPhase {
    return this.#phase;
  }

  get mode(): ArrivalMode {
    return this.#mode;
  }

  /** The overlay is on the screen. */
  get covers(): boolean {
    return this.phase !== 'idle' && this.phase !== 'back' && this.phase !== 'lit';
  }

  /**
   * After a sign-in with a provider, the panel of the sign-in page hides the app until the curtain
   * covers it.
   */
  get hidesApp(): boolean {
    return (
      this.#fromProvider &&
      (this.phase === 'back' || this.phase === 'lit' || this.phase === 'cover')
    );
  }

  /** The tab leaves for an identity provider: the dots of the mark wait. */
  get leaving(): boolean {
    return this.#leaving;
  }

  /** The form fades and drifts under the curtain. */
  get formLeaves(): boolean {
    return this.mode === 'curtain' && (this.phase === 'cover' || this.phase === 'stage');
  }

  /** The logo of the shell waits for the mark that flies to it. */
  get hidesBrand(): boolean {
    return (
      this.mode === 'curtain' &&
      (this.phase === 'cover' || this.phase === 'stage' || this.phase === 'landing')
    );
  }

  /** The logo of the shell that shows (light or dark), where the mark lands. */
  get targetBox(): DOMRect | null {
    for (const element of this.#targets) {
      const box = element.getBoundingClientRect();
      if (box.width > 0 && box.height > 0) return box;
    }
    return null;
  }

  /** On the `logo_lockup.svg` images of the shell: the mark lands on the mark of the lockup. */
  target: Attachment = element => {
    this.#targets.add(element);
    return () => {
      this.#targets.delete(element);
    };
  };

  /**
   * The server accepted the credentials. `go` opens the app: the arrival calls it when the
   * panel covers the screen, then holds the stage until the page of the app shows and its
   * queries end (3 s at most), and lands.
   */
  begin = (go: () => void): void => {
    this.#stop();
    this.#fromProvider = false;
    this.#mode = !prefersReducedMotion() && isWide() ? 'curtain' : 'fade';
    this.#light(this.#run, go);
  };

  /**
   * A click on the link to an identity provider: the dots wait until the tab leaves, and the marker
   * starts the arrival when the provider sends the tab back to `returnPath`. A click that opens
   * another tab changes nothing.
   */
  leave = (event: MouseEvent, returnPath: string): void => {
    if (event.button !== 0 || event.defaultPrevented) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    writeMarker(returnPath);
    this.#leaving = true;
  };

  /** On `pageshow`: the back button can show the sign-in page as it was at the click. */
  pageShown = (event: PageTransitionEvent): void => {
    if (!event.persisted) return;
    takeMarker();
    this.#leaving = false;
  };

  /**
   * At the start of the app, after a sign-in with a provider: the app opens under the panel of the
   * sign-in page, and the arrival plays as after a sign-in with the form. Below lg, or with reduced
   * motion, the veil covers the app at once.
   */
  comeBack = (): void => {
    if (!takeMarker()) return;
    this.#stop();
    const run = this.#run;
    this.#fromProvider = true;
    if (prefersReducedMotion() || !isWide()) {
      this.#mode = 'fade';
      this.#stage(run, () => undefined);
      return;
    }
    this.#mode = 'curtain';
    this.#phase = 'back';
    this.#after(ARRIVAL_MS.back, () => this.#light(run, () => undefined));
  };

  #light(run: number, go: () => void): void {
    const curtain = this.mode === 'curtain';
    this.#phase = 'lit';
    const coverAt = curtain ? ARRIVAL_MS.light : ARRIVAL_MS.fade;
    const stageAt = coverAt + (curtain ? ARRIVAL_MS.curtain : ARRIVAL_MS.fade);
    this.#after(coverAt, () => (this.#phase = 'cover'));
    this.#after(stageAt, () => this.#stage(run, go));
  }

  #stage(run: number, go: () => void): void {
    this.#phase = 'stage';
    go();
    this.#whenReady(run, Date.now(), () => this.#land());
  }

  #land(): void {
    if (this.mode === 'fade') {
      this.#phase = 'idle';
      return;
    }
    this.#phase = 'landing';
    this.#after(ARRIVAL_MS.landing, () => {
      this.#phase = 'arrived';
      this.#after(ARRIVAL_MS.wordmark, () => (this.#phase = 'idle'));
    });
  }

  #whenReady(run: number, since: number, ready: () => void): void {
    let quiet = 0;
    const poll = () => {
      if (run !== this.#run) return;
      const waited = Date.now() - since;
      quiet = pageShown() && getQueryClient().isFetching() === 0 ? quiet + POLL_MS : 0;
      if ((quiet >= QUIET_MS && waited >= ARRIVAL_MS.stageMin) || waited >= ARRIVAL_MS.waitMax) {
        ready();
      } else {
        this.#after(POLL_MS, poll);
      }
    };
    this.#after(POLL_MS, poll);
  }

  #after(ms: number, run: () => void): void {
    const timer = setTimeout(() => {
      this.#timers.delete(timer);
      run();
    }, ms);
    this.#timers.add(timer);
  }

  #stop(): void {
    this.#run += 1;
    this.#timers.forEach(clearTimeout);
    this.#timers.clear();
  }

  /** Back to the start, with no motion. */
  reset = (): void => {
    this.#stop();
    this.#phase = 'idle';
    this.#fromProvider = false;
    this.#leaving = false;
  };
}

/**
 * The one arrival of the app: the sign-in page starts it (or the return of an identity provider),
 * the overlay of the app plays it, and the logo of the shell waits for it.
 */
export const arrival = new ArrivalState();
