/** Focuses the node each time `request` grows: for a control that a dialog removed. */
export const takeFocus = (node: HTMLElement, request: number) => {
  let last = request;
  return {
    update(next: number) {
      if (next > last) node.focus();
      last = next;
    },
  };
};
