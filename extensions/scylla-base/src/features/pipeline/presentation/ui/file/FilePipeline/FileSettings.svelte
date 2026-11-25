<script lang="ts">
  import type { Component } from 'svelte';
  import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
  import CircleAlertIcon from '@lucide/svelte/icons/circle-alert';
  import GitBranchIcon from '@lucide/svelte/icons/git-branch';
  import GitCommitHorizontalIcon from '@lucide/svelte/icons/git-commit-horizontal';
  import GitPullRequestIcon from '@lucide/svelte/icons/git-pull-request';
  import LockIcon from '@lucide/svelte/icons/lock';
  import PlayIcon from '@lucide/svelte/icons/play';
  import TagIcon from '@lucide/svelte/icons/tag';
  import TagsIcon from '@lucide/svelte/icons/tags';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import type { PipelineNodeEntity } from '@base/features/pipeline/domain/entities/pipeline-node.entity.ts';
  import { blueprintMessages } from '@base/features/pipeline/presentation/messages/blueprint.messages.ts';
  import { fileMessages } from '@base/features/pipeline/presentation/messages/file.messages.ts';
  import { summarize } from '@base/features/pipeline/presentation/presenters/node-summary.presenter.ts';
  import {
    branchLabel,
    checkoutRow,
    errorPlace,
    errorText,
    ruleRows,
    type RuleKind,
  } from '@base/features/pipeline/presentation/presenters/pipeline-file.presenter.ts';
  import type { FilePipeline } from './file-pipeline.state.svelte.ts';

  interface Props {
    view: FilePipeline;
    /** Opens a node, as a click on the canvas does. */
    onOpen: (nodeId: string) => void;
  }

  let { view, onOpen }: Props = $props();

  const RULE_ICONS: Record<RuleKind, Component> = {
    push: GitCommitHorizontalIcon,
    pull_request: GitPullRequestIcon,
    tag: TagIcon,
  };

  const invalid = $derived(view.errors.length > 0);
  const rules = $derived(view.file ? ruleRows(view.file.rules) : []);
  const checkout = $derived(view.file ? checkoutRow(view.file.checkout) : undefined);
</script>

{#snippet row(Icon: Component, title: string, detail: string, error = false)}
  <li class="flex items-center gap-2.5 rounded-lg p-2">
    <span
      class={cn(
        'flex size-8 shrink-0 items-center justify-center rounded-lg border border-foreground/10 bg-card',
        error ? 'text-destructive' : 'text-muted-foreground',
      )}
    >
      <Icon class="size-4" aria-hidden="true" />
    </span>
    <span class="flex min-w-0 flex-1 flex-col text-left">
      <span class="truncate text-[13px] font-medium">{title}</span>
      <span class="truncate text-[11.5px] text-muted-foreground" title={detail}>{detail}</span>
    </span>
  </li>
{/snippet}

<!-- A node of the graph: a click opens it, as on the canvas. -->
{#snippet nodeRow(node: PipelineNodeEntity)}
  {@const summary = summarize(node, { issue: null })}
  {@const detail = [summary.kind, summary.preview].filter(Boolean).join(' · ')}
  <li>
    <button
      type="button"
      class="flex w-full items-center gap-2.5 rounded-lg p-2 text-left transition-colors outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50"
      onclick={() => onOpen(node.id)}
    >
      <span
        class={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-lg',
          summary.tone.tile,
          summary.tone.text,
        )}
      >
        <summary.icon class="size-4" aria-hidden="true" />
      </span>
      <span class="flex min-w-0 flex-1 flex-col">
        <span class="truncate font-mono text-[13px] font-medium">{node.id}</span>
        <span class="truncate text-[11.5px] text-muted-foreground" title={detail}>{detail}</span>
      </span>
      <ChevronRightIcon class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    </button>
  </li>
{/snippet}

{#snippet group(title: string)}
  <h3 class="px-2 pt-3 pb-1 text-[11px] tracking-wider text-muted-foreground uppercase">
    {title}
  </h3>
{/snippet}

<h2 class="flex items-center gap-1.5 p-3 pb-1 px-4 text-sm">
  {invalid ? t(fileMessages.errorsOn(branchLabel(view.branch))) : t(fileMessages.panelTitle)}
  <LockIcon class="size-3.5 text-muted-foreground" aria-hidden="true" />
</h2>

<div class="relative min-h-0 flex-1 overflow-y-auto px-2 pb-2">
  {#if invalid}
    {@render group(view.path)}
    <ul>
      {#each view.errors as error, index (index)}
        {@render row(CircleAlertIcon, errorPlace(error), errorText(error), true)}
      {/each}
    </ul>
  {:else if view.file}
    {@render group(t(fileMessages.triggersFromOn))}
    <ul>
      {#each rules as rule (rule.kind)}
        {@render row(RULE_ICONS[rule.kind], rule.title, rule.detail)}
      {:else}
        {@render row(PlayIcon, t(fileMessages.manualOnlyTitle), t(fileMessages.manualOnly))}
      {/each}
    </ul>
    {#if checkout}
      {@render group(t(fileMessages.checkout))}
      <ul>
        {@render row(GitBranchIcon, checkout.title, checkout.detail)}
      </ul>
    {/if}
    {#if view.file.agentLabels?.length}
      {@render group(t(fileMessages.agent))}
      <ul>
        {@render row(TagsIcon, t(fileMessages.agentLabelsTitle), view.file.agentLabels.join(', '))}
      </ul>
    {/if}
  {/if}
  {#if view.nodes.length}
    {@render group(t(blueprintMessages.nodes))}
    <ul>
      {#each view.nodes as node (node.id)}
        {@render nodeRow(node)}
      {/each}
    </ul>
  {/if}
</div>

<div class="flex flex-col gap-1.5 border-t px-4 py-3 text-[11.5px] leading-relaxed text-muted-foreground">
  <p>{invalid ? t(fileMessages.invalidHint) : t(fileMessages.readOnlyHint)}</p>
  {#if view.canArrange}
    <p>{t(fileMessages.placesHint)}</p>
  {/if}
</div>
