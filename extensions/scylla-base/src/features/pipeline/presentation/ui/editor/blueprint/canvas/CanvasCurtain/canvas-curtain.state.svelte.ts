import { prefersReducedMotion } from '@scylla/ui';

/** In ms. */
export const CURTAIN_TIMES = {
  /** A canvas that is ready sooner never shows the logo: a logo that flashes reads as a glitch. */
  delay: 300,
  /** Once shown, the logo stays at least this long. */
  minimum: 400,
  slow: 4000,
  exit: 120,
} as const;

/** `waiting`: the dots of the canvas only. `loading`: the logo. `leaving`: the logo fades out. */
export type CurtainPhase = 'waiting' | 'loading' | 'leaving' | 'revealed';

export interface CanvasCurtainParams {
  /** The pipeline is loaded and the graph is fitted in its final canvas. */
  ready: () => boolean;
  failed: () => boolean;
  reducedMotion?: () => boolean;
}

/** What covers the blueprint until its graph is fitted, so that the user never sees the view move. */
export const createCanvasCurtain = ({
  ready,
  failed,
  reducedMotion = prefersReducedMotion,
}: CanvasCurtainParams) => {
  let phase = $state<CurtainPhase>('waiting');
  let slow = $state(false);
  /** The logo has not been on screen for its minimum time yet. */
  let held = $state(false);

  // Each load starts the times again: the first one, and a retry after an error.
  $effect(() => {
    if (failed()) return;
    phase = 'waiting';
    slow = false;
    held = false;
    const timers = [
      setTimeout(() => {
        if (phase !== 'waiting') return;
        phase = 'loading';
        held = true;
        timers.push(setTimeout(() => (held = false), CURTAIN_TIMES.minimum));
      }, CURTAIN_TIMES.delay),
      setTimeout(() => (slow = true), CURTAIN_TIMES.slow),
    ];
    return () => timers.forEach(clearTimeout);
  });

  $effect(() => {
    if (failed() || !ready()) return;
    if (phase === 'waiting') phase = 'revealed';
    else if (phase === 'loading' && !held) phase = reducedMotion() ? 'revealed' : 'leaving';
  });

  $effect(() => {
    if (phase !== 'leaving') return;
    const timer = setTimeout(() => (phase = 'revealed'), CURTAIN_TIMES.exit);
    return () => clearTimeout(timer);
  });

  return {
    get phase() {
      return phase;
    },
    get slow() {
      return slow;
    },
    get failed() {
      return failed();
    },
    get revealed() {
      return phase === 'revealed';
    },
  };
};

export type CanvasCurtain = ReturnType<typeof createCanvasCurtain>;
