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
    defaultAppIcon,
  } from '@base/features/apps/presentation/presenters/agent-icon.presenter.ts';

  interface Props {
    app: Pick<AppEntity, 'id' | 'name' | 'icon' | 'runner'>;
    close: () => void;
  }

  let { app, close }: Props = $props();

  const setIcon = createMutation(() => appMutations.setIcon());
  const defaults = $derived(defaultAppIcon(app.runner));
  // svelte-ignore state_referenced_locally
  let choice = $state<IconChoice>(agentIconChoice(app.icon, defaultAppIcon(app.runner).color));
  const recent = recentColors();

  const save = async () => {
    const icon = await agentIconChange(choice, app.icon);
    if (!icon) return close();
    setIcon.mutate(
      { appId: app.id, icon },
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
  title={app.name}
  {recent}
  defaultGlyph={defaults.glyph}
  defaultColor={defaults.color}
/>
<DialogFooter>
  <Button variant="outline" data-dialog-dismiss onclick={close}>
    {t(messages.cancel)}
  </Button>
  <Button disabled={setIcon.isPending} aria-busy={setIcon.isPending || undefined} onclick={save}>
    {t(messages.save)}
  </Button>
</DialogFooter>
