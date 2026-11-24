/** The name of the fragment of the open page, for its breadcrumb. */
let name = $state<string | undefined>();

export const fragmentCrumbName = (): string | undefined => name;

export const setFragmentCrumbName = (next: string | undefined): void => {
  name = next;
};
