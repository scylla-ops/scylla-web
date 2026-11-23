export const CENTERED_DIALOG_CLASS =
  'fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%] duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95';

/**
 * For the overlay and the content of a modal. bits-ui keeps them, with an inline
 * `pointer-events: auto`, until their exit animation ends: a click in that time would be lost.
 */
export const CLOSING_LAYER_CLASS = 'data-[state=closed]:pointer-events-none!';
