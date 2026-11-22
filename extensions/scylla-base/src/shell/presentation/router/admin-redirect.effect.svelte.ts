import { authorizationReady } from '@platform/authz';
import { navigateTo } from '@platform/context';
import { adminHome } from '@base/shell/presentation/admin-space.ts';

/** `/admin` → the first page of the administration that the person may open, else `/`. */
export const redirectToAdminHome = (): void => {
  let done = false;

  $effect(() => {
    if (done || !authorizationReady()) return;

    done = true;
    navigateTo(adminHome() ?? '/', { replace: true });
  });
};
