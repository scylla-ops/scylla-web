<script lang="ts">
  import FileCodeIcon from '@lucide/svelte/icons/file-code-2';
  import GripVerticalIcon from '@lucide/svelte/icons/grip-vertical';
  import TerminalIcon from '@lucide/svelte/icons/terminal';
  import { cn } from '@scylla/ui/utils';
  import { t } from '@scylla/ui/i18n';
  import type { BlueprintState } from '../../../blueprint.state.svelte.ts';
  import { START_NODE_ID } from '../../../utils/blueprint-converter.ts';
  import { blueprintMessages } from './blueprint.messages.ts';
  import { STEP_BLOCKS, STEP_BLOCK_MIME, type StepBlock } from './step-blocks.ts';

  interface Props {
    blueprint: BlueprintState;
  }

  let { blueprint }: Props = $props();

  const steps = $derived(
    blueprint.nodes.filter(node => node.id !== START_NODE_ID).map(node => node.id),
  );

  const depsOf = (id: string) =>
    blueprint.edges
      .filter(edge => edge.target === id && edge.source !== START_NODE_ID)
      .map(edge => edge.source);

  // A click adds the step after the selected one: the keyboard path to the palette.
  const add = (block: StepBlock) => {
    const after = blueprint.selectedStep?.id;
    blueprint.addStep(block.idPrefix, block.value(), { after });
  };
</script>

<aside class="flex w-62 shrink-0 flex-col overflow-y-auto border-r bg-sidebar">
  <div class="flex flex-col gap-2.5 p-4">
    <h2 class="text-[11px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">
      {t(blueprintMessages.addStep)}
    </h2>
    {#each STEP_BLOCKS as block (block.key)}
      <button
        type="button"
        draggable="true"
        ondragstart={event => {
          event.dataTransfer?.setData(STEP_BLOCK_MIME, block.key);
          if (event.dataTransfer) event.dataTransfer.effectAllowed = 'copy';
        }}
        onclick={() => add(block)}
        class="flex cursor-grab items-center gap-2.5 rounded-lg border bg-card p-2.5 text-left transition-colors hover:border-primary/60 active:cursor-grabbing"
      >
        <span class="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/12 text-primary">
          {#if block.key === 'exec'}<TerminalIcon class="size-4" />{:else}<FileCodeIcon class="size-4" />{/if}
        </span>
        <span class="flex min-w-0 flex-1 flex-col">
          <span class="text-[13px] font-semibold">{t(block.label)}</span>
          <span class="text-xs text-muted-foreground">{t(block.hint)}</span>
        </span>
        <GripVerticalIcon class="size-4 shrink-0 text-muted-foreground/60" />
      </button>
    {/each}
    <p class="text-xs leading-relaxed text-muted-foreground">{t(blueprintMessages.paletteHint)}</p>
  </div>

  <div class="mx-4 h-px bg-border"></div>

  <nav class="flex flex-col gap-1 p-4" aria-labelledby="blueprint-steps">
    <h2 id="blueprint-steps" class="text-[11px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">
      {t(blueprintMessages.steps)} · {steps.length}
    </h2>
    {#each steps as id (id)}
      {@const deps = depsOf(id)}
      <button
        type="button"
        onclick={() => blueprint.select(id)}
        aria-current={blueprint.selectedId === id ? 'true' : undefined}
        class={cn(
          'flex h-8 items-center gap-2 rounded-md px-2 text-left text-[13px] transition-colors hover:bg-accent',
          blueprint.selectedId === id && 'bg-accent font-semibold',
        )}
      >
        <span class="min-w-0 flex-1 truncate font-mono text-[12.5px]">{id}</span>
        <span class="max-w-24 shrink-0 truncate text-[11px] text-muted-foreground">
          {deps.length > 0
            ? t(blueprintMessages.runsAfterList(deps.join(', ')))
            : t(blueprintMessages.runsFirst)}
        </span>
      </button>
    {:else}
      <p class="text-xs text-muted-foreground">{t(blueprintMessages.noStepsYet)}</p>
    {/each}
  </nav>
</aside>
