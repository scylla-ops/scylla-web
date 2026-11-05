export const RAIL_OPEN_DELAY_MS = 150;
export const RAIL_CLOSE_DELAY_MS = 200;

/**
 * When the rail opens. It opens after the pointer stops on it and closes after the pointer leaves
 * it. A click closes it until the pointer leaves and comes back. Keyboard focus opens it. A touch
 * has no hover, so the logo opens it. `isHeld` keeps it open, e.g. while one of its menus is open.
 */
export class RailState {
  open = $state(false);

  #openTimer: ReturnType<typeof setTimeout> | undefined;
  #closeTimer: ReturnType<typeof setTimeout> | undefined;
  #waitsForLeave = false;
  #openedByFocus = false;
  #isHeld: () => boolean;

  constructor(isHeld: () => boolean = () => false) {
    this.#isHeld = isHeld;
  }

  pointerMoved(pointerType: string): void {
    if (pointerType === 'touch') return;
    clearTimeout(this.#closeTimer);
    if (this.open || this.#waitsForLeave) return;
    clearTimeout(this.#openTimer);
    this.#openTimer = setTimeout(() => {
      this.open = true;
    }, RAIL_OPEN_DELAY_MS);
  }

  pointerLeft(pointerType: string): void {
    if (pointerType === 'touch') return;
    this.#waitsForLeave = false;
    clearTimeout(this.#openTimer);
    this.#closeLater();
  }

  focusEntered(): void {
    clearTimeout(this.#closeTimer);
    this.#openedByFocus = !this.open;
    this.open = true;
  }

  focusLeft(): void {
    if (!this.#openedByFocus) return;
    this.#openedByFocus = false;
    this.#closeLater();
  }

  /** The user chose an item. */
  selected(): void {
    this.close();
    this.#waitsForLeave = true;
  }

  /** A touch on the logo. */
  tapped(): void {
    if (this.open) this.close();
    else this.open = true;
  }

  close(): void {
    clearTimeout(this.#openTimer);
    clearTimeout(this.#closeTimer);
    this.#openedByFocus = false;
    this.open = false;
  }

  destroy(): void {
    clearTimeout(this.#openTimer);
    clearTimeout(this.#closeTimer);
  }

  #closeLater(): void {
    clearTimeout(this.#closeTimer);
    this.#closeTimer = setTimeout(() => {
      if (this.#isHeld()) this.#closeLater();
      else this.open = false;
    }, RAIL_CLOSE_DELAY_MS);
  }
}
