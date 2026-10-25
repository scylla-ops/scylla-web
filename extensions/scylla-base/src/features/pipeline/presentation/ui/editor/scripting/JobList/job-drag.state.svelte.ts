export interface JobDragParams {
  /** `target` is the job dropped on, or `null` for the "runs first" zone. */
  onDrop: (id: string, target: string | null, keep: boolean) => void;
}

/**
 * A job dragged in the list, onto the job it must wait for. A drop target is a job id, or `null`
 * for the "runs first" zone. Any job but the dragged one is a target: a drop on a job that waits
 * for it rearranges the dependencies (`stepsAfterDrop`).
 */
export const createJobDrag = (params: JobDragParams) => {
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

export type JobDrag = ReturnType<typeof createJobDrag>;
