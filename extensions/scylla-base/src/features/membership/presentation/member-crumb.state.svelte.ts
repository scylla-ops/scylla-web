/** The name of the member of the page, for its breadcrumb. */
let name = $state<string | undefined>();

export const memberCrumbName = () => name;

export const setMemberCrumbName = (next: string | undefined) => {
  name = next;
};
