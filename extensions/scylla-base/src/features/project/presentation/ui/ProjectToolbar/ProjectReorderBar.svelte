<script lang="ts">
  import CheckIcon from '@lucide/svelte/icons/check';
  import MoveIcon from '@lucide/svelte/icons/move';
  import { Button } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { projectMessages } from '@base/features/project/presentation/messages/project.messages.ts';

  interface Props {
    /** « Done » saves the moves. */
    busy: boolean;
    onCancel: () => void;
    onDone: () => void;
  }

  let { busy, onCancel, onDone }: Props = $props();
</script>

<!-- The toolbar of the reorder mode. Escape also cancels. It has the height of the other toolbar,
     so that the swap of the two does not move the page. -->
<div class="flex min-h-8.5 items-center gap-3" data-part="project-reorder-bar">
  <MoveIcon class="size-4 shrink-0 text-primary" aria-hidden="true" />
  <p class="min-w-0 flex-1 text-sm font-medium text-muted-foreground">
    {t(projectMessages.reorderHint)}
  </p>
  <Button variant="ghost" disabled={busy} onclick={onCancel}>{t(projectMessages.cancel)}</Button>
  <Button disabled={busy} aria-busy={busy || undefined} onclick={onDone}>
    <CheckIcon aria-hidden="true" />
    {t(projectMessages.done)}
  </Button>
</div>
