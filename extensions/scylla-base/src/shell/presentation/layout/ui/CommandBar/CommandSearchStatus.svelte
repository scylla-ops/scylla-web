<script lang="ts">
  import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
  import { enter, exit } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { commandBarMessages as messages } from '@base/shell/presentation/layout/messages/command-bar.messages.ts';
</script>

<!-- The server search of one kind runs: a small line under its rows, never a block. It fades in
     and out while the rows fade in. -->
<p
  class="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground"
  data-slot="command-searching"
  in:enter
  out:exit
>
  <span class="grid size-5 shrink-0 place-items-center" aria-hidden="true">
    <LoaderCircleIcon class="size-3.5 animate-spin motion-reduce:animate-none" />
  </span>
  <span>{t(messages.searching)}</span>
</p>
