<script lang="ts">
  import LockIcon from '@lucide/svelte/icons/lock';
  import { t } from '@scylla/ui/i18n';
  import { Select, SelectContent, SelectItem, SelectTrigger } from '@scylla/ui/primitives';
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

  const selected = $derived(roles.find(role => role.grantName === value));

  const missingOf = (role: RoleEntity): string[] =>
    held ? missingPermissionIds(role, held, areas) : [];
</script>

<Select type="single" {value} onValueChange={next => onChange(next)}>
  <SelectTrigger class="w-full" aria-label={label}>
    {selected ? roleName(selected) : t(membershipMessages.chooseRole)}
  </SelectTrigger>
  <SelectContent class="max-w-md">
    {#each roles as role (role.key)}
      {@const missing = missingOf(role)}
      <SelectItem value={role.grantName} label={roleName(role)} disabled={missing.length > 0}>
        <span class="flex w-full items-start justify-between gap-3">
          <span class="flex flex-col">
            <span>{roleName(role)}</span>
            <span class="text-xs text-muted-foreground">
              {#if missing.length > 0}
                {t(lockedRole(missing.map(id => permissionLabel(id, areas)).join(', ')))}
              {:else if role.builtin}
                {roleDescription(role)}
              {:else}
                {t(membershipMessages.customRole)}
              {/if}
            </span>
          </span>
          {#if missing.length > 0}
            <LockIcon class="mt-1 size-3.5 shrink-0 text-muted-foreground" />
          {/if}
        </span>
      </SelectItem>
    {/each}
  </SelectContent>
</Select>
