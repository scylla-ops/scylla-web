<script lang="ts">
  import ShieldCheckIcon from '@lucide/svelte/icons/shield-check';
  import { DialogDescription, DialogHeader, DialogTitle } from '@scylla/ui/shadcn';
  import { ScyllaDialog } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import type { RoleEntity } from '../../../../domain/entities/role.entity.ts';
  import type { RolesScope } from '../../../roles-page.state.svelte.ts';
  import { rolesMessages } from '../../roles.messages.ts';
  import RoleForm from './RoleForm.svelte';

  interface Props {
    open: boolean;
    /** `null` when creating. */
    role: RoleEntity | null;
    /** Whose role it is: an organization's, or the platform's. */
    scope: RolesScope;
    onClose: () => void;
  }

  let { open, role, scope, onClose }: Props = $props();

  const subtitle = $derived(
    scope.kind === 'organization'
      ? t(rolesMessages.organizationRoleSubtitle(scope.organizationName))
      : t(rolesMessages.platformRoleSubtitle),
  );
</script>

<ScyllaDialog
  {open}
  onOpenChange={next => {
    if (!next) onClose();
  }}
  class="flex max-h-[85vh] max-w-xl flex-col"
>
  {#snippet header()}
    <DialogHeader class="space-y-3">
      <DialogTitle class="flex items-center gap-2.5 text-lg font-semibold">
        <div class="flex size-8 items-center justify-center rounded-lg bg-primary/10">
          <ShieldCheckIcon class="size-4 text-primary" />
        </div>
        <span>{role ? t(rolesMessages.editRoleTitle) : t(rolesMessages.createRole)}</span>
      </DialogTitle>
      <DialogDescription>{subtitle}</DialogDescription>
    </DialogHeader>
  {/snippet}
  <RoleForm {role} {scope} onDone={onClose} />
</ScyllaDialog>
