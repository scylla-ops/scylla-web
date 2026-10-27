<script lang="ts">
  import ShieldCheckIcon from '@lucide/svelte/icons/shield-check';
  import { ErrorState } from '@scylla/ui';
  import { Skeleton } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import type { RolesScope } from '@base/features/roles/presentation/ui/components/roles-page.state.svelte.ts';
  import { rolesMessages } from '@base/features/roles/presentation/messages/roles.messages.ts';
  import RoleForm from '../RoleForm.svelte';
  import { createRoleEditorView } from './role-editor-view.state.svelte.ts';

  interface Props {
    scope: RolesScope;
    /** Absent when creating. */
    roleId?: string;
  }

  let { scope, roleId }: Props = $props();

  const editor = createRoleEditorView(
    () => scope,
    () => roleId,
  );

  const subtitle = $derived(
    scope.kind === 'organization'
      ? t(rolesMessages.organizationRoleSubtitle(scope.organizationName))
      : t(rolesMessages.platformRoleSubtitle),
  );
</script>

<div class="flex h-full min-h-0 w-full flex-col gap-6">
  <header class="flex shrink-0 items-start gap-3">
    <div class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
      <ShieldCheckIcon class="size-5 text-primary" />
    </div>
    <div class="flex min-w-0 flex-col gap-1">
      <h1 class="text-2xl font-semibold">
        {editor.isEdit ? t(rolesMessages.editRoleTitle) : t(rolesMessages.newRole)}
      </h1>
      <p class="text-sm text-muted-foreground">{subtitle}</p>
    </div>
  </header>

  {#if editor.isLoading}
    <Skeleton class="h-96 w-full rounded-xl" />
  {:else if editor.isUnavailable}
    <ErrorState message={t(rolesMessages.roleNotEditable)} />
  {:else}
    <RoleForm role={editor.role} {scope} onCancel={editor.leave} onSaved={editor.leave} />
  {/if}
</div>
