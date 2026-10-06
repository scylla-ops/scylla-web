<script lang="ts">
  import {
    Select,
    SelectContent,
    SelectGroup,
    SelectGroupHeading,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from '@scylla/ui/shadcn';
  import { t } from '@scylla/ui/i18n';
  import {
    groupAssignableRoles,
    type AssignableRole,
  } from '../../../assignable-roles.calculator.ts';
  import { membershipMessages } from '../../membership.messages.ts';

  interface Props {
    roles: AssignableRole[];
    /** Names the group of the organization's own roles. */
    organizationName: string;
    disabled: boolean;
    onSelect: (roleId: string) => void;
  }

  let { roles, organizationName, disabled, onSelect }: Props = $props();

  const groups = $derived(groupAssignableRoles(roles));

  /** Back to the placeholder after each pick: the chosen role leaves the list, its id must not stay. */
  let value = $state('');
</script>

<!--
  Adds one role to a listed member. Renders nothing when no role is left.
  The height override keeps the `data-[size=sm]` prefix to win on specificity.
-->
{#if roles.length > 0}
  <Select
    type="single"
    bind:value
    {disabled}
    onValueChange={next => {
      if (!next) return;
      value = '';
      onSelect(next);
    }}
  >
    <SelectTrigger
      size="sm"
      class="w-auto gap-1 border-dashed px-2 text-xs text-muted-foreground data-[size=sm]:h-6"
    >
      <SelectValue placeholder={t(membershipMessages.addRolePlaceholder)} />
    </SelectTrigger>
    <SelectContent>
      {#each groups as group (group.owner)}
        <SelectGroup>
          <SelectGroupHeading>
            {group.owner === 'organization'
              ? t(membershipMessages.organizationRoles(organizationName))
              : t(membershipMessages.platformRoles)}
          </SelectGroupHeading>
          {#each group.roles as role (role.roleId)}
            <SelectItem value={role.roleId} label={role.name}>{role.name}</SelectItem>
          {/each}
        </SelectGroup>
      {/each}
    </SelectContent>
  </Select>
{/if}
