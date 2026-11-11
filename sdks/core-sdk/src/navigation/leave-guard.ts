/**
 * A page that asks before the user leaves it. It gets `leave`, which goes on with the
 * navigation, and returns `true` when it holds the navigation: it calls `leave` later, or never.
 */
export type LeaveGuard = (leave: () => void) => boolean;

let guard: LeaveGuard | null = null;
let leaving = false;

/** One guard at a time: the page on the screen. Returns the function that removes it. */
export const guardLeave = (next: LeaveGuard): (() => void) => {
  guard = next;
  return () => {
    if (guard === next) guard = null;
  };
};

const pass = (leave: () => void) => {
  leaving = true;
  try {
    leave();
  } finally {
    leaving = false;
  }
};

/**
 * For the router, before a navigation of the user. `true`: the guard holds it, and calls `leave`
 * to go on. A navigation that `leave` starts is not held again.
 */
export const holdsLeave = (leave: () => void): boolean =>
  !!guard && !leaving && guard(() => pass(leave));
