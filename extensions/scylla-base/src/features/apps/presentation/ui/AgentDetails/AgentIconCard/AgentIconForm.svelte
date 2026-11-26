<script lang="ts">
  import { createMutation } from '@scylla/core-sdk';
  import { IconPicker, type IconChoice } from '@scylla/ui';
  import { Button, DialogFooter } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { keepRecentColor, recentColors } from '@base/features/project';
  import type { AppEntity } from '@base/features/apps/domain/entities/app.entity.ts';
  import { appMutations } from '@base/features/apps/presentation/apps.queries.ts';
  import { agentPageMessages as messages } from '@base/features/apps/presentation/messages/agent-page.messages.ts';
  import {
    agentIconChange,
    agentIconChoice,
    DEFAULT_AGENT_COLOR,
    DEFAULT_AGENT_GLYPH,
  } from '@base/features/apps/presentation/presenters/agent-icon.presenter.ts';

  interface Props {
    agent: Pick<AppEntity, 'id' | 'name' | 'icon'>;
    close: () => void;
  }

  let { agent, close }: Props = $props();

  const setIcon = createMutation(() => appMutations.setIcon());
  // svelte-ignore state_referenced_locally
  let choice = $state<IconChoice>(agentIconChoice(agent.icon));
  const recent = recentColors();

  const save = async () => {
    const icon = await agentIconChange(choice, agent.icon);
    if (!icon) return close();
    setIcon.mutate(
      { appId: agent.id, icon },
      {
        onSuccess: () => {
          if (icon.kind === 'glyph') keepRecentColor(icon.color);
          close();
        },
      },
    );
  };
</script>

<IconPicker
  value={choice}
  onchange={next => (choice = next)}
  title={agent.name}
  {recent}
  defaultGlyph={DEFAULT_AGENT_GLYPH}
  defaultColor={DEFAULT_AGENT_COLOR}
/>
<DialogFooter>
  <Button variant="outline" data-dialog-dismiss onclick={close}>
    {t(messages.cancel)}
  </Button>
  <Button disabled={setIcon.isPending} aria-busy={setIcon.isPending || undefined} onclick={save}>
    {t(messages.save)}
  </Button>
</DialogFooter>
