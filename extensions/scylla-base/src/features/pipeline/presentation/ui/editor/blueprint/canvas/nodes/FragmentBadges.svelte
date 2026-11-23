<script lang="ts">
  import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
  import { t } from '@scylla/ui/i18n';
  import { libraryMessages } from '@base/features/pipeline/presentation/messages/library.messages.ts';
  import type { BlockSummary } from '@base/features/pipeline/presentation/presenters/fragment.presenter.ts';

  interface Props {
    summary: BlockSummary;
  }

  let { summary }: Props = $props();
</script>

<!-- Over the top edge of a block: the values it still needs, else the version it can take. -->
{#if summary.missing}
  <span
    class="absolute -top-2.5 right-3 rounded-full bg-destructive px-2 py-0.5 text-[10.5px] font-semibold text-destructive-foreground"
  >
    {t(libraryMessages.missingValues(summary.missing))}
  </span>
{:else if summary.proposed}
  <span
    class="absolute -top-2.5 right-3 flex items-center gap-1 rounded-full bg-warning px-2 py-0.5 text-[10.5px] font-semibold text-warning-foreground"
    title={t(libraryMessages.versionAvailable(summary.proposed.number))}
  >
    <RefreshCwIcon class="size-3" />
    {t(libraryMessages.version(summary.proposed.number))}
  </span>
{/if}
