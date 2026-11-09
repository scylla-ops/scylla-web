<script lang="ts">
  import type { RoleHolder, RoleLevel } from '../../../../domain/entities/role.entity.ts';
  import type { CatalogArea } from '../../../../domain/structs/catalog.struct.ts';
  import PermissionTable from './PermissionTable.svelte';

  interface Props {
    areas: CatalogArea[];
    level: RoleLevel;
    initial: string[];
    held?: Set<string>;
    holder?: RoleHolder;
    onChange?: (selected: Set<string>) => void;
  }

  let { areas, level, initial, held, holder = 'people', onChange }: Props = $props();

  // svelte-ignore state_referenced_locally
  let selected = $state(new Set(initial));
</script>

<PermissionTable
  {areas}
  {level}
  {holder}
  {selected}
  {held}
  onChange={next => {
    selected = next;
    onChange?.(next);
  }}
/>
