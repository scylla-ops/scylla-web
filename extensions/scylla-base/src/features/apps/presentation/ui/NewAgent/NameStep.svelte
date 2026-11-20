<script lang="ts">
  import { Button, Input, Label } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import ProjectChooser from '../components/ProjectChooser/ProjectChooser.svelte';
  import { addAgentMessages as messages } from '@base/features/apps/presentation/messages/add-agent.messages.ts';

  interface Props {
    workspaceId: string;
    name: string;
    /** Empty: each project of the workspace. */
    projectIds: string[];
    someProjects: boolean;
    canAdd: boolean;
    onAdd: () => void;
  }

  let {
    workspaceId,
    name = $bindable(),
    projectIds = $bindable(),
    someProjects = $bindable(),
    canAdd,
    onAdd,
  }: Props = $props();
</script>

<form
  class="flex flex-col gap-6"
  data-tour="add-agent-form"
  onsubmit={event => {
    event.preventDefault();
    onAdd();
  }}
>
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
