<script lang="ts">
  import CheckIcon from '@lucide/svelte/icons/check';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import type { InstallWay } from '@base/features/apps/domain/structs/agent-install.struct.ts';
  import { addAgentMessages as messages } from '@base/features/apps/presentation/messages/add-agent.messages.ts';
  import { INSTALL_WAY_ORDER, INSTALL_WAYS } from '../install-ways.registry.ts';

  let { way = $bindable() }: { way: InstallWay } = $props();
</script>

<div class="grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-label={t(messages.system)}>
  {#each INSTALL_WAY_ORDER as value (value)}
    {@const view = INSTALL_WAYS[value]}
    {@const selected = value === way}
    <button
      type="button"
      aria-pressed={selected}
      class={cn(
        'relative flex flex-col items-center justify-center gap-1 rounded-lg border px-3 py-4 text-center transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none',
        selected ? 'border-primary bg-primary-subtle' : 'hover:bg-muted/50',
      )}
      onclick={() => (way = value)}
    >
      <view.icon class="size-5 text-muted-foreground" aria-hidden="true" />
      <span class="text-sm font-medium">{t(view.label)}</span>
      <span class="text-xs text-muted-foreground">{t(view.tool)}</span>
      {#if selected}
        <span
          class="absolute top-2 right-2 flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground"
          aria-hidden="true"
        >
          <CheckIcon class="size-3" />
        </span>
      {/if}
    </button>
  {/each}
</div>
