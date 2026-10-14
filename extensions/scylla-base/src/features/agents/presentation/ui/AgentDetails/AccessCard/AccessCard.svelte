<script lang="ts">
  import PlusIcon from '@lucide/svelte/icons/plus';
  import ShieldCheckIcon from '@lucide/svelte/icons/shield-check';
  import XIcon from '@lucide/svelte/icons/x';
  import { GatedButton } from '@scylla/ui';
  import { Badge, Button, Card, Skeleton } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { cn } from '@scylla/ui/utils';
  import type { AppAccess } from '@base/features/apps';
  import type { AgentEntity } from '@base/features/agents/domain/entities/agent.entity.ts';
  import { accessReachOf } from '@base/features/agents/presentation/access.calculator.ts';
  import {
    createAgentAccess,
  } from '@base/features/agents/presentation/agent-access.state.svelte.ts';
  import { takeFocus } from '@base/features/agents/presentation/take-focus.attachments.svelte.ts';
  import GiveAccessDialog from './GiveAccessDialog.svelte';
  import RemoveAccessDialog from './RemoveAccessDialog.svelte';
  import { accessCardMessages as messages } from './access-card.messages.ts';
  import { GRANT_ICONS } from './grant-icons.ts';

  interface Props {
    agent: AgentEntity;
    access: AppAccess[] | undefined;
    loading: boolean;
    /** The organization on screen: a grant on another one names its organization. */
    organizationId: string;
  }

  let { agent, access, loading, organizationId }: Props = $props();

  const manager = createAgentAccess({
    agent: () => agent,
    access: () => access,
    organizationId: () => organizationId,
  });

  const SCOPES = {
    project: messages.scopeProject,
    organization: messages.scopeOrganization,
    system: messages.scopeSystem,
  };

  const reach = $derived.by(() => {
    const result = accessReachOf(manager.grants, organizationId);
    switch (result.kind) {
      case 'none':
        return '';
      case 'system':
        return t(messages.systemWide);
      case 'organization':
        return t(messages.organizationWide);
      case 'otherOrganizations':
        return t(messages.organizationWideOf(manager.listOf(result.names)));
      case 'project':
        return t(messages.projectOnly(result.project));
      case 'projects':
        return t(messages.projectsOnly(result.count));
    }
  });
</script>

<Card class="gap-4 px-5 py-5">
  <div class="flex items-start justify-between gap-3">
    <div class="flex flex-col gap-1">
      <h2
        tabindex="-1"
        class="text-sm font-semibold outline-none"
        {@attach takeFocus(() => manager.focusRequest)}
      >
        {t(messages.access)}
      </h2>
      <p class="text-xs text-muted-foreground">{t(messages.whereItTakesJobs)}</p>
    </div>
    {#if manager.canGiveAccess}
      <GatedButton
        variant="outline"
        size="sm"
        allowed={!manager.coversEveryProject}
        deniedReason={t(messages.everyProjectAlready)}
        disabled={loading || !access}
        onclick={manager.requestGive}
      >
        <PlusIcon />
        {t(messages.addAccess)}
      </GatedButton>
    {:else}
      <ShieldCheckIcon class="size-4 text-muted-foreground" aria-hidden="true" />
    {/if}
  </div>

  {#if manager.accessFailed}
    <div role="alert" class="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5">
      <p class="text-xs text-muted-foreground">{t(messages.accessLoadError)}</p>
      <Button
        variant="outline"
        size="sm"
        onclick={manager.retryAccess}
        disabled={manager.accessRetrying}
      >
        {t(messages.retry)}
      </Button>
    </div>
  {:else if manager.accessHidden}
    <p class="text-xs text-muted-foreground">{t(messages.accessHidden)}</p>
  {:else if loading || !access}
    <Skeleton class="h-14 w-full rounded-lg" />
  {:else if manager.grants.length === 0}
    <div
      class="flex flex-col items-center gap-1 rounded-lg border border-dashed px-4 py-6 text-center"
    >
      <p class="text-sm font-medium">{t(messages.noAccess)}</p>
      <p class="text-xs text-muted-foreground">{t(messages.noAccessBody)}</p>
    </div>
  {:else}
    <ul class="flex flex-col gap-2" aria-label={t(messages.access)}>
      {#each manager.grants as grant (grant.grantId)}
        {@const Icon = GRANT_ICONS[grant.scope]}
        {@const fresh = manager.isFresh(grant)}
        <li
          data-fresh={fresh || undefined}
          class={cn(
            'flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors duration-700',
            fresh ? 'border-primary bg-primary/14' : 'border-transparent bg-muted/50',
          )}
        >
          <Icon class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <div class="flex min-w-0 flex-1 flex-col">
            <span class="truncate text-sm font-medium">{manager.nameOf(grant)}</span>
            <span class="text-xs text-muted-foreground">{t(SCOPES[grant.scope])}</span>
          </div>
          <Badge variant="outline" class="font-normal">{grant.roleName}</Badge>
          {#if manager.removable(grant)}
            <Button
              variant="ghost"
              size="icon-sm"
              class="-mr-1.5 size-7 text-muted-foreground"
              onclick={() => manager.requestRemove(grant)}
            >
              <XIcon />
              <span class="sr-only">
                {t(messages.removeAccessTo(manager.nameOf(grant), grant.roleName))}
              </span>
            </Button>
          {/if}
        </li>
      {/each}
    </ul>
    <p class="text-xs text-muted-foreground">{reach}</p>
  {/if}
</Card>

<GiveAccessDialog {manager} agentName={agent.name} />
<RemoveAccessDialog {manager} agentName={agent.name} />
