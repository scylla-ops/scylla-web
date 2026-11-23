import type { Attachment } from 'svelte/attachments';
import { getQueryClient } from '@scylla/core-sdk';
import { prefersReducedMotion } from '@scylla/ui';

/**
 * After the sign-in, from the answer of the server:
 * - `lit`: the dots of the mark light.
 * - `cover`: the panel closes over the form (`curtain`), or a veil fades in (`fade`).
 * - `stage`: the screen is the panel, or the veil. The app loads under it. At its end, the veil
 *   fades out (`fade`).
 * - `landing`: the mark flies to the logo of the shell and the panel fades out (`curtain`).
 * - `arrived`: the logo of the shell shows again, under the mark (`curtain`).
 */
export type ArrivalPhase = 'idle' | 'lit' | 'cover' | 'stage' | 'landing' | 'arrived';

/** `fade` when the panel is not on the screen (below lg) or the motion is reduced. */
export type ArrivalMode = 'curtain' | 'fade';

/** The times of the spec frame of the Figma design, in ms. */
export const ARRIVAL_MS = {
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

const isWide = (): boolean =>
  typeof window.matchMedia === 'function' && window.matchMedia(WIDE).matches;

/** The page of the app shows: the router puts each page of a frame in a `main`. */
const pageShown = (): boolean => document.querySelector('main') !== null;

class ArrivalState {
  #phase = $state<ArrivalPhase>('idle');
  #mode = $state<ArrivalMode>('curtain');
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
    return this.phase !== 'idle' && this.phase !== 'lit';
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
    const run = this.#run;
    const curtain = !prefersReducedMotion() && isWide();
    this.#mode = curtain ? 'curtain' : 'fade';
    this.#phase = 'lit';
    const coverAt = curtain ? ARRIVAL_MS.light : ARRIVAL_MS.fade;
    const stageAt = coverAt + (curtain ? ARRIVAL_MS.curtain : ARRIVAL_MS.fade);
    this.#after(coverAt, () => (this.#phase = 'cover'));
    this.#after(stageAt, () => {
      this.#phase = 'stage';
      go();
      this.#whenReady(run, Date.now(), () => this.#land());
    });
  };

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
  };
}

/**
 * The one arrival of the app: the sign-in page starts it, the overlay of the app plays it, and the
 * logo of the shell waits for it.
 */
export const arrival = new ArrivalState();
