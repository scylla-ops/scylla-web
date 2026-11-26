<script lang="ts">
  import { workspaceUrl } from '@platform/context';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import LogoScylla from '@scylla/ui/assets/logo_lockup.svg';
  import LogoScyllaDark from '@scylla/ui/assets/logo_lockup_dark.svg';
  import LogoMark from '@scylla/ui/assets/logo_mark.svg';
  import { swapIn, swapOut } from '@scylla/ui';
  import { arrival } from '@base/features/login';
  import { layoutMessages } from '@base/shell/presentation/layout/messages/layout.messages.ts';
  import { linkParams } from '@base/shell/presentation/shell-params.ts';

  interface Props {
    /** Only the 56 px rail column is there: the mark alone (36 px) fits in it, centered. The wordmark is 44 px high. */
    collapsed?: boolean;
  }

  let { collapsed = false }: Props = $props();

  const slug = $derived(linkParams().workspaceSlug);
</script>

<!-- With no active workspace, `/` picks the workspace of the user. -->
<!-- After a sign-in, the logo waits for the mark that flies to it, then the wordmark fades in. -->
<!-- The mark and the wordmark share one grid cell and cross-fade, so the corner does not jump. -->
<a
  href={slug ? workspaceUrl(slug, 'dashboard') : '/'}
  aria-label={t(layoutMessages.openDashboard)}
  data-collapsed={collapsed}
  class={cn(
    'grid place-items-center rounded-lg outline-hidden transition-opacity duration-300 ease-out focus-visible:ring-2 focus-visible:ring-sidebar-ring',
    arrival.hidesBrand && 'opacity-0',
  )}
>
  {#if collapsed}
    <span
      data-slot="brand-mark"
      class="col-start-1 row-start-1 flex items-center justify-center"
      in:swapIn
      out:swapOut
    >
      <img {@attach arrival.target} src={LogoMark} alt="Scylla" class="size-9" />
    </span>
  {:else}
    <span
      data-slot="brand-wordmark"
      class="col-start-1 row-start-1 flex items-center justify-center"
      in:swapIn
      out:swapOut
    >
      <img {@attach arrival.target} src={LogoScylla} alt="Scylla" class="h-11 w-auto dark:hidden" />
      <img
        {@attach arrival.target}
        src={LogoScyllaDark}
        alt="Scylla"
        class="hidden h-11 w-auto dark:block"
      />
    </span>
  {/if}
</a>
