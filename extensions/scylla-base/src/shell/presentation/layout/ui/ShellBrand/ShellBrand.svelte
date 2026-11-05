<script lang="ts">
  import { workspaceUrl } from '@platform/context';
  import { t } from '@scylla/ui/i18n';
  import LogoScylla from '@scylla/ui/assets/logo_lockup.svg';
  import LogoScyllaDark from '@scylla/ui/assets/logo_lockup_dark.svg';
  import { layoutMessages } from '@base/shell/presentation/layout/messages/layout.messages.ts';
  import { linkParams } from '@base/shell/presentation/shell-params.ts';

  const slug = $derived(linkParams().workspaceSlug);
</script>

<!-- With no active workspace, `/` picks the workspace of the user. -->
<a
  href={slug ? workspaceUrl(slug, 'dashboard') : '/'}
  aria-label={t(layoutMessages.openDashboard)}
  class="rounded-lg outline-hidden focus-visible:ring-2 focus-visible:ring-sidebar-ring"
>
  <img src={LogoScylla} alt="Scylla" class="h-9 w-auto dark:hidden" />
  <img src={LogoScyllaDark} alt="Scylla" class="hidden h-9 w-auto dark:block" />
</a>
