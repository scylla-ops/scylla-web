<script lang="ts">
  import EllipsisIcon from '@lucide/svelte/icons/ellipsis';
  import { t } from '@scylla/ui/i18n';
  import {
    Button,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    Skeleton,
  } from '@scylla/ui/primitives';
  import { UserIdentity } from '@shared/presentation/ui';
  import type { UserSummary } from '@base/features/user';
  import { membershipMessages } from '../../../messages/membership.messages.ts';
  import { memberRoleName } from '../../../presenters/member-role-name.ts';
  import { memberProfile, type MemberRow } from '../../../presenters/member-rows.presenter.ts';

  interface Props {
    rows: readonly MemberRow[];
    isLoading: boolean;
    userFor: (id: string) => UserSummary | undefined;
    canManage: boolean;
    onOpen: (row: MemberRow) => void;
    onChangeRoles: (row: MemberRow) => void;
    onRemove: (row: MemberRow) => void;
  }

  let { rows, isLoading, userFor, canManage, onOpen, onChangeRoles, onRemove }: Props = $props();

  const dateFormat = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' });
  const chipClass = 'rounded-full border bg-muted px-2.5 py-0.5 text-xs font-medium';
</script>

{#if isLoading}
  <div role="status" aria-busy="true" class="flex flex-col gap-2">
    {#each [0, 1, 2] as index (index)}
      <Skeleton class="h-14 w-full rounded-xl" />
    {/each}
  </div>
{:else if rows.length === 0}
  <p class="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
    {t(membershipMessages.workspaceEmpty)}
  </p>
{:else}
  <div class="relative overflow-x-auto rounded-xl border bg-card">
    <table class="w-full min-w-[840px] border-collapse text-sm">
      <thead>
        <tr class="text-left text-xs text-muted-foreground">
          <th class="px-6 py-3 font-medium">{t(membershipMessages.member)}</th>
          <th class="px-3 py-3 font-medium">{t(membershipMessages.workspaceRolesColumn)}</th>
          <th class="px-3 py-3 font-medium">{t(membershipMessages.projectRoles)}</th>
          <th class="w-24 px-3 py-3 font-medium">{t(membershipMessages.added)}</th>
          <th class="w-12"></th>
        </tr>
      </thead>
      <tbody>
        {#each rows as row (row.actorId)}
          <tr class="border-t">
            <td class="px-6 py-3">
              <button type="button" class="text-left" onclick={() => onOpen(row)}>
                <UserIdentity
                  user={userFor(row.actorId) ?? memberProfile(row)}
                />
              </button>
            </td>
            <td class="px-3 py-3">
              <div class="flex flex-wrap gap-1.5">
                {#each row.workspaceRoles as role (role.role)}
                  <span class={chipClass}>{memberRoleName(role)}</span>
                {/each}
              </div>
            </td>
            <td class="px-3 py-3">
              <div class="flex flex-wrap gap-1.5">
                {#if row.adminOfEachProject}
                  <span class="text-xs text-muted-foreground">
                    {t(membershipMessages.everyProjectAsAdmin)}
                  </span>
                {:else if row.projectRoles.length === 0}
                  <span class="text-xs text-muted-foreground">
                    {t(membershipMessages.noProjectRole)}
                  </span>
                {/if}
                {#each row.projectRoles as role (`${role.scopeId}-${role.role}`)}
                  <span class="rounded-full border px-2.5 py-0.5 text-xs font-medium">
                    {role.scopeName} · {memberRoleName(role)}
                  </span>
                {/each}
              </div>
            </td>
            <td class="px-3 py-3 text-xs text-muted-foreground">
              {row.addedAt ? dateFormat.format(row.addedAt) : '—'}
            </td>
            <td class="pr-3">
              <DropdownMenu>
                <DropdownMenuTrigger>
                  {#snippet child({ props })}
                    <Button
                      {...props}
                      variant="ghost"
                      size="icon"
                      aria-label={t(membershipMessages.memberActions)}
                    >
                      <EllipsisIcon class="size-4" />
                    </Button>
                  {/snippet}
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => onOpen(row)}>
                    {t(membershipMessages.seeAccess)}
                  </DropdownMenuItem>
                  {#if canManage}
                    <DropdownMenuItem onSelect={() => onChangeRoles(row)}>
                      {t(membershipMessages.changeRoles)}
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => onRemove(row)}>
                      {t(membershipMessages.removeFromWorkspace)}
                    </DropdownMenuItem>
                  {/if}
                </DropdownMenuContent>
              </DropdownMenu>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}
