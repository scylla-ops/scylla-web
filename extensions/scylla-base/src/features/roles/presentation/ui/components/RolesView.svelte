<script lang="ts">
  import { FeatureHeader } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { createRolesPage, type RolesScope } from '../../roles-page.state.svelte.ts';
  import { rolesMessages } from '../roles.messages.ts';
  import RoleDetailPanel from './RoleDetailPanel.svelte';
  import RoleList from './RoleList.svelte';
  import RoleFormDialog from './role-form/RoleFormDialog.svelte';

  interface Props {
    scope: RolesScope;
  }

  let { scope }: Props = $props();

  const page = createRolesPage(() => scope);
</script>

<!-- The destructive controls still check their own permission: the backend enforces, not the route guard. -->
<div class="flex h-full min-h-0 w-full flex-col gap-4">
  <FeatureHeader
    count={page.roles.length}
    label={t(rolesMessages.role)}
    pluralLabel={t(rolesMessages.roles)}
    newLabel={t(rolesMessages.createRole)}
    onNew={page.canManageRoles ? page.openCreate : undefined}
    {...page.selection.headerProps}
  />

  <div
    class="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]"
  >
    <div class="flex min-h-0 flex-col gap-2 overflow-y-auto pr-1">
      <RoleList {page} />
    </div>

    <div class="min-h-0 rounded-xl border bg-background p-5 shadow-sm">
      <RoleDetailPanel {page} />
    </div>
  </div>

  <RoleFormDialog open={page.formOpen} role={page.editingRole} {scope} onClose={page.closeForm} />
</div>
