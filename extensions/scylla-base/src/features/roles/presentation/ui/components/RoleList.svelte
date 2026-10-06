<script lang="ts">
  import { t } from '@scylla/ui/i18n';
  import type { RoleEntity } from '../../../domain/entities/role.entity.ts';
  import type { RolesPage } from '../../roles-page.state.svelte.ts';
  import { rolesMessages } from '../roles.messages.ts';
  import RoleListItem from './RoleListItem/RoleListItem.svelte';

  interface Props {
    page: RolesPage;
  }

  let { page }: Props = $props();

  const scope = $derived(page.scope);
</script>

{#snippet rows(roles: RoleEntity[])}
  {#each roles as role (role.id)}
    <RoleListItem
      {role}
      memberCount={page.memberCountOf(role.id)}
      active={role.id === page.activeRoleId}
      selected={page.selection.isSelected(role.id)}
      selectable={page.isSelectable(role)}
      locked={page.isReadOnly(role)}
      onOpen={() => page.open(role.id)}
      onToggleSelect={() => page.selection.select(role.id)}
    />
  {/each}
{/snippet}

{#snippet empty(message: string)}
  <p
    class="rounded-xl border border-dashed border-slate-200 py-10 text-center text-sm text-muted-foreground"
  >
    {message}
  </p>
{/snippet}

{#snippet header(title: string, count: number, caption: string)}
  <div class="flex flex-col gap-0.5 pt-2 pb-1">
    <h2 class="flex items-baseline gap-2 text-sm font-semibold text-foreground">
      {title}
      <span class="text-xs font-medium text-muted-foreground">{count}</span>
    </h2>
    <p class="text-xs text-muted-foreground">{caption}</p>
  </div>
{/snippet}

{#if scope.kind === 'organization'}
  <section class="flex flex-col gap-2" aria-label={t(rolesMessages.organizationRoles(scope.organizationName))}>
    {@render header(
      t(rolesMessages.organizationRoles(scope.organizationName)),
      page.groups.organization.length,
      t(rolesMessages.organizationRolesCaption(scope.organizationName)),
    )}
    {#if page.groups.organization.length === 0}
      {@render empty(t(rolesMessages.noOrganizationRoles(scope.organizationName)))}
    {:else}
      {@render rows(page.groups.organization)}
    {/if}
  </section>
  <section class="flex flex-col gap-2" aria-label={t(rolesMessages.platformRoles)}>
    {@render header(
      t(rolesMessages.platformRoles),
      page.groups.platform.length,
      t(rolesMessages.platformRolesCaption),
    )}
    {@render rows(page.groups.platform)}
  </section>
{:else if page.roles.length === 0}
  {@render empty(t(rolesMessages.noRoles))}
{:else}
  {@render rows(page.roles)}
{/if}
