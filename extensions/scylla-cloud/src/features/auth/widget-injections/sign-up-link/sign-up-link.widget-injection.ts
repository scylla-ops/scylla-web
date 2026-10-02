import { loginPoints } from '@scylla/base-sdk';

export const SignUpLinkWidgetInjection = [
  loginPoints.footer.inject({ component: () => import('./SignUpLink/SignUpLink.svelte') }),
];
