<script lang="ts">
  import type { Component } from 'svelte';
  import CircleAlertIcon from '@lucide/svelte/icons/circle-alert';
  import GitBranchIcon from '@lucide/svelte/icons/git-branch';
  import GitCommitHorizontalIcon from '@lucide/svelte/icons/git-commit-horizontal';
  import GitPullRequestIcon from '@lucide/svelte/icons/git-pull-request';
  import LockIcon from '@lucide/svelte/icons/lock';
  import PlayIcon from '@lucide/svelte/icons/play';
  import TagIcon from '@lucide/svelte/icons/tag';
  import { ResizablePane } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import { fileMessages } from '@base/features/pipeline/presentation/messages/file.messages.ts';
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
  }

  let { view }: Props = $props();

  // In percent of the blueprint, as the palette.
  const SIZES = { default: 24, min: 18, max: 40 } as const;

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

{#snippet group(title: string)}
  <h3 class="px-2 pt-3 pb-1 text-[11px] tracking-wider text-muted-foreground uppercase">
    {title}
  </h3>
{/snippet}

<ResizablePane
  id="blueprint-file"
  order={2}
  defaultSize={SIZES.default}
  minSize={SIZES.min}
  maxSize={SIZES.max}
>
  <aside class="flex h-full flex-col bg-card">
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
      {/if}
    </div>

    <p class="border-t px-4 py-3 text-[11.5px] leading-relaxed text-muted-foreground">
      {invalid ? t(fileMessages.invalidHint) : t(fileMessages.readOnlyHint)}
    </p>
  </aside>
</ResizablePane>
