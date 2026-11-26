<script lang="ts">
  import PaletteIcon from '@lucide/svelte/icons/palette';
  import { createMutation } from '@scylla/core-sdk';
  import { ScyllaDialog } from '@scylla/ui';
  import {
    Button,
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
  } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { IdentityAvatar } from '@shared/presentation/ui';
  import type { AppEntity } from '@base/features/apps/domain/entities/app.entity.ts';
  import { appMutations } from '@base/features/apps/presentation/apps.queries.ts';
  import { agentPageMessages as messages } from '@base/features/apps/presentation/messages/agent-page.messages.ts';
  import { agentProfile } from '@base/features/apps/presentation/presenters/agent-icon.presenter.ts';
  import AgentIconForm from './AgentIconForm.svelte';

  interface Props {
    /** Only the admins of the workspace see the card: `set_app_icon`. */
    agent: Pick<AppEntity, 'id' | 'name' | 'icon'>;
  }

  let { agent }: Props = $props();

  const reset = createMutation(() => appMutations.setIcon());
  let open = $state(false);
</script>

<Card>
  <CardHeader>
    <CardTitle><h2>{t(messages.icon)}</h2></CardTitle>
    <CardDescription>{t(messages.iconDescription)}</CardDescription>
  </CardHeader>
  <CardContent class="flex items-center gap-4">
    <IdentityAvatar profile={agentProfile(agent)} kind="agent" size={48} />
    <div class="flex min-w-0 flex-col gap-1.5">
      <div class="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onclick={() => (open = true)}>
          <PaletteIcon class="size-4" aria-hidden="true" />
          {t(messages.changeIcon)}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={!agent.icon || reset.isPending}
          onclick={() => reset.mutate({ appId: agent.id, icon: { kind: 'default' } })}
        >
          {t(messages.resetIcon)}
        </Button>
      </div>
      <p class="text-xs text-muted-foreground">{t(messages.iconHint)}</p>
    </div>
  </CardContent>
</Card>

<!-- The form is built again at each opening: it starts on the icon of the agent. -->
<ScyllaDialog
  {open}
  onOpenChange={next => (open = next)}
  title={t(messages.icon)}
  description={t(messages.iconDialogDescription)}
  class="sm:max-w-lg"
>
  <AgentIconForm {agent} close={() => (open = false)} />
</ScyllaDialog>
