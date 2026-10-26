<script lang="ts">
  import CheckIcon from '@lucide/svelte/icons/check';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import { createAgentMessages as messages } from '@base/features/agents/presentation/messages/create-agent.messages.ts';

  interface Props {
    step: 1 | 2;
    /** Step 1 is done: its dot turns into a check and the line fills. */
    firstDone: boolean;
  }

  let { step, firstDone }: Props = $props();
</script>

<ol aria-label={t(messages.steps)} class="flex items-center gap-3 text-xs">
  <li class="flex items-center gap-2" aria-current={step === 1 ? 'step' : undefined}>
    <span
      class={cn(
        'dot relative flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-medium text-primary-foreground',
        firstDone && 'done',
      )}
    >
      {#if firstDone}
        <CheckIcon class="size-3" aria-hidden="true" />
      {:else}
        1
      {/if}
    </span>
    <span class={step === 1 ? 'font-medium text-foreground' : 'text-muted-foreground'}>
      {t(messages.stepNameAndAccess)}
    </span>
  </li>
  <li aria-hidden="true" class="relative h-px w-10 overflow-hidden rounded-full bg-border">
    <span
      class={cn(
        'absolute inset-y-0 left-0 bg-primary transition-[width] duration-400 ease-out motion-reduce:transition-none',
        firstDone ? 'w-full' : 'w-0',
      )}
    ></span>
  </li>
  <li class="flex items-center gap-2" aria-current={step === 2 ? 'step' : undefined}>
    <span
      class={cn(
        'flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-medium transition-colors duration-300',
        step === 2
          ? 'bg-primary text-primary-foreground'
          : 'border border-muted-foreground/50 text-muted-foreground',
      )}
    >
      2
    </span>
    <span class={step === 2 ? 'font-medium text-foreground' : 'text-muted-foreground'}>
      {t(messages.stepStart)}
    </span>
  </li>
</ol>

<style>
  .dot.done::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 9999px;
    box-shadow: 0 0 0 0 var(--primary);
    animation: ring-pulse 700ms ease-out;
  }
  @keyframes ring-pulse {
    0% {
      box-shadow: 0 0 0 0 color-mix(in oklab, var(--primary) 60%, transparent);
    }
    100% {
      box-shadow: 0 0 0 8px color-mix(in oklab, var(--primary) 0%, transparent);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .dot.done::after {
      animation: none;
    }
  }
</style>
