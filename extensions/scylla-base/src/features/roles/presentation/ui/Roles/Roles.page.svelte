<script lang="ts">
  import { contextStore } from '@platform/context';
  import { toRune } from '@scylla/ui/stores';
  import type { RolesScope } from '../../roles-page.state.svelte.ts';
  import RolesView from '../components/RolesView.svelte';

  const context = toRune(contextStore);

  const organizationId = $derived(context().organization.id);
  const scope = $derived<RolesScope>({
    kind: 'organization',
    organizationId,
    organizationName: context().organization.name ?? '',
  });
</script>

<!-- Keyed on the organization: the selection and the open role belong to one. -->
{#key organizationId}
  <RolesView {scope} />
{/key}
