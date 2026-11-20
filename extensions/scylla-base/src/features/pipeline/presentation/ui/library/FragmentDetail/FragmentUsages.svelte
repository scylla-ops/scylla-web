<script lang="ts">
  import WorkflowIcon from '@lucide/svelte/icons/workflow';
  import { Card } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import {
    latestVersion,
    type FragmentEntity,
    type FragmentUsage,
  } from '@base/features/pipeline/domain/entities/fragment.entity.ts';
  import { communityMessages } from '@base/features/pipeline/presentation/messages/community.messages.ts';
  import { libraryMessages } from '@base/features/pipeline/presentation/messages/library.messages.ts';
  import VersionBadge from '../VersionBadge.svelte';

  interface Props {
    fragment: FragmentEntity;
  }

  let { fragment }: Props = $props();

  /** The card stays short: the rest is counted. */
  const SHOWN = 5;

  const latestEntry = $derived(latestVersion(fragment));
  const latest = $derived(latestEntry.number);

  /** The values that a pipeline sets apart from the default: they stay through an update. */
  const pinsOf = (usage: FragmentUsage): [string, string][] =>
    latestEntry.parameters.flatMap(parameter => {
      const value = usage.values[parameter.key];
      return parameter.kind === 'literal' && value !== undefined && value !== parameter.default
        ? [[parameter.key, value] as [string, string]]
        : [];
    });
  const shown = $derived(fragment.usages.slice(0, SHOWN));
  const hidden = $derived(fragment.usages.length - shown.length);
</script>

<Card class="flex flex-col gap-3 p-4">
  <h2>{t(libraryMessages.usedIn(fragment.usages.length))}</h2>
  {#if shown.length}
    <ul class="flex flex-col gap-2.5">
      {#each shown as usage (usage.pipelineId)}
        <li class="flex items-center gap-2.5 text-xs">
          <WorkflowIcon class="size-3.5 shrink-0 text-muted-foreground" />
          <span class="min-w-0 flex-1">
            <span class="block truncate text-sm font-medium">{usage.pipelineName}</span>
            <span class="block truncate text-muted-foreground">{usage.projectName}</span>
            {#each pinsOf(usage) as [key, value] (key)}
              <span class="block truncate font-mono text-[10.5px] text-warning">
                {t(communityMessages.pinsValue(key, value))}
              </span>
            {/each}
          </span>
          {#if usage.version < latest}
            <span class="rounded-full border px-2 py-0.5 font-medium">{t(libraryMessages.updateAvailable)}</span>
          {/if}
          <VersionBadge number={usage.version} filled={usage.version === latest} />
        </li>
      {/each}
    </ul>
    {#if hidden}
      <p class="text-xs font-medium text-primary">{t(libraryMessages.morePipelines(hidden))}</p>
    {/if}
  {:else}
    <p class="text-xs text-muted-foreground">{t(libraryMessages.noUsage)}</p>
  {/if}
</Card>
