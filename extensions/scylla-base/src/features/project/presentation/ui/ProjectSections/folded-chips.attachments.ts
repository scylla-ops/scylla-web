import {
  chipsThatFit,
  MORE_CHIP_PX,
} from '@base/features/project/presentation/presenters/folded-preview.presenter.ts';

/**
 * Measures the line of chips of a folded section, and gives how many chips fit on it before
 * "+N". Each chip (`data-chip`) stays in the flow, so that its width is known; the ones that do
 * not fit go after "+N" (`data-more`), hidden. The slot of a drag keeps its room at the end. It
 * measures again when the line or a chip changes its size, and when a chip or the slot comes or
 * goes.
 */
export const fitChips =
  (total: () => number, onFit: (count: number) => void) => (line: HTMLElement) => {
    const chips = () => [...line.querySelectorAll<HTMLElement>('[data-chip]')];
    const measure = () => {
      // A line with no layout (hidden, or a test page) hides no chip.
      if (!line.clientWidth) return;
      const more = line.querySelector<HTMLElement>('[data-more]');
      const gap = parseFloat(getComputedStyle(line).columnGap) || 0;
      // The slot of a drag keeps its room at the end of the line.
      const slot = line.querySelector<HTMLElement>('[data-part="folded-drop-slot"]');
      onFit(
        chipsThatFit({
          widths: chips().map(chip => chip.offsetWidth),
          available: line.clientWidth - (slot ? slot.offsetWidth + gap : 0),
          gap,
          more: more?.offsetWidth || MORE_CHIP_PX,
          total: total(),
        }),
      );
    };
    const sizes = new ResizeObserver(measure);
    const observe = () => {
      sizes.disconnect();
      sizes.observe(line);
      chips().forEach(chip => sizes.observe(chip));
    };
    const children = new MutationObserver(() => {
      observe();
      measure();
    });
    observe();
    measure();
    children.observe(line, { childList: true });
    return () => {
      sizes.disconnect();
      children.disconnect();
    };
  };
