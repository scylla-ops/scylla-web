<script lang="ts">
  import { createMutation } from '@scylla/core-sdk';
  import {
    Button,
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
  } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { sameAgentLabels } from '@shared/domain/structs/agent-label.struct.ts';
  import { agentLabelsMessages } from '@shared/presentation/messages/agent-labels.messages.ts';
  import { AgentLabels, AgentLabelsField } from '@shared/presentation/ui';
  import type { AppEntity } from '@base/features/apps/domain/entities/app.entity.ts';
  import { appMutations } from '@base/features/apps/presentation/apps.queries.ts';
  import { agentPageMessages as messages } from '@base/features/apps/presentation/messages/agent-page.messages.ts';

  interface Props {
    agent: Pick<AppEntity, 'id' | 'labels' | 'automaticLabels'>;
    /** `set_app_labels`: the admins of the workspace. */
    canChange: boolean;
  }

  let { agent, canChange }: Props = $props();

  const change = createMutation(() => appMutations.setLabels());

  let open = $state(false);
  let draft = $state<string[]>([]);

  const start = () => {
    draft = [...agent.labels];
    open = true;
  };

  const save = () => {
    if (sameAgentLabels(draft, agent.labels)) {
      open = false;
      return;
    }
    change.mutate({ appId: agent.id, labels: draft }, { onSuccess: () => (open = false) });
  };
</script>

{#snippet row(title: string, labels: readonly string[], automatic: readonly string[], none: string)}
  <div class="flex flex-col gap-1.5">
    <h3 class="text-xs text-muted-foreground">{title}</h3>
    {#if labels.length || automatic.length}
      <AgentLabels {labels} {automatic} label={title} />
    {:else}
      <p class="text-xs text-muted-foreground">{none}</p>
    {/if}
  </div>
{/snippet}

<Card>
  <CardHeader class="flex flex-row items-center justify-between">
    <CardTitle><h2>{t(messages.labels)}</h2></CardTitle>
    {#if canChange}
      <!-- The access card has a Change button too: the name tells them apart. -->
      <Button
        variant="outline"
        size="sm"
        aria-label={t(messages.changeLabelsTitle)}
        onclick={start}
      >
        {t(messages.change)}
      </Button>
    {/if}
  </CardHeader>
  <CardContent class="flex flex-col gap-3 text-sm">
    {@render row(t(messages.adminLabels), agent.labels, [], t(messages.noAdminLabel))}
    {@render row(
      t(agentLabelsMessages.fromMachine),
      [],
      agent.automaticLabels,
      t(messages.noMachineLabel),
    )}
    <p class="text-xs text-muted-foreground">{t(messages.labelsHint)}</p>
  </CardContent>
</Card>

<Dialog {open} onOpenChange={next => (open = next)}>
  <DialogContent class="sm:max-w-md">
    <DialogHeader>
      <DialogTitle>{t(messages.changeLabelsTitle)}</DialogTitle>
      <DialogDescription>{t(messages.changeLabelsHint)}</DialogDescription>
    </DialogHeader>
    <AgentLabelsField labels={draft} onChange={next => (draft = next)} autofocus />
    <DialogFooter>
      <Button variant="outline" onclick={() => (open = false)}>{t(messages.cancel)}</Button>
      <Button onclick={save} disabled={change.isPending}>{t(messages.save)}</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
