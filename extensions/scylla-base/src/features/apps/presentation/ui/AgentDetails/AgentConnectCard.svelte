<script lang="ts">
  import { createMutation } from '@scylla/core-sdk';
  import { Card, CardContent, CardHeader, CardTitle, Skeleton } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import type { JoinCode } from '@base/features/apps/domain/entities/app.entity.ts';
  import { appMutations } from '@base/features/apps/presentation/apps.queries.ts';
  import InstallStep from '../components/AddAgentDialog/InstallStep.svelte';
  import { agentPageMessages as messages } from '@base/features/apps/presentation/messages/agent-page.messages.ts';

  let { agentId }: { agentId: string } = $props();

  const renew = createMutation(() => appMutations.joinCode());

  let joinCode = $state<JoinCode | null>(null);
  let requested = false;

  const newCode = () => renew.mutate(agentId, { onSuccess: code => (joinCode = code) });

  $effect(() => {
    if (requested) return;
    requested = true;
    newCode();
  });
</script>

<Card data-tour="agent-run">
  <CardHeader class="flex flex-row items-center justify-between">
    <CardTitle><h2>{t(messages.connect)}</h2></CardTitle>
    <span class="text-xs text-muted-foreground">{t(messages.neverSaidHello)}</span>
  </CardHeader>
  <CardContent>
    {#if joinCode}
      <InstallStep {joinCode} onNewCode={newCode} renewing={renew.isPending} />
    {:else}
      <Skeleton class="h-40 w-full rounded-lg" />
    {/if}
  </CardContent>
</Card>
