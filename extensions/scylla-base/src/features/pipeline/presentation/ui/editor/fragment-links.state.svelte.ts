import type { FragmentLink } from '@base/features/pipeline/domain/entities/fragment.entity.ts';

export interface FragmentLinksParams {
  /** The saved links. `undefined` while they load. */
  initial: () => FragmentLink[] | undefined;
}

/**
 * The fragments that the edited pipeline links. They go with the document: a change makes the
 * editor dirty, and a save sends them with the nodes.
 */
export const createFragmentLinks = (params: FragmentLinksParams) => {
  let links = $state<FragmentLink[]>([]);
  let baseline = $state('[]');

  // Like the script: the saved links arrive after the first render, and again after each save.
  $effect(() => {
    const initial = params.initial();
    if (initial === undefined) return;

    links = initial;
    baseline = JSON.stringify(initial);
  });

  const isDirty = $derived(JSON.stringify(links) !== baseline);

  return {
    get current() {
      return links;
    },
    get isDirty() {
      return isDirty;
    },

    set(next: FragmentLink[]) {
      links = next;
    },
  };
};
