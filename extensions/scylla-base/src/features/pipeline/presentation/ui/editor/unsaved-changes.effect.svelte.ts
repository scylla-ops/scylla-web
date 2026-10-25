/** The browser's "leave site?" prompt, for a reload or a closed tab, while there are unsaved changes. */
export const warnBeforeUnload = (isDirty: () => boolean): void => {
  $effect(() => {
    if (!isDirty()) return;

    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Chrome still needs it to show the prompt.
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  });
};
