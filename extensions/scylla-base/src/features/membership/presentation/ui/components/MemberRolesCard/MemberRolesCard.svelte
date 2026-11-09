<script lang="ts">
  import type { MemberRoleEntity } from '@base/features/access';
  import { t } from '@scylla/ui/i18n';
  import { membershipMessages } from '../../../messages/membership.messages.ts';
  import { memberRoleName } from '../../../presenters/member-role-name.ts';
  import { memberScopes } from '../../../presenters/member-scopes.presenter.ts';
  import { SCOPE_KINDS } from '../scope-kinds.registry.ts';

  interface Props {
    roles: readonly MemberRoleEntity[];
    workspaceName: string;
  }

  let { roles, workspaceName }: Props = $props();

  const scopes = $derived(memberScopes(roles, workspaceName));
</script>

{#snippet scopeHeader(kind: MemberRoleEntity['scopeKind'], name: string)}
  {@const Icon = SCOPE_KINDS[kind].icon}
  <div class="flex items-center gap-2.5">
    <span
      class="flex shrink-0 items-center justify-center rounded-lg border bg-muted {kind ===
      'workspace'
        ? 'size-8'
        : 'size-7'}"
    >
      <Icon class={kind === 'workspace' ? 'size-4' : 'size-3.5'} aria-hidden="true" />
    </span>
    <div class="min-w-0">
      <h3 class="truncate text-sm">{name}</h3>
      <p class="text-xs text-muted-foreground">{t(SCOPE_KINDS[kind].label)}</p>
    </div>
  </div>
{/snippet}

{#snippet roleList(scopeRoles: readonly MemberRoleEntity[])}
  {#if scopeRoles.length === 0}
    <p class="text-xs text-muted-foreground">{t(membershipMessages.noRole)}</p>
  {:else}
    <ul class="flex flex-col gap-1.5">
      {#each scopeRoles as role (role.role)}
        <li class="flex items-center justify-between gap-2 text-xs">
          <span class="rounded-full border bg-muted px-2.5 py-0.5 font-medium">
            {memberRoleName(role)}
          </span>
          <span class="text-muted-foreground">{t(membershipMessages.direct)}</span>
        </li>
      {/each}
    </ul>
  {/if}
{/snippet}

<aside class="rounded-2xl border bg-card">
  <div class="border-b p-5">
    <h2>{t(membershipMessages.theirRoles)}</h2>
    <p class="mt-1 text-xs text-muted-foreground">{t(membershipMessages.theirRolesHint)}</p>
  </div>
  <section class="p-5" aria-label={scopes.workspace.name}>
    {@render scopeHeader('workspace', scopes.workspace.name)}
    <div class="mt-2 ml-4 flex flex-col gap-4 border-l pl-4">
      {@render roleList(scopes.workspace.roles)}
      {#each scopes.projects as project (project.id)}
        <section aria-label={project.name}>
          {@render scopeHeader('project', project.name)}
          <div class="mt-2 ml-3.5 border-l pl-4">
            {@render roleList(project.roles)}
          </div>
        </section>
      {/each}
    </div>
  </section>
</aside>
