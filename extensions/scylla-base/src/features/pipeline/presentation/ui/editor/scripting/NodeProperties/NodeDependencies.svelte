<script lang="ts">
  import XIcon from '@lucide/svelte/icons/x';
  import { SearchSelect } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import {
    sameDependency,
    type Dependency,
  } from '@base/features/pipeline/domain/entities/pipeline-node.entity.ts';
  import { ERROR_PORT } from '@base/features/pipeline/domain/structs/port-name.struct.ts';
  import {
    dependencyText,
    parseDependency,
  } from '@base/features/pipeline/presentation/mappers/pipeline-document.mapper.ts';
  import { scriptingMessages } from '@base/features/pipeline/presentation/messages/scripting.messages.ts';
  import { nodeMessages } from '@base/features/pipeline/presentation/messages/node.messages.ts';

  interface Props {
    deps: Dependency[];
    /** The needs it can have without a loop: on each node, and on each of its ports. */
    candidates: Dependency[];
    /** The nodes that wait for this one. */
    dependents: string[];
    onChange: (deps: Dependency[]) => void;
    onOpen: (id: string) => void;
  }

  let { deps, candidates, dependents, onChange, onOpen }: Props = $props();

  // A need is picked as its text: `build`, `is-main:true`, `test:error`.
  const addable = $derived(
    candidates
      .filter(candidate => !deps.some(dep => sameDependency(dep, candidate)))
      .map(candidate => ({ value: dependencyText(candidate), label: dependencyText(candidate) })),
  );

  let picked = $state('');

  const add = (text: string) => {
    if (text) onChange([...deps, parseDependency(text)]);
    picked = '';
  };
</script>

{#snippet nodeId(option: { label: string })}
  <span class="truncate font-mono">{option.label}</span>
{/snippet}

<div class="flex flex-col gap-2">
  <span class="text-sm font-medium">{t(scriptingMessages.dependencies)}</span>
  <div class="flex flex-wrap items-center gap-1.5 font-mono text-xs">
    {#if deps.length === 0}
      <span class="font-sans text-muted-foreground">{t(nodeMessages.runsFirst)}</span>
    {/if}
    {#each deps as dep (dependencyText(dep))}
      {@const text = dependencyText(dep)}
      <span
        class={cn(
          'flex max-w-full min-w-0 items-center gap-1 rounded-full bg-primary-subtle py-0.5 pr-0.5 pl-2.5',
          dep.port === ERROR_PORT && 'bg-destructive-subtle text-destructive',
        )}
      >
        <span class="min-w-0 truncate" title={text}>{text}</span>
        <button
          type="button"
          class="flex size-5 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
          aria-label={t(scriptingMessages.removeDependency(text))}
          onclick={() => onChange(deps.filter(other => !sameDependency(other, dep)))}
        >
          <XIcon class="size-3" />
        </button>
      </span>
    {/each}
  </div>

  {#if addable.length > 0}
    <!-- Reset after each pick: the select adds, it does not hold a value. -->
    <SearchSelect
      options={addable}
      bind:value={picked}
      onValueChange={add}
      row={nodeId}
      placeholder={t(scriptingMessages.addDependency)}
      aria-label={t(scriptingMessages.addDependency)}
    />
  {/if}

  {#if dependents.length > 0}
    <p class="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
      {t(scriptingMessages.requiredBy)}
      {#each dependents as id (id)}
        <button
          type="button"
          class="max-w-full truncate font-mono text-primary underline-offset-2 hover:underline"
          title={id}
          onclick={() => onOpen(id)}
        >
          {id}
        </button>
      {/each}
    </p>
  {/if}
</div>
