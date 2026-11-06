<script lang="ts">
  import { activeWorkspaceSlug, contextStore, workspaceUrl } from '@platform/context';
  import { navigateTo } from '@scylla/core-sdk';
  import { t } from '@scylla/ui/i18n';
  import { changeIn } from '../../../messages/membership.messages.ts';
  import type { OtherScope } from '../../../presenters/role-choices.presenter.ts';

  interface Props {
    title: string;
    scopes: readonly OtherScope[];
    onClose: () => void;
  }

  let { title, scopes, onClose }: Props = $props();

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
          <span class="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs">{scope.name}</span>
          <span class="truncate">{scope.roles.join(', ')}</span>
        </span>
        <button
          type="button"
          class="shrink-0 text-xs font-medium text-primary hover:underline"
          onclick={() => open(scope)}
        >
          {t(changeIn(scope.name))}
        </button>
      </li>
    {/each}
  </ul>
</section>
