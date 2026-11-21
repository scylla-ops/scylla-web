<script lang="ts">
  import { ChartDot } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import type { AttentionItem } from '@base/features/dashboard/domain/structs/attention.struct.ts';
  import { attentionMessages as messages } from '@base/features/dashboard/presentation/messages/attention.messages.ts';
  import {
    ATTENTION_TONES,
    attentionError,
    attentionJob,
    attentionLabel,
    attentionTitle,
    attentionWhen,
  } from '@base/features/dashboard/presentation/presenters/attention.presenter.ts';
  import AttentionActions from './AttentionActions.svelte';

  interface Props {
    item: AttentionItem;
    timeZone: string;
    /** The buttons at the right of the row. */
    actions?: boolean;
  }

  let { item, timeZone, actions = false }: Props = $props();
</script>

<li class="flex min-w-0 items-center gap-2.5">
  <span class="flex size-7 shrink-0 items-center justify-center self-start rounded-md bg-muted mt-[5px]">
    <ChartDot tone={ATTENTION_TONES[item.kind]} />
  </span>
  <div class="flex min-w-0 flex-1 flex-col gap-0.5">
    <p class="flex min-w-0 items-center gap-1.5">
      <span class="truncate text-sm font-medium">{attentionTitle(item)}</span>
      {#if item.projectName}<span class="shrink-0 text-xs text-muted-foreground">{item.projectName}</span>{/if}
      {#if item.isNew}<span class="shrink-0 text-xs font-medium text-primary">{t(messages.newMark)}</span>{/if}
      <span class="ml-auto shrink-0 pl-2 text-xs text-muted-foreground tabular-nums">
        {attentionWhen(item, timeZone, false)}
      </span>
    </p>
    <p class="flex min-w-0 items-center gap-1.5 text-xs">
      <span class="shrink-0 font-medium">{attentionLabel(item.kind)}</span>
      {#if attentionJob(item)}<span class="shrink-0 font-mono text-muted-foreground">{attentionJob(item)}</span>{/if}
      <span class="truncate text-muted-foreground">{attentionError(item)}</span>
    </p>
  </div>
  {#if actions}
    <AttentionActions {item} class="w-[132px] justify-end" />
  {/if}
</li>
