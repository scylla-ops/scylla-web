<script lang="ts">
  import { slide } from 'svelte/transition';
  import FolderIcon from '@lucide/svelte/icons/folder';
  import { createQuery } from '@scylla/core-sdk';
  import {
    Button,
    Input,
    Label,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
  } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { PROJECT_ROLES, roleLabel, rolesOf } from '@base/features/access';
  import { projectQueries } from '@base/features/project';
  import { credentialsMessages as messages } from '@base/features/apps/presentation/messages/credentials.messages.ts';

  interface Props {
    workspaceId: string;
    workspaceName: string;
    name: string;
    workspaceRole: string;
    /** By project id. An empty role: none. */
    projectRoles: Record<string, string>;
  }

  let {
    workspaceId,
    workspaceName,
    name = $bindable(),
    workspaceRole = $bindable(),
    projectRoles = $bindable(),
  }: Props = $props();

  const projects = createQuery(() => projectQueries.lookup(workspaceId));
  const WORKSPACE_CHOICES = rolesOf('workspace');

  let showProjects = $state(false);
  const projectCount = $derived(Object.values(projectRoles).filter(Boolean).length);
  const noRole = $derived(t(messages.noRole));
  const labelOf = (role: string) => (role ? roleLabel(role) : noRole);
</script>

<div class="flex flex-col gap-4">
  <div class="flex flex-col gap-1.5">
    <Label for="app-name">{t(messages.name)}</Label>
    <Input
      id="app-name"
      bind:value={name}
      placeholder={t(messages.namePlaceholder)}
      autocomplete="off"
    />
  </div>

  <div class="flex flex-col gap-1.5">
    <Label for="app-role">{t(messages.roleIn(workspaceName))}</Label>
    <Select type="single" value={workspaceRole} onValueChange={value => (workspaceRole = value)}>
      <SelectTrigger id="app-role" class="w-full">{labelOf(workspaceRole)}</SelectTrigger>
      <SelectContent>
        {#each WORKSPACE_CHOICES as role (role)}
          <SelectItem value={role} label={roleLabel(role)}>{roleLabel(role)}</SelectItem>
        {/each}
      </SelectContent>
    </Select>
  </div>

  <div class="flex items-center justify-between gap-2 text-xs text-muted-foreground">
    <span class="flex items-center gap-2">
      <FolderIcon class="size-4" aria-hidden="true" />
      {projectCount === 0 ? t(messages.noProjectRoles) : t(messages.someProjectRoles(projectCount))}
    </span>
    <Button
      type="button"
      variant="link"
      size="sm"
      class="h-auto p-0 text-xs"
      aria-expanded={showProjects}
      onclick={() => (showProjects = !showProjects)}
    >
      {t(messages.addProjectRoles)}
    </Button>
  </div>
  {#if showProjects}
    <ul class="relative flex max-h-48 flex-col gap-2 overflow-y-auto" transition:slide={{ duration: 200 }}>
      {#each projects.data?.items ?? [] as project (project.id)}
        <li class="flex items-center justify-between gap-3 text-sm">
          <span class="truncate">{project.name}</span>
          <Select
            type="single"
            value={projectRoles[project.id] ?? ''}
            onValueChange={value => (projectRoles = { ...projectRoles, [project.id]: value })}
          >
            <SelectTrigger class="w-36" aria-label={project.name}>
              {labelOf(projectRoles[project.id] ?? '')}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="" label={noRole}>{noRole}</SelectItem>
              {#each PROJECT_ROLES as role (role)}
                <SelectItem value={role} label={roleLabel(role)}>{roleLabel(role)}</SelectItem>
              {/each}
            </SelectContent>
          </Select>
        </li>
      {/each}
    </ul>
  {/if}
  <p class="text-xs text-muted-foreground">{t(messages.rolesHint)}</p>
</div>
