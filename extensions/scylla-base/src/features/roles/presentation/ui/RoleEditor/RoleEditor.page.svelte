<script lang="ts">
  import { contextStore } from '@platform/context';
  import { toRune } from '@scylla/ui/stores';
  import type { RolesScope } from '../components/roles-page.state.svelte.ts';
  import RoleEditorView from '../components/role-form/RoleEditorView/RoleEditorView.svelte';

  interface Props {
    /** Absent when creating. */
    roleId?: string;
  }

  let { roleId }: Props = $props();

  const context = toRune(contextStore);

  const organizationId = $derived(context().organization.id);
  const scope = $derived<RolesScope>({
    kind: 'organization',
    organizationId,
    organizationName: context().organization.name ?? '',
  });
</script>

<!-- Keyed on the organization: a role belongs to one. -->
{#key organizationId}
  <RoleEditorView {scope} {roleId} />
{/key}
