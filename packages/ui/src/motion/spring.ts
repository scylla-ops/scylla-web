/** The part of the move that is left when the spring counts as settled. */
const REST = 0.001;

export interface SpringOptions {
  /** 0 < bounce < 1. 0.2 goes a little past the end and comes back. */
  bounce: number;
  /** In milliseconds: the time to settle. */
  duration: number;
}

/**
 * A spring that starts at rest, as an easing: the time 0 → 1 of `duration` gives the position
 * 0 → 1, a little above 1 when it bounces. The parameters are those of the design tools: the
 * damping ratio is `1 - bounce`, and the frequency is the one that settles in `duration`.
 */
export const springEasing = ({ bounce, duration }: SpringOptions): ((t: number) => number) => {
  const damping = 1 - bounce;
  const seconds = duration / 1000;
  const ratio = Math.sqrt(1 - damping ** 2);
  const frequency = Math.log(damping / (ratio * REST)) / (damping * seconds);
  const decay = damping * frequency;
  const angular = frequency * ratio;
  return t => {
    if (t >= 1) return 1;
    const time = t * seconds;
    return (
      1 -
      Math.exp(-decay * time) *
        (Math.cos(angular * time) + (decay / angular) * Math.sin(angular * time))
    );
  };
};
