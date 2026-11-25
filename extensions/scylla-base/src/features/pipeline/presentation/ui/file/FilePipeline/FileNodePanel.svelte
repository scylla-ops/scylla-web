<script lang="ts">
  import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
  import CopyIcon from '@lucide/svelte/icons/copy';
  import KeyRoundIcon from '@lucide/svelte/icons/key-round';
  import LockIcon from '@lucide/svelte/icons/lock';
  import { Button } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { cn, copyToClipboard } from '@scylla/ui/utils';
  import type { PipelineNodeEntity } from '@base/features/pipeline/domain/entities/pipeline-node.entity.ts';
  import { ERROR_PORT } from '@base/features/pipeline/domain/structs/port-name.struct.ts';
  import { dependencyText } from '@base/features/pipeline/presentation/mappers/pipeline-document.mapper.ts';
  import { blueprintMessages } from '@base/features/pipeline/presentation/messages/blueprint.messages.ts';
  import { exportMessages } from '@base/features/pipeline/presentation/messages/export.messages.ts';
  import { fileMessages } from '@base/features/pipeline/presentation/messages/file.messages.ts';
  import { nodeMessages } from '@base/features/pipeline/presentation/messages/node.messages.ts';
  import { nodeDetails } from '@base/features/pipeline/presentation/presenters/node-details.presenter.ts';
  import { summarize } from '@base/features/pipeline/presentation/presenters/node-summary.presenter.ts';
  import FileNodeConditions from './FileNodeConditions.svelte';

  interface Props {
    node: PipelineNodeEntity;
    /** Back to the settings of the file. */
    onBack: () => void;
  }

  let { node, onBack }: Props = $props();

  const summary = $derived(summarize(node, { issue: null }));
  const details = $derived(nodeDetails(node));
</script>

{#snippet heading(title: string)}
  <h3 class="text-[11px] tracking-wider text-muted-foreground uppercase">{title}</h3>
{/snippet}

<!-- One node of a file pipeline, read only: each of its fields, with no field to edit. -->
<div class="flex items-center px-2 pt-2">
  <Button variant="ghost" size="sm" onclick={onBack}>
    <ArrowLeftIcon class="size-4" aria-hidden="true" />
    {t(fileMessages.panelTitle)}
  </Button>
</div>

<div class="flex items-center gap-2.5 px-4 pt-1 pb-2">
  <span
    class={cn(
      'flex size-8 shrink-0 items-center justify-center rounded-lg',
      summary.tone.tile,
      summary.tone.text,
    )}
  >
    <summary.icon class="size-4" aria-hidden="true" />
  </span>
  <div class="flex min-w-0 flex-1 flex-col">
    <h2 class="truncate font-mono text-sm">{node.id}</h2>
    <span class="text-xs text-muted-foreground">{summary.kind}</span>
  </div>
  <LockIcon class="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
</div>

<div class="flex flex-wrap items-center gap-1.5 px-4 pb-3 text-xs text-muted-foreground">
  {#if node.deps.length === 0}
    <span>{t(nodeMessages.runsFirst)}</span>
  {:else}
    <span>{t(blueprintMessages.after)}</span>
    {#each node.deps as dependency (dependencyText(dependency))}
      <span
        class={cn(
          'rounded-md border bg-accent px-1.5 py-0.5 font-mono text-[11.5px] text-foreground',
          dependency.port === ERROR_PORT && 'border-destructive/40 text-destructive',
        )}
      >
        {dependencyText(dependency)}
      </span>
    {/each}
  {/if}
</div>

<div class="relative flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto border-t px-4 py-3">
  {#if details.code}
    {@const code = details.code}
    <section class="flex flex-col gap-1.5">
      <div class="flex items-center justify-between gap-2">
        {@render heading(code.title)}
        <Button variant="ghost" size="sm" class="h-7" onclick={() => void copyToClipboard(code.text)}>
          <CopyIcon class="size-3.5" aria-hidden="true" />
          {t(exportMessages.copy)}
        </Button>
      </div>
      <pre
        class="relative overflow-x-auto rounded-lg border bg-muted/50 px-3 py-2.5 font-mono text-[12.5px] leading-relaxed whitespace-pre">{code.text}</pre>
    </section>
  {/if}

  {#if details.rows.length}
    <dl class="flex flex-col divide-y rounded-lg border text-[13px]">
      {#each details.rows as row (row.label)}
        <div class="flex items-center justify-between gap-3 px-3 py-2">
          <dt class="shrink-0 text-muted-foreground">{row.label}</dt>
          <dd class={cn('min-w-0 truncate text-right', row.code && 'font-mono')} title={row.value}>
            {row.value}
          </dd>
        </div>
      {/each}
    </dl>
  {/if}

  <FileNodeConditions {details} />

  {#if node.kind === 'merge'}
    <p class="text-sm text-muted-foreground">{t(nodeMessages.mergeHint)}</p>
  {/if}

  {#if details.env.length}
    <section class="flex flex-col gap-1.5">
      {@render heading(t(nodeMessages.environment))}
      <dl class="flex flex-col divide-y rounded-lg border font-mono text-[12.5px]">
        {#each details.env as entry, index (index)}
          <div class="flex items-center justify-between gap-3 px-3 py-2">
            <dt class="min-w-0 truncate">{entry.key}</dt>
            <dd class="flex min-w-0 items-center gap-1.5 text-muted-foreground" title={entry.value}>
              {#if entry.secret}
                <KeyRoundIcon class="size-3.5 shrink-0" aria-hidden="true" />
                <span class="sr-only">{t(nodeMessages.envKindSecret)}</span>
              {/if}
              <span class="truncate">{entry.value}</span>
            </dd>
          </div>
        {/each}
      </dl>
    </section>
  {/if}
</div>

<p class="border-t px-4 py-3 text-[11.5px] leading-relaxed text-muted-foreground">
  {t(fileMessages.nodeReadOnlyHint)}
</p>
