import { describe, it, expect, vi, afterEach } from 'vitest';
import { UNGROUPED } from '../../presenters/project-sections.presenter.ts';
import { createProjectReorder } from '../project-reorder.state.svelte.ts';
import { dragCards } from './card-drag.attachments.ts';

const W = 400;
const H = 300;
const GAP = 16;
const GRID_TOP = 44;

const rect = (left: number, top: number, width: number, height: number) =>
  ({ left, top, width, height, right: left + width, bottom: top + height }) as DOMRect;

const element = (attributes: Record<string, string>, box?: DOMRect) => {
  const node = document.createElement('div');
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value);
  if (box) node.getBoundingClientRect = () => box;
  return node;
};

/** A cell of the grid, at its column: the grid places it by its offsets. */
const cell = (attributes: Record<string, string>, column: number) => {
  const node = element(attributes, rect(column * (W + GAP), GRID_TOP, W, H));
  Object.defineProperties(node, {
    offsetLeft: { value: column * (W + GAP) },
    offsetTop: { value: 0 },
    offsetWidth: { value: W },
    offsetHeight: { value: H },
  });
  return node;
};

/** « No group » with « a » and « b », in a grid of 3 columns. */
const page = () => {
  const root = element({});
  const section = element({ 'data-section': UNGROUPED }, rect(0, 0, 1232, GRID_TOP + H));
  const header = element({ 'data-part': 'project-section-header' }, rect(0, 0, 1232, 32));
  const grid = element({ 'data-part': 'project-grid' }, rect(0, GRID_TOP, 1232, H));
  grid.style.gridTemplateColumns = `${W}px ${W}px ${W}px`;
  grid.style.columnGap = `${GAP}px`;
  grid.append(cell({ 'data-card': 'a' }, 0), cell({ 'data-card': 'b' }, 1));
  section.append(header, grid);
  root.append(section);
  document.body.append(root);
  const reorder = createProjectReorder();
  const detach = dragCards(reorder, id => id.toUpperCase())(root) as () => void;
  return { reorder, grid, detach };
};

const pointer = (target: EventTarget, type: string, x: number, y: number, pointerType = 'mouse') =>
  target.dispatchEvent(
    Object.assign(new Event(type, { bubbles: true, cancelable: true }), {
      button: 0,
      isPrimary: true,
      pointerId: 1,
      pointerType,
      clientX: x,
      clientY: y,
    }),
  );

const cardB = () => document.querySelector<HTMLElement>('[data-card="b"]')!;
/** The right edge of « b », where its move icon is. */
const GRAB = { x: W + GAP + W - 10, y: GRID_TOP + 40 };

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = '';
});

describe('dragCards', () => {
  it('moves the slot before the card that the dragged card covers, wherever the pointer took it', async () => {
    const { reorder, detach } = page();
    reorder.start();

    pointer(cardB(), 'pointerdown', GRAB.x, GRAB.y);
    pointer(window, 'pointermove', GRAB.x - 2, GRAB.y);
    expect(reorder.drag).toBeNull();

    pointer(window, 'pointermove', GRAB.x - W, GRAB.y);

    expect(reorder.drag).toMatchObject({
      id: 'b',
      name: 'B',
      from: UNGROUPED,
      grab: { x: 390, y: 40 },
    });
    expect(reorder.target).toEqual({ to: UNGROUPED, beforeId: 'a', header: false });

    pointer(window, 'pointerup', GRAB.x - W, GRAB.y);

    await vi.waitFor(() => expect(reorder.drag).toBeNull());
    expect(reorder.moves).toEqual([{ id: 'b', to: UNGROUPED, beforeId: 'a' }]);
    detach();
  });

  it('settles the card on its slot before the drop', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame'] });
    const { reorder, grid, detach } = page();
    reorder.start();

    pointer(cardB(), 'pointerdown', GRAB.x, GRAB.y);
    pointer(window, 'pointermove', GRAB.x - W, GRAB.y);
    // The slot that the grid shows before « a ».
    grid.prepend(cell({ 'data-part': 'project-drop-slot' }, 0));
    pointer(window, 'pointerup', GRAB.x - W, GRAB.y);
    await vi.advanceTimersByTimeAsync(0);

    expect(reorder.motion).toBe('settle');
    expect(reorder.offset).toEqual({ x: -(W + GAP), y: 0 });
    expect(reorder.moves).toEqual([]);

    await vi.advanceTimersByTimeAsync(200);

    expect(reorder.moves).toEqual([{ id: 'b', to: UNGROUPED, beforeId: 'a' }]);
    detach();
  });

  it('sends the card back with Escape, with no drop', async () => {
    const { reorder, detach } = page();
    reorder.start();

    pointer(cardB(), 'pointerdown', GRAB.x, GRAB.y);
    pointer(window, 'pointermove', GRAB.x - W, GRAB.y);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }));

    expect(reorder.target).toEqual({ to: UNGROUPED, beforeId: undefined, header: false });
    await vi.waitFor(() => expect(reorder.drag).toBeNull());
    expect(reorder.moves).toEqual([]);
    expect(reorder.ended).toEqual({ id: 'b', name: 'B', to: null });
    detach();
  });

  it('starts no drag on a click, or out of the reorder mode', () => {
    const { reorder, detach } = page();

    pointer(cardB(), 'pointerdown', GRAB.x, GRAB.y);
    pointer(window, 'pointermove', GRAB.x - W, GRAB.y);
    pointer(window, 'pointerup', GRAB.x - W, GRAB.y);
    expect(reorder.drag).toBeNull();

    reorder.start();
    pointer(cardB(), 'pointerdown', GRAB.x, GRAB.y);
    pointer(window, 'pointerup', GRAB.x, GRAB.y);
    expect(reorder.drag).toBeNull();
    detach();
  });

  it('drags with a finger after a hold, and lets a quick move scroll the page', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame'] });
    const { reorder, detach } = page();
    reorder.start();

    pointer(cardB(), 'pointerdown', GRAB.x, GRAB.y, 'touch');
    pointer(window, 'pointermove', GRAB.x, GRAB.y + 30, 'touch');
    await vi.advanceTimersByTimeAsync(300);
    expect(reorder.drag).toBeNull();

    pointer(cardB(), 'pointerdown', GRAB.x, GRAB.y, 'touch');
    await vi.advanceTimersByTimeAsync(300);
    pointer(window, 'pointermove', GRAB.x - W, GRAB.y, 'touch');

    expect(reorder.drag?.id).toBe('b');
    expect(reorder.target?.beforeId).toBe('a');
    detach();
  });
});
