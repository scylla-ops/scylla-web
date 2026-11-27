import { tick } from 'svelte';
import { expect } from 'vitest';

/**
 * `expectNoLayoutShift`: a click must not move the parts that it is not about (the rule "the UI
 * stays still on a click", `packages/ui/AGENTS.md`, "Layout shifts").
 *
 * jsdom has no layout: each rect is 0. Thus this helper reads what moves a part in a browser, from
 * the DOM. A watched element keeps its place when:
 *
 * - it stays the same node (the action did not replace it);
 * - its own content keeps its texts and its size classes;
 * - its ancestors (up to `within`) keep their size and spacing classes;
 * - the parts that come before it in the flow (`align: 'start'`, a column or a row aligned to the
 *   left) or after it (`align: 'end'`, a row aligned to the right) do not come, go, change their
 *   text or change their size classes.
 *
 * Out of the flow: an element that is `absolute`, `fixed`, `sr-only` or `hidden`, and all its
 * content. An `invisible` element keeps its space, thus it counts. An `svg` counts as one box (an
 * icon that takes the place of another of the same size does not move anything), and so does a
 * `StableLabel` (`data-slot="stable-label"`): its box has the size of its longest text, whichever
 * shows. An `out:` transition ends at once during the action (reduced motion): the helper compares
 * the end state.
 *
 * It does not see a size that comes from a style sheet or from the content of an image, nor a
 * motion in several steps: check those in a browser, with the positions of each animation frame.
 */
export interface LayoutShiftOptions {
  /** The region of the page that holds the watched elements. The rendered container by default. */
  within?: Element;
  /** `end`: a row aligned to the right, where only the parts after an element push it. */
  align?: 'start' | 'end';
  /**
   * False: the content of a watched element may change, because it is what the click is about
   * (the widgets of a dashboard in the edit mode). Its place still counts.
   */
  checkContent?: boolean;
}

interface Box {
  self: string[];
  ancestors: string[];
  around: string[];
}

const OUT_OF_FLOW = new Set(['absolute', 'fixed', 'sr-only', 'hidden']);

/** The utilities of Tailwind that change a size, a spacing, a display or a position. */
const LAYOUT_UTILITY =
  /^-?(?:[mp][trblxyse]?|w|h|size|min-w|min-h|max-w|max-h|basis|gap|gap-x|gap-y|space-x|space-y|inset|inset-x|inset-y|top|bottom|left|right|start|end|col|col-span|col-start|row|row-span|row-start|grid-cols|grid-rows|order|leading|tracking|line-clamp|aspect|flex|items|justify|self|place|content|grow|shrink|whitespace|break)-|^text-(?:xs|sm|base|lg|xl|\dxl|\[)|^border(?:-[trblxy])?(?:-\d+)?$|^(?:block|inline|inline-block|inline-flex|inline-grid|flex|grid|contents|table|relative|sticky|static|grow|shrink|truncate)$/;

/** The declarations of a `style` attribute that do not change the place of anything. */
const PAINT_ONLY = /^(?:transform|translate|scale|rotate|opacity|color|background|transition|animation|will-change|filter|box-shadow|outline|cursor)/;

const utilityOf = (token: string): string => token.slice(token.lastIndexOf(':') + 1);

const isOutOfFlow = (element: Element): boolean =>
  element.hasAttribute('hidden') || [...element.classList].some(token => OUT_OF_FLOW.has(token));

const styleOf = (element: Element): string =>
  (element.getAttribute('style') ?? '')
    .split(';')
    .map(declaration => declaration.trim())
    .filter(declaration => declaration !== '' && !PAINT_ONLY.test(declaration))
    .sort()
    .join(';');

const boxOf = (element: Element): string => {
  const classes = [...element.classList]
    .filter(token => LAYOUT_UTILITY.test(utilityOf(token)))
    .sort()
    .join(' ');
  const slot = element.getAttribute('data-slot');
  return `${element.tagName.toLowerCase()}${slot ? `(${slot})` : ''}[${classes}]{${styleOf(element)}}`;
};

const ownText = (element: Element): string =>
  [...element.childNodes]
    .filter(node => node.nodeType === Node.TEXT_NODE)
    .map(node => node.textContent?.trim() ?? '')
    .filter(text => text !== '')
    .join(' ');

const textsOf = (element: Element): string[] => {
  const texts = new Set<string>();
  for (const node of element.querySelectorAll('*')) {
    const text = ownText(node);
    if (text !== '') texts.add(text);
  }
  return [...texts].sort();
};

/** An element that counts as one box: its content does not move what is around it. */
const atomOf = (element: Element): string | null => {
  if (element.tagName.toLowerCase() === 'svg') return boxOf(element);
  if (element.getAttribute('data-slot') === 'stable-label') {
    return `${boxOf(element)}<${textsOf(element).join('|')}>`;
  }
  return null;
};

/**
 * The boxes in the flow of `root` and below it, in the order of the document. The root itself
 * counts even when it is out of the flow: a dialog is `fixed`, and its content has a flow.
 */
const flowOf = (root: Element, depth = 0): Array<{ element: Element; key: string }> => {
  if (depth > 0 && isOutOfFlow(root)) return [];
  const atom = atomOf(root);
  if (atom !== null) return [{ element: root, key: `${depth}:${atom}` }];
  const entries = [{ element: root, key: `${depth}:${boxOf(root)}"${ownText(root)}"` }];
  for (const child of root.children) entries.push(...flowOf(child, depth + 1));
  return entries;
};

const measure = (element: Element, within: Element, align: 'start' | 'end'): Box => {
  const ancestors: string[] = [];
  for (let node = element.parentElement; node; node = node.parentElement) {
    ancestors.push(boxOf(node));
    if (node === within) break;
  }
  const around = flowOf(within)
    .filter(({ element: other }) => {
      if (other === element || other.contains(element) || element.contains(other)) return false;
      const position = element.compareDocumentPosition(other);
      return align === 'start'
        ? (position & Node.DOCUMENT_POSITION_PRECEDING) !== 0
        : (position & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
    })
    .map(({ key }) => key);
  return { self: flowOf(element).map(({ key }) => key), ancestors, around };
};

/** Runs `action` with reduced motion: each preset of `packages/ui/src/motion` takes 0 ms. */
const withReducedMotion = async (action: () => unknown): Promise<void> => {
  // The stub of `setup.ts` (or of the test) goes back in place after the action.
  const restore: Window['matchMedia'] = Reflect.get(window, 'matchMedia');
  const matchMedia = restore.bind(window);
  window.matchMedia = (query: string) =>
    query === '(prefers-reduced-motion: reduce)'
      ? { ...matchMedia(query), matches: true }
      : matchMedia(query);
  try {
    await action();
    await tick();
  } finally {
    window.matchMedia = restore;
  }
};

/**
 * Fails when `action` moves one of `elements`: see the comment at the top of this file.
 *
 * ```ts
 * await expectNoLayoutShift(() => rerender({ isPending: true }), cancelButton, { align: 'end' });
 * ```
 */
export const expectNoLayoutShift = async (
  action: () => unknown,
  elements: Element | readonly Element[],
  { within = document.body, align = 'start', checkContent = true }: LayoutShiftOptions = {},
): Promise<void> => {
  const watched = Array.isArray(elements) ? elements : [elements as Element];
  const before = watched.map(element => measure(element, within, align));

  await withReducedMotion(action);

  watched.forEach((element, index) => {
    const name = boxOf(element);
    expect(element.isConnected, `${name} was replaced by another element`).toBe(true);
    const after = measure(element, within, align);
    if (checkContent) {
      expect(after.self, `the content of ${name} changed its size`).toEqual(before[index].self);
    }
    expect(after.ancestors, `a parent of ${name} changed its size`).toEqual(
      before[index].ancestors,
    );
    expect(after.around, `a part ${align === 'start' ? 'before' : 'after'} ${name} moved it`).toEqual(
      before[index].around,
    );
  });
};
