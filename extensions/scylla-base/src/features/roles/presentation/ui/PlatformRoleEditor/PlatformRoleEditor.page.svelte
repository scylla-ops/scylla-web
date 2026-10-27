<script lang="ts">
  import RoleEditorView from '../components/role-form/RoleEditorView/RoleEditorView.svelte';

  interface Props {
    /** Absent when creating. */
    roleId?: string;
  }

  let { roleId }: Props = $props();
</script>

<RoleEditorView scope={{ kind: 'platform' }} {roleId} />
