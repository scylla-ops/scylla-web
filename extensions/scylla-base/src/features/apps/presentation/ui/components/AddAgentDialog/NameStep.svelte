<script lang="ts">
  import FolderIcon from '@lucide/svelte/icons/folder';
  import { Button, Input, Label } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import ProjectChooser from '../ProjectChooser/ProjectChooser.svelte';
  import { addAgentMessages as messages } from '@base/features/apps/presentation/messages/add-agent.messages.ts';

  interface Props {
    workspaceId: string;
    name: string;
    /** Empty: each project of the workspace. */
    projectIds: string[];
    /** `true` once the user chose some projects: the list of projects shows. */
    someProjects: boolean;
  }

  let {
    workspaceId,
    name = $bindable(),
    projectIds = $bindable(),
    someProjects = $bindable(),
  }: Props = $props();

  let changing = $state(false);
</script>

<div class="flex flex-col gap-4">
  <div class="flex flex-col gap-1.5">
    <Label for="agent-name">{t(messages.name)}</Label>
    <Input
      id="agent-name"
      bind:value={name}
      placeholder={t(messages.namePlaceholder)}
      autocomplete="off"
    />
  </div>

  {#if !changing && !someProjects}
    <div class="flex items-center justify-between gap-2 text-xs text-muted-foreground">
      <span class="flex items-center gap-2">
        <FolderIcon class="size-4" aria-hidden="true" />
        {t(messages.allProjectsLine)}
      </span>
      <Button
        type="button"
        variant="link"
        size="sm"
        class="h-auto p-0"
        onclick={() => (changing = true)}
      >
        {t(messages.change)}
      </Button>
    </div>
  {:else}
    <ProjectChooser
      {workspaceId}
      bind:someProjects
      bind:projectIds
      hint={someProjects ? t(messages.someProjectsHint) : undefined}
    />
  {/if}
</div>
