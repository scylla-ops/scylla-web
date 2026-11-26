import {
  chipsThatFit,
  MORE_CHIP_PX,
} from '@base/features/project/presentation/presenters/folded-preview.presenter.ts';

/**
 * Measures the line of chips of a folded section, and gives how many chips fit on it before
 * "+N". Each chip (`data-chip`) stays in the flow, so that its width is known; the ones that do
 * not fit go after "+N" (`data-more`), hidden. It measures again when the line or a chip changes
 * its size, and when a chip comes or goes.
 */
export const fitChips =
  (total: () => number, onFit: (count: number) => void) => (line: HTMLElement) => {
    const chips = () => [...line.querySelectorAll<HTMLElement>('[data-chip]')];
    const measure = () => {
      // A line with no layout (hidden, or a test page) hides no chip.
      if (!line.clientWidth) return;
      const more = line.querySelector<HTMLElement>('[data-more]');
      onFit(
        chipsThatFit({
          widths: chips().map(chip => chip.offsetWidth),
          available: line.clientWidth,
          gap: parseFloat(getComputedStyle(line).columnGap) || 0,
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
