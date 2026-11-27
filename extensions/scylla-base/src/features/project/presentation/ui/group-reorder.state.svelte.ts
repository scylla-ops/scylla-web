import { createDragGhost, type Box } from '@scylla/ui/dnd';
import { placeBefore } from '@base/features/project/domain/structs/project-layout.struct.ts';
import {
  moveGroupTo,
  stepGroup,
  type GroupTarget,
} from '../presenters/project-sections.presenter.ts';

/** The group that moves. A pointer drag lifts a copy of its header; the keyboard moves it in place. */
interface GroupDrag {
  id: string;
  name: string;
  keyboard: boolean;
  /** The box of the header when the person took it. */
  box: Box;
}

/** The end of the last drag, for the live region. */
interface GroupDragEnd {
  id: string;
  name: string;
  dropped: boolean;
}

const NOWHERE: Box = { left: 0, top: 0, width: 0, height: 0 };

/**
 * The order of the groups in the reorder mode. It stays on the page until « Done » saves it;
 * « Cancel » forgets it. The pins stay first and « No group » last: they are not in the order.
 *
 * A pointer drag: `pick` takes the header, and `ghost` lifts its copy; `hover` moves the line
 * between two groups; `drop` puts the group there (or keeps it) while the copy flies to the
 * header, then `finish` ends the drag. `cancel` sends the line back to the place of the group. The
 * groups stay in their place until the drop. The keyboard: `lift`, `step` up or down, then `place`
 * or `restore`.
 */
export const createGroupReorder = () => {
  let order = $state<string[] | null>(null);
  let drag = $state<GroupDrag | null>(null);
  let settling = $state(false);
  let target = $state<GroupTarget | null>(null);
  let stepped = $state(false);
  let ended = $state<GroupDragEnd | null>(null);
  let origin: GroupTarget | null = null;
  // The order at the lift: Escape gives it back.
  let lifted: string[] = [];
  const ghost = createDragGhost();

  const end = (dropped: boolean) => {
    if (drag) ended = { id: drag.id, name: drag.name, dropped };
    drag = null;
    target = null;
    origin = null;
    settling = false;
    stepped = false;
  };

  return {
    get active() {
      return order !== null;
    },
    /** The ids of the groups in their order; `null` out of the mode. */
    get order(): readonly string[] | null {
      return order;
    },
    get drag(): Readonly<GroupDrag> | null {
      return drag;
    },
    /** The copy of the header of a pointer drag: it follows the pointer, then flies to the header. */
    get ghost() {
      return ghost;
    },
    /** The place of a pointer drag: the line between two groups. */
    get target(): Readonly<GroupTarget> | null {
      return target;
    },
    /** A pointer drag has a new place for the group: the line shows. */
    get moved() {
      return (
        !!drag && !drag.keyboard && !settling && !!target && target.beforeId !== origin?.beforeId
      );
    },
    /** The copy flies to the header after the drop. */
    get settling() {
      return settling;
    },
    /** A keyboard drag moved the group at least once. */
    get stepped() {
      return stepped;
    },
    get ended(): Readonly<GroupDragEnd> | null {
      return ended;
    },
    start(ids: readonly string[]) {
      order = [...ids];
      ended = null;
    },
    stop() {
      ghost.end();
      end(false);
      order = null;
      ended = null;
    },
    /** `nextId`: the group after it, its own place: the line shows once the place changes. */
    pick(group: { id: string; name: string; box: Box }, nextId?: string) {
      if (!order || drag) return;
      drag = { ...group, keyboard: false };
      settling = false;
      origin = { beforeId: nextId };
      target = origin;
      ended = null;
    },
    hover(next: GroupTarget) {
      if (!drag || drag.keyboard || settling) return;
      if (target?.beforeId !== next.beforeId) target = { beforeId: next.beforeId };
    },
    /** The place goes back to the place of the group before the drag. */
    cancel() {
      if (drag && !settling) target = origin;
    },
    /**
     * The release: the group goes to the line, when the line is at a new place. The copy then flies
     * to the header; `finish` ends the drag. Gives whether the group moved.
     */
    drop(): boolean {
      if (!drag || drag.keyboard || !order) return false;
      const moved = !settling && !!target && target.beforeId !== origin?.beforeId;
      if (moved) order = placeBefore(order, drag.id, target?.beforeId);
      settling = true;
      target = null;
      return moved;
    },
    /** The copy is on the header: the drag ends. */
    finish(dropped: boolean) {
      end(dropped);
    },
    /** Space on the handle of a group: the arrow keys then move it. */
    lift(id: string, name: string) {
      if (!order || drag) return;
      drag = { id, name, keyboard: true, box: NOWHERE };
      lifted = [...order];
      stepped = false;
      ended = null;
    },
    step(delta: -1 | 1) {
      if (!drag?.keyboard || !order) return;
      order = stepGroup(order, drag.id, delta);
      stepped = true;
    },
    /** Space again: the group stays at its new place. */
    place() {
      if (drag?.keyboard) end(true);
    },
    /** Escape: the group goes back to its place before the lift. */
    restore() {
      if (!drag?.keyboard) return;
      order = lifted;
      end(false);
    },
    /** « Move up » and « Move down » of the menu of a group, in the mode. */
    moveTo(id: string, position: number) {
      if (order && !drag) order = moveGroupTo(order, id, position);
    },
  };
};

export type GroupReorderState = ReturnType<typeof createGroupReorder>;
