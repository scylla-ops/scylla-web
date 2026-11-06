<script lang="ts">
  import { createMutation, createQuery } from '@scylla/core-sdk';
  import { Button, Card, CardContent, CardHeader, CardTitle } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import type { JoinCode } from '@base/features/apps/domain/entities/app.entity.ts';
  import {
    appMutations,
    appQueries,
    isJoining,
  } from '@base/features/apps/presentation/apps.queries.ts';
  import InstallStep from '../components/AddAgentDialog/InstallStep.svelte';
  import { agentPageMessages as messages } from '@base/features/apps/presentation/messages/agent-page.messages.ts';

  interface Props {
    agentId: string;
    workspaceId: string;
    keyCount: number;
  }

  let { agentId, workspaceId, keyCount }: Props = $props();

  const renew = createMutation(() => appMutations.joinCode());

  let joinCode = $state<JoinCode | null>(null);
  let keysBefore = $state(0);

  // A new code on open would stop the code of a machine that installs now.
  const newCode = () =>
    renew.mutate(agentId, {
      onSuccess: code => {
        if (!joinCode) keysBefore = keyCount;
        joinCode = code;
      },
    });

  const waiting = $derived(appQueries.waiting(agentId, workspaceId, keysBefore));
  const watched = createQuery(() => ({ ...waiting, enabled: !!joinCode && !!waiting.enabled }));
</script>

<Card data-tour="agent-run">
  <CardHeader class="flex flex-row items-center justify-between">
    <CardTitle><h2>{t(messages.connect)}</h2></CardTitle>
    <span class="text-xs text-muted-foreground">{t(messages.neverSaidHello)}</span>
  </CardHeader>
  <CardContent>
    {#if joinCode}
      <InstallStep
        {joinCode}
        onNewCode={newCode}
        renewing={renew.isPending}
        joined={isJoining(watched.data, keysBefore)}
      />
    {:else}
      <div class="flex flex-wrap items-center justify-between gap-3">
        <p class="text-sm text-muted-foreground">{t(messages.connectBody)}</p>
        <Button type="button" disabled={renew.isPending} onclick={newCode}>
          {t(messages.makeCode)}
        </Button>
      </div>
    {/if}
  </CardContent>
</Card>
