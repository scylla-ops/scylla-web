<script lang="ts">
  import { Button, Card, CardContent, CardHeader, CardTitle } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { agentPageMessages as messages } from '@base/features/apps/presentation/messages/agent-page.messages.ts';
  import { agentsListMessages } from '@base/features/apps/presentation/messages/agents-list.messages.ts';

  interface Props {
    /** Opens the install step, with a new join code. */
    onConnect: () => void;
  }

  let { onConnect }: Props = $props();
</script>

<Card data-tour="agent-run">
  <CardHeader class="flex flex-row items-center justify-between">
    <CardTitle><h2>{t(messages.connect)}</h2></CardTitle>
    <span class="text-xs text-muted-foreground">{t(messages.neverSaidHello)}</span>
  </CardHeader>
  <CardContent>
    <div class="flex flex-wrap items-center justify-between gap-3">
      <p class="text-sm text-muted-foreground">{t(messages.connectBody)}</p>
      <Button type="button" onclick={onConnect}>{t(agentsListMessages.finishSetup)}</Button>
    </div>
  </CardContent>
</Card>
