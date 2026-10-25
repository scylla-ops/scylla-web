export interface StepDragParams {
  /** `target` is the step dropped on, or `null` for the "runs first" zone. */
  onDrop: (id: string, target: string | null, keep: boolean) => void;
}

/**
 * A step dragged in the list, onto the step it must wait for. A drop target is a step id, or `null`
 * for the "runs first" zone. Any step but the dragged one is a target: a drop on a step that waits
 * for it rearranges the dependencies (`stepsAfterDrop`).
 */
export const createStepDrag = (params: StepDragParams) => {
  let dragged = $state<string | null>(null);
  // `undefined`: the pointer is over no target. `null` is a target: the "runs first" zone.
  let hovered = $state<string | null | undefined>(undefined);

  const end = () => {
    dragged = null;
    hovered = undefined;
  };

  return {
    get dragged() {
      return dragged;
    },
    canDrop: (target: string | null) => dragged !== null && target !== dragged,
    isOver: (target: string | null) => dragged !== null && hovered === target,

    start(id: string) {
      dragged = id;
    },
    hover(target: string | null) {
      hovered = target;
    },
    leave(target: string | null) {
      if (hovered === target) hovered = undefined;
    },
    drop(target: string | null, keep: boolean) {
      const id = dragged;
      end();
      if (id !== null) params.onDrop(id, target, keep);
    },
    end,
  };
};

export type StepDrag = ReturnType<typeof createStepDrag>;
