<script lang="ts">
  import PowerIcon from '@lucide/svelte/icons/power';
  import PowerOffIcon from '@lucide/svelte/icons/power-off';
  import {
    Button,
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
  } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { agentPageMessages as messages } from '@base/features/apps/presentation/messages/agent-page.messages.ts';
  import type { AgentPage } from '../agent-page.state.svelte.ts';
  import AgentAccessCard from '../AgentAccessCard.svelte';
  import AgentDangerZone from '../AgentDangerZone.svelte';
  import AgentLabelsCard from '../AgentLabelsCard.svelte';
  import AppIconCard from '../../components/AppIconCard/AppIconCard.svelte';

  let { page }: { page: AgentPage } = $props();

  const agent = $derived(page.agent!);
</script>

<!-- What decides the jobs of the agent first, then its look, then the actions that stop it. -->
<div class="flex flex-col gap-4">
  <div class="grid items-stretch gap-4 lg:grid-cols-2">
    {#if page.canReadAccess}
      <AgentAccessCard
        agentId={agent.id}
        workspaceId={page.workspaceId}
        workspaceName={page.workspaceName}
        access={page.access}
        canChange={page.canChangeAccess}
      />
    {/if}
    <AgentLabelsCard {agent} canChange={page.canSetLabels} />
    {#if page.canSetIcon}
      <AppIconCard app={agent} onChange={avatar => page.openIcon(avatar)} />
    {/if}
    <Card>
      <CardHeader>
        <CardTitle><h2>{t(messages.jobsAtOnce)}</h2></CardTitle>
        <CardDescription>{t(messages.capacityHint)}</CardDescription>
        <CardAction>
          <span class="text-2xl font-medium tabular-nums">{agent.host?.capacity ?? '–'}</span>
        </CardAction>
      </CardHeader>
      <CardContent>
        <code class="rounded-md bg-muted px-2 py-1 font-mono text-xs">--capacity &lt;n&gt;</code>
      </CardContent>
    </Card>
  </div>

  {#if page.canManage}
    <Card>
      <CardHeader class="flex flex-wrap items-center gap-4">
        <div class="flex min-w-0 grow basis-64 flex-col gap-2">
          <CardTitle>
            <h2>{t(agent.disabledAt ? messages.enableTitle : messages.disableSection)}</h2>
          </CardTitle>
          <CardDescription>
            {t(agent.disabledAt ? messages.disabledBody : messages.disableSectionBody)}
          </CardDescription>
        </div>
        <CardAction>
          {#if agent.disabledAt}
            <Button onclick={page.enable} disabled={page.isEnabling}>
              <PowerIcon class="size-4" aria-hidden="true" />
              {t(messages.enable)}
            </Button>
          {:else}
            <Button variant="destructive" onclick={() => (page.disabling = true)}>
              <PowerOffIcon class="size-4" aria-hidden="true" />
              {t(messages.disableMenu)}
            </Button>
          {/if}
        </CardAction>
      </CardHeader>
    </Card>
    <AgentDangerZone onDelete={() => (page.deleting = true)} />
  {/if}
</div>
