import type { ConsentSource } from '../../domain/structs/consent-choice.struct.ts';

let openFrom = $state<ConsentSource | null>(null);

/**
 * The one dialog of the cookie settings. The overlay of the consent shows it; the banner, the
 * footer, the user menu and the account page open it. Global: these parts are in other modules.
 */
export const cookieSettings = {
  /** Where the person opened the dialog, or `null` while it is closed. */
  get openFrom(): ConsentSource | null {
    return openFrom;
  },
  open(source: ConsentSource = 'preferences'): void {
    openFrom = source;
  },
  close(): void {
    openFrom = null;
  },
};
