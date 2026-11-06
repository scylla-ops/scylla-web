<script lang="ts">
  import type { CommandForm } from '@scylla/core-sdk';
  import { ScyllaDialog } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { DialogTitle } from '@scylla/ui/primitives';
  import { layoutMessages } from '@base/shell/presentation/layout/messages/layout.messages.ts';
  import CommandBarContent from './CommandBarContent.svelte';

  interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    openForm: (form: CommandForm) => void;
  }

  let { open, onOpenChange, openForm }: Props = $props();
</script>

<ScyllaDialog
  {open}
  {onOpenChange}
  class="top-[12%] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-2xl [&>button]:hidden"
>
  {#snippet header()}
    <DialogTitle class="sr-only">{t(layoutMessages.search)}</DialogTitle>
  {/snippet}
  <CommandBarContent close={() => onOpenChange(false)} {openForm} />
</ScyllaDialog>
