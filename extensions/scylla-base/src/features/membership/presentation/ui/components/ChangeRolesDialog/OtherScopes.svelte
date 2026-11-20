<script lang="ts">
  import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
  import { Permission, can } from '@platform/authz';
  import { activeWorkspaceSlug, contextStore, workspaceUrl } from '@platform/context';
  import { navigateTo } from '@scylla/core-sdk';
  import { t } from '@scylla/ui/i18n';
  import { changeIn } from '../../../messages/membership.messages.ts';
  import type { OtherScope } from '../../../presenters/role-choices.presenter.ts';
  import ScopeLabel from '../ScopeLabel.svelte';

  interface Props {
    title: string;
    scopes: readonly OtherScope[];
    onClose: () => void;
  }

  let { title, scopes, onClose }: Props = $props();

  /** The members page of the scope: the link shows only when the user may open it. */
  const canOpen = (scope: OtherScope) =>
    scope.kind === 'workspace'
      ? can(Permission.LIST_WORKSPACE_MEMBERS)
      : can(Permission.LIST_PROJECT_MEMBERS, { projectId: scope.id });

  const open = (scope: OtherScope) => {
    const slug = activeWorkspaceSlug() ?? '';
    onClose();
    if (scope.kind === 'workspace') {
      navigateTo(workspaceUrl(slug, 'access/members'));
      return;
    }
    contextStore.getState().setProject(scope.id, scope.name);
    navigateTo(workspaceUrl(slug, `projects/${scope.id}/members`));
  };
</script>

<section class="flex flex-col gap-2">
  <h3 class="text-sm">{title}</h3>
  <ul class="flex flex-col gap-1.5">
    {#each scopes as scope (scope.id)}
      <li class="flex items-center justify-between gap-3 text-sm">
        <span class="flex min-w-0 items-center gap-2">
          <ScopeLabel kind={scope.kind} name={scope.name} />
          <ChevronRightIcon class="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span class="truncate">{scope.roles.join(', ')}</span>
        </span>
        {#if canOpen(scope)}
          <button
            type="button"
            class="shrink-0 text-xs font-medium text-primary hover:underline"
            onclick={() => open(scope)}
          >
            {t(changeIn(scope.name))}
          </button>
        {/if}
      </li>
    {/each}
  </ul>
</section>
