import { guardLeave } from '@scylla/core-sdk';

/**
 * While `active`: a navigation in the app goes to `hold`, which gets the function that goes on
 * with it, and a reload or a closed tab shows the prompt of the browser, which has no choices.
 */
export const holdLeave = (active: () => boolean, hold: (leave: () => void) => void): void => {
  $effect(() => {
    if (!active()) return;

    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Chrome still needs it to show the prompt.
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    const stop = guardLeave(leave => {
      hold(leave);
      return true;
    });

    return () => {
      stop();
      window.removeEventListener('beforeunload', warn);
    };
  });
};
