<script lang="ts">
  import LockIcon from '@lucide/svelte/icons/lock';
  import { SearchSelect, type SearchSelectOption } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import {
    missingPermissionIds,
    permissionLabel,
    roleDescription,
    roleName,
    type CatalogArea,
    type RoleEntity,
  } from '@base/features/roles';
  import { lockedRole, membershipMessages } from '../../../messages/membership.messages.ts';

  interface Props {
    roles: readonly RoleEntity[];
    value: string;
    /** What the caller holds on the object. Absent: nothing locks yet. */
    held?: ReadonlySet<string>;
    areas: readonly CatalogArea[];
    label: string;
    onChange: (grantName: string) => void;
  }

  let { roles, value, held, areas, label, onChange }: Props = $props();

  const missingOf = (role: RoleEntity): string[] =>
    held ? missingPermissionIds(role, held, areas) : [];

  const hintOf = (role: RoleEntity, missing: readonly string[]): string => {
    if (missing.length > 0) return t(lockedRole(missing.map(id => permissionLabel(id, areas)).join(', ')));
    return role.builtin ? roleDescription(role) : t(membershipMessages.customRole);
  };

  const options = $derived(
    roles.map(role => {
      const missing = missingOf(role);
      return {
        value: role.grantName,
        label: roleName(role),
        hint: hintOf(role, missing),
        disabled: missing.length > 0,
      };
    }),
  );
</script>

{#snippet roleRow(option: SearchSelectOption)}
  <span class="flex w-full items-start justify-between gap-3">
    <span class="flex flex-col">
      <span>{option.label}</span>
      <span class="text-xs text-muted-foreground">{option.hint}</span>
    </span>
    {#if option.disabled}
      <LockIcon class="mt-1 size-3.5 shrink-0 text-muted-foreground" />
    {/if}
  </span>
{/snippet}

<SearchSelect
  {options}
  {value}
  onValueChange={onChange}
  row={roleRow}
  contentClass="max-w-md"
  placeholder={t(membershipMessages.chooseRole)}
  aria-label={label}
/>
