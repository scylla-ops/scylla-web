/** The name of the agent or app of the open page, for its breadcrumb. */
let name = $state<string | undefined>();

export const appCrumbName = (): string | undefined => name;

export const setAppCrumbName = (next: string | undefined): void => {
  name = next;
};
