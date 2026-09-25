<script lang="ts">
  import ArrowLeftToLineIcon from '@lucide/svelte/icons/arrow-left-to-line';
  import { Button, getSidebar } from '@scylla/ui/shadcn';
  import { cn } from '@scylla/ui/utils';
  import { t } from '@scylla/ui/i18n';
  import { shellMessages } from './shell.messages.ts';

  const sidebar = getSidebar();
</script>

<Button
  data-sidebar="trigger"
  data-slot="sidebar-trigger"
  variant="ghost"
  size="icon"
  class="size-7"
  onclick={() => sidebar.toggle()}
>
  <ArrowLeftToLineIcon
    class={cn('size-4 transition-transform duration-300', !sidebar.open && 'rotate-180')}
  />
  <span class="sr-only">{t(shellMessages.toggleSidebar)}</span>
</Button>
