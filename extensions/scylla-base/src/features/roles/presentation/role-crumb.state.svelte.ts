/** The name of the role that the open page shows, for its breadcrumb. */
let name = $state<string | undefined>(undefined);

export const roleCrumbName = (): string | undefined => name;

export const setRoleCrumbName = (next: string | undefined): void => {
  name = next;
};
