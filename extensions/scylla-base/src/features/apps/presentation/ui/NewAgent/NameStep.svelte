<script lang="ts">
  import { IconField, type IconChoice } from '@scylla/ui';
  import { Button, Input, Label } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { recentColors } from '@base/features/project';
  import ProjectChooser from '../components/ProjectChooser/ProjectChooser.svelte';
  import { addAgentMessages as messages } from '@base/features/apps/presentation/messages/add-agent.messages.ts';
  import {
    DEFAULT_AGENT_COLOR,
    DEFAULT_AGENT_GLYPH,
  } from '@base/features/apps/presentation/presenters/agent-icon.presenter.ts';

  interface Props {
    workspaceId: string;
    name: string;
    icon: IconChoice;
    /** Only the admins of the workspace give an icon: `set_app_icon`. */
    canSetIcon: boolean;
    /** Empty: each project of the workspace. */
    projectIds: string[];
    someProjects: boolean;
    canAdd: boolean;
    onAdd: () => void;
  }

  let {
    workspaceId,
    name = $bindable(),
    icon = $bindable(),
    canSetIcon,
    projectIds = $bindable(),
    someProjects = $bindable(),
    canAdd,
    onAdd,
  }: Props = $props();

  const recent = recentColors();
</script>

<form
  class="flex flex-col gap-6"
  data-tour="add-agent-form"
  onsubmit={event => {
    event.preventDefault();
    onAdd();
  }}
>
  {#if canSetIcon}
    <IconField
      value={icon}
      onchange={next => (icon = next)}
      {recent}
      defaultGlyph={DEFAULT_AGENT_GLYPH}
      defaultColor={DEFAULT_AGENT_COLOR}
      avatar
    />
  {/if}

  <div class="flex max-w-sm flex-col gap-1.5">
    <Label for="agent-name">{t(messages.name)}</Label>
    <Input
      id="agent-name"
      bind:value={name}
      placeholder={t(messages.namePlaceholder)}
      autocomplete="off"
    />
  </div>

  <ProjectChooser {workspaceId} bind:someProjects bind:projectIds />

  <Button type="submit" class="self-start" disabled={!canAdd}>{t(messages.add)}</Button>
</form>
