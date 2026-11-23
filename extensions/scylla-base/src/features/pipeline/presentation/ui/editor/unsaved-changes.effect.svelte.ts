import { guardLeave } from '@scylla/core-sdk';

/**
 * While there are unsaved changes: a reload or a closed tab shows the prompt of the browser, and a
 * navigation in the app goes to `hold`, which gets the function that goes on with it.
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
