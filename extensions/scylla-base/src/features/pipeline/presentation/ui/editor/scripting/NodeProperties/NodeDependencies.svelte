<script lang="ts">
  import XIcon from '@lucide/svelte/icons/x';
  import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { scriptingMessages } from '@base/features/pipeline/presentation/messages/scripting.messages.ts';
  import { nodeMessages } from '@base/features/pipeline/presentation/messages/node.messages.ts';

  interface Props {
    deps: string[];
    /** The nodes it can wait for without a loop. */
    candidates: string[];
    /** The nodes that wait for this one. */
    dependents: string[];
    onChange: (deps: string[]) => void;
    onOpen: (id: string) => void;
  }

  let { deps, candidates, dependents, onChange, onOpen }: Props = $props();

  const addable = $derived(candidates.filter(id => !deps.includes(id)));

  let picked = $state('');

  const add = (id: string) => {
    if (id) onChange([...deps, id]);
    picked = '';
  };
</script>

<div class="flex flex-col gap-2">
  <span class="text-sm font-medium">{t(scriptingMessages.dependencies)}</span>
  <div class="flex flex-wrap items-center gap-1.5 font-mono text-xs">
    {#if deps.length === 0}
      <span class="font-sans text-muted-foreground">{t(nodeMessages.runsFirst)}</span>
    {/if}
    {#each deps as dep (dep)}
      <span
        class="flex max-w-full min-w-0 items-center gap-1 rounded-full bg-primary-subtle py-0.5 pr-0.5 pl-2.5"
      >
        <span class="min-w-0 truncate" title={dep}>{dep}</span>
        <button
          type="button"
          class="flex size-5 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
          aria-label={t(scriptingMessages.removeDependency(dep))}
          onclick={() => onChange(deps.filter(id => id !== dep))}
        >
          <XIcon class="size-3" />
        </button>
      </span>
    {/each}
  </div>

  {#if addable.length > 0}
    <!-- Reset after each pick: the select adds, it does not hold a value. -->
    <Select type="single" bind:value={picked} onValueChange={add}>
      <SelectTrigger aria-label={t(scriptingMessages.addDependency)} class="w-full">
        <SelectValue placeholder={t(scriptingMessages.addDependency)} />
      </SelectTrigger>
      <SelectContent>
        {#each addable as id (id)}
          <SelectItem value={id} label={id} class="font-mono">{id}</SelectItem>
        {/each}
      </SelectContent>
    </Select>
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
