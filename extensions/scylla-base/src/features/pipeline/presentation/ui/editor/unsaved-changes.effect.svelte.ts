import { guardLeave } from '@scylla/core-sdk';

/**
 * While there are unsaved changes: a reload or a closed tab shows the prompt of the browser, and a
 * navigation in the app goes to `hold`, which gets the function that goes on with it. The guard
 * reads `isDirty` again at the navigation: a save that succeeded just before it lets it go, also
 * before the effect runs again.
 */
export const warnBeforeUnload = (
  isDirty: () => boolean,
  hold?: (leave: () => void) => void,
): void => {
  $effect(() => {
    if (!isDirty()) return;

    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Chrome still needs it to show the prompt.
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', warn);
    const stop = hold
      ? guardLeave(leave => {
          if (!isDirty()) return false;
          hold(leave);
          return true;
        })
      : undefined;
    return () => {
      stop?.();
      window.removeEventListener('beforeunload', warn);
    };
  });
};
