/** Counts the requests to open the command bar from outside the top bar (the notes of a release). */
let requests = $state(0);

export const requestCommandBar = (): void => {
  requests += 1;
};

/** Reactive. */
export const commandBarRequests = (): number => requests;
