<script lang="ts">
  import { workspaceUrl } from '@platform/context';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import LogoScylla from '@scylla/ui/assets/logo_lockup.svg';
  import LogoScyllaDark from '@scylla/ui/assets/logo_lockup_dark.svg';
  import { arrival } from '@base/features/login';
  import { layoutMessages } from '@base/shell/presentation/layout/messages/layout.messages.ts';
  import { linkParams } from '@base/shell/presentation/shell-params.ts';

  const slug = $derived(linkParams().workspaceSlug);
</script>

<!-- With no active workspace, `/` picks the workspace of the user. -->
<!-- After a sign-in, the logo waits for the mark that flies to it, then the wordmark fades in. -->
<a
  href={slug ? workspaceUrl(slug, 'dashboard') : '/'}
  aria-label={t(layoutMessages.openDashboard)}
  class={cn(
    'rounded-lg outline-hidden transition-opacity duration-300 ease-out focus-visible:ring-2 focus-visible:ring-sidebar-ring',
    arrival.hidesBrand && 'opacity-0',
  )}
>
  <img {@attach arrival.target} src={LogoScylla} alt="Scylla" class="h-9 w-auto dark:hidden" />
  <img
    {@attach arrival.target}
    src={LogoScyllaDark}
    alt="Scylla"
    class="hidden h-9 w-auto dark:block"
  />
</a>
