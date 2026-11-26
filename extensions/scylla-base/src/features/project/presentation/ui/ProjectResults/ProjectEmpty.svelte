<script lang="ts">
  import FolderPlusIcon from '@lucide/svelte/icons/folder-plus';
  import SearchIcon from '@lucide/svelte/icons/search';
  import { can, Permission } from '@platform/authz';
  import { scyllaNavigate } from '@platform/context';
  import { Button } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import type { ProjectHealth } from '@base/features/project/domain/structs/project-search.struct.ts';
  import { projectMessages } from '@base/features/project/presentation/messages/project.messages.ts';

  interface Props {
    query: string;
    health: ProjectHealth;
    onClearSearch: () => void;
  }

  let { query, health, onClearSearch }: Props = $props();

  const canCreate = $derived(can(Permission.CREATE_PROJECT));
</script>

<!-- The page with no card: no match for the search, no project of the health, or no project. -->
{#if query || health === 'all'}
  {@const Icon = query ? SearchIcon : FolderPlusIcon}
  <div class="flex justify-center pt-12" data-part="project-empty">
    <section
      class="flex min-h-80 w-full max-w-[720px] flex-col items-center justify-center gap-3 rounded-xl border p-8 text-center"
    >
      <span
        class="flex size-12 items-center justify-center rounded-full bg-muted text-primary"
        aria-hidden="true"
      >
        <Icon class="size-5" />
      </span>
      <h2 class="text-xl">{t(query ? projectMessages.noMatchTitle : projectMessages.emptyTitle)}</h2>
      <p class="max-w-md text-sm text-muted-foreground">
        {t(query ? projectMessages.noMatchBody(query) : projectMessages.emptyBody)}
      </p>
      {#if query}
        <Button variant="outline" onclick={onClearSearch}>{t(projectMessages.clearSearch)}</Button>
      {:else if canCreate}
        <Button onclick={() => scyllaNavigate.goToWorkspaceRoute('/projects/new')}>
          {t(projectMessages.newProject)}
        </Button>
      {/if}
    </section>
  </div>
{:else}
  <p
    class="flex items-center justify-center rounded-xl border border-dashed px-6 py-6 text-center text-sm font-medium text-muted-foreground"
    data-part="project-empty"
  >
    {t(health === 'failed' ? projectMessages.noFailing : projectMessages.noRunning)}
  </p>
{/if}
