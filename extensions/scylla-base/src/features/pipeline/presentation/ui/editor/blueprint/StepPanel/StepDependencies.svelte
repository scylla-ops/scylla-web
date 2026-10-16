<script lang="ts">
  import PlusIcon from '@lucide/svelte/icons/plus';
  import XIcon from '@lucide/svelte/icons/x';
  import { Select, SelectContent, SelectItem, SelectTrigger } from '@scylla/ui/shadcn';
  import { t } from '@scylla/ui/i18n';
  import type { BlueprintState } from '../../../../blueprint.state.svelte.ts';
  import { blueprintMessages } from '../blueprint.messages.ts';
  import { SECTION_TITLE } from '../section-title.ts';

  interface Props {
    blueprint: BlueprintState;
    stepId: string;
  }

  let { blueprint, stepId }: Props = $props();

  const deps = $derived(blueprint.dependenciesOf(stepId));
  const candidates = $derived(blueprint.dependencyCandidates(stepId));
</script>

<!-- The same dependencies as the links drawn on the canvas, editable without dragging. -->
<section class="flex flex-col gap-2 border-b px-5 py-4">
  <h3 class={SECTION_TITLE}>
    {t(blueprintMessages.runsAfter)}
  </h3>
  {#if deps.length === 0}
    <p class="text-xs text-muted-foreground">{t(blueprintMessages.runsFirstHint)}</p>
  {/if}
  <div class="flex flex-wrap items-center gap-1.5">
    {#each deps as dep (dep)}
      <span class="inline-flex h-7 items-center gap-1 rounded-full bg-muted pr-1 pl-2.5 font-mono text-xs font-medium">
        {dep}
        <button
          type="button"
          aria-label={t(blueprintMessages.removeDependency(dep))}
          onclick={() => blueprint.removeDependency(stepId, dep)}
          class="flex size-5 items-center justify-center rounded-full text-muted-foreground hover:bg-background hover:text-foreground"
        >
          <XIcon class="size-3" />
        </button>
      </span>
    {/each}
    {#if candidates.length > 0}
      <Select type="single" value="" onValueChange={value => blueprint.addDependency(stepId, value)}>
        <SelectTrigger
          aria-label={t(blueprintMessages.addDependency)}
          size="sm"
          class="h-7 rounded-full border-dashed px-2.5 text-xs [&>svg:last-child]:hidden"
        >
          <PlusIcon class="size-3.5" />
          {t(blueprintMessages.addDependency)}
        </SelectTrigger>
        <SelectContent>
          {#each candidates as candidate (candidate)}
            <SelectItem value={candidate} label={candidate} class="font-mono text-xs">{candidate}</SelectItem>
          {/each}
        </SelectContent>
      </Select>
    {/if}
  </div>
</section>
