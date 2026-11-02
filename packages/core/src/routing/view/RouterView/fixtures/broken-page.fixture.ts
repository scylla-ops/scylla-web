let attempts = 0;

/** A test calls it first: the next render of `TestBrokenPage` fails, the one after shows it. */
export const breakOnce = (): void => {
  attempts = 0;
};

export const failsThisRender = (): boolean => attempts++ === 0;
