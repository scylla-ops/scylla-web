let renders = 0;
let loads = 0;

/** A test calls it first: the next render of `TestBrokenPage` fails, the one after shows it. */
export const breakOnce = (): void => {
  renders = 0;
};

export const failsThisRender = (): boolean => renders++ === 0;

/** A test calls it first: the next load of the stale page rejects, the one after resolves. */
export const breakLoadOnce = (): void => {
  loads = 0;
};

export const failsThisLoad = (): boolean => loads++ === 0;
