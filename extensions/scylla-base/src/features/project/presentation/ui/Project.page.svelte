<script lang="ts">
  import { contextStore } from '@platform/context';
  import { toRune } from '@scylla/ui/stores';
  import { t } from '@scylla/ui/i18n';
  import ProjectList from './ProjectList.svelte';
  import { projectMessages } from '../messages/project.messages.ts';

  const context = toRune(contextStore);
  const workspaceId = $derived(context().workspace.id);
</script>

{#if !workspaceId}
  <div class="flex h-full items-center justify-center">
    <div class="space-y-2 text-center">
      <h2 class="text-lg text-muted-foreground">
        {t(projectMessages.noWorkspace)}
      </h2>
      <p class="text-sm text-muted-foreground">{t(projectMessages.noWorkspaceHint)}</p>
    </div>
  </div>
{:else}
  <!-- Keyed on the workspace: the page number resets on a switch. -->
  {#key workspaceId}
    <ProjectList {workspaceId} />
  {/key}
{/if}
