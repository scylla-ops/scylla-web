<script lang="ts">
  import CopyIcon from '@lucide/svelte/icons/copy';
  import ExternalLinkIcon from '@lucide/svelte/icons/external-link';
  import KeyRoundIcon from '@lucide/svelte/icons/key-round';
  import MoreHorizontalIcon from '@lucide/svelte/icons/more-horizontal';
  import PowerIcon from '@lucide/svelte/icons/power';
  import PowerOffIcon from '@lucide/svelte/icons/power-off';
  import TrashIcon from '@lucide/svelte/icons/trash';
  import { Permission, can } from '@platform/authz';
  import { scyllaNavigate } from '@platform/context';
  import {
    buttonVariants,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
  } from '@scylla/ui/primitives';
  import { cn } from '@scylla/ui/utils';
  import { t } from '@scylla/ui/i18n';
  import type { AgentEntity } from '@base/features/agents/domain/entities/agent.entity.ts';
  import type {
    AgentActions,
  } from './agent-actions.state.svelte.ts';
  import { agentsMessages } from '../agents.messages.ts';

  interface Props {
    agent: AgentEntity;
    actions: AgentActions;
    /** The list row has every action; the detail header shows the others as buttons. */
    variant?: 'row' | 'header';
  }

  let { agent, actions, variant = 'row' }: Props = $props();

  const full = $derived(variant === 'row');
  const canOpen = $derived(can(Permission.READ_APP));
  const stop = (event: Event) => event.stopPropagation();
</script>

<DropdownMenu>
  <DropdownMenuTrigger
    class={cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }), 'shrink-0 hover:scale-100')}
    onclick={stop}
  >
    <MoreHorizontalIcon class="size-4" />
    <span class="sr-only">{t(agentsMessages.agentActions)}</span>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end" class="min-w-44" onclick={stop}>
    {#if full && canOpen}
      <DropdownMenuItem onSelect={() => scyllaNavigate.goToAgentDetails(agent.id)}>
        <ExternalLinkIcon />
        {t(agentsMessages.open)}
      </DropdownMenuItem>
    {/if}
    <DropdownMenuItem onSelect={() => void actions.copyId(agent)}>
      <CopyIcon />
      {t(agentsMessages.copyId)}
    </DropdownMenuItem>
    {#if full && actions.canReset}
      <DropdownMenuItem onSelect={() => actions.requestReset(agent)}>
        <KeyRoundIcon />
        {t(agentsMessages.resetSecret)}
      </DropdownMenuItem>
    {/if}
    {#if full && actions.canToggle}
      {#if agent.isActive}
        <DropdownMenuItem onSelect={() => actions.requestDisable(agent)}>
          <PowerOffIcon />
          {t(agentsMessages.disable)}
        </DropdownMenuItem>
      {:else}
        <DropdownMenuItem onSelect={() => actions.enable(agent)}>
          <PowerIcon />
          {t(agentsMessages.enable)}
        </DropdownMenuItem>
      {/if}
    {/if}
    {#if actions.canDelete}
      <DropdownMenuSeparator />
      <DropdownMenuItem variant="destructive" onSelect={() => actions.requestDelete(agent)}>
        <TrashIcon />
        {t(agentsMessages.delete)}
      </DropdownMenuItem>
    {/if}
  </DropdownMenuContent>
</DropdownMenu>
