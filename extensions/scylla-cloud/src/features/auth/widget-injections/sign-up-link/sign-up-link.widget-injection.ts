import { loginPoints } from '@scylla/base-sdk';
import type { WidgetInjection } from '@scylla/core-sdk';

export const SignUpLinkWidgetInjection = {
  id: 'cloud-sign-up-link',
  changes: [
    loginPoints.footer.inject({ component: () => import('./SignUpLink/SignUpLink.svelte') }),
  ],
} satisfies WidgetInjection;
