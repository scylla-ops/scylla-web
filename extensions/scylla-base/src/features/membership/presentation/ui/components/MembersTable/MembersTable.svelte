<script lang="ts">
  import EllipsisIcon from '@lucide/svelte/icons/ellipsis';
  import { t } from '@scylla/ui/i18n';
  import {
    Button,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    Skeleton,
    Table,
    TableBody,
    TableCell,
    TableFrame,
    TableHead,
    TableHeader,
    TableRow,
  } from '@scylla/ui/primitives';
  import { Identity } from '@shared/presentation/ui';
  import type { UserSummary } from '@base/features/user';
  import { membershipMessages } from '../../../messages/membership.messages.ts';
  import { allProjectsRoleLabel, memberRoleName } from '../../../presenters/member-role-name.ts';
  import { memberProfile, type MemberRow } from '../../../presenters/member-rows.presenter.ts';

  interface Props {
    rows: readonly MemberRow[];
    isLoading: boolean;
    userFor: (id: string) => UserSummary | undefined;
    /** The person who reads the page. */
    selfId?: string;
    canManage: boolean;
    onOpen: (row: MemberRow) => void;
    onChangeRoles: (row: MemberRow) => void;
    onRemove: (row: MemberRow) => void;
  }

  let { rows, isLoading, userFor, selfId, canManage, onOpen, onChangeRoles, onRemove }: Props =
    $props();

  const dateFormat = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' });
  const chipClass =
    'whitespace-nowrap rounded-full border bg-muted px-2.5 py-0.5 text-xs font-medium';
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
  <TableFrame>
    <Table class="min-w-[840px]">
      <TableHeader>
        <TableRow>
          <TableHead>{t(membershipMessages.member)}</TableHead>
          <TableHead>{t(membershipMessages.workspaceRolesColumn)}</TableHead>
          <TableHead>{t(membershipMessages.projectRoles)}</TableHead>
          <TableHead class="w-24">{t(membershipMessages.added)}</TableHead>
          <TableHead class="w-12"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {#each rows as row (row.actorId)}
          <TableRow>
            <TableCell>
              <button type="button" class="text-left" onclick={() => onOpen(row)}>
                <Identity
                  profile={userFor(row.actorId) ?? memberProfile(row)}
                  kind={row.kind}
                  self={row.actorId === selfId}
                />
              </button>
            </TableCell>
            <TableCell class="whitespace-normal">
              <div class="flex flex-wrap gap-1.5">
                {#each row.workspaceRoles as role (role.role)}
                  <span class={chipClass}>{memberRoleName(role)}</span>
                {/each}
              </div>
            </TableCell>
            <TableCell class="whitespace-normal">
              <div class="flex flex-wrap gap-1.5">
                {#if row.allProjectsRoleKey}
                  <span class={chipClass}>{allProjectsRoleLabel(row.allProjectsRoleKey)}</span>
                {:else if row.projectRoles.length === 0}
                  <span class="text-xs text-muted-foreground">
                    {t(membershipMessages.noProjectRole)}
                  </span>
                {/if}
                {#each row.projectRoles as role (`${role.scopeId}-${role.role}`)}
                  <span class="whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium">
                    {role.scopeName} · {memberRoleName(role)}
                  </span>
                {/each}
              </div>
            </TableCell>
            <TableCell class="text-xs text-muted-foreground">
              {row.addedAt ? dateFormat.format(row.addedAt) : '—'}
            </TableCell>
            <TableCell>
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
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onSelect={() => onRemove(row)}>
                      {t(membershipMessages.removeFromWorkspace)}
                    </DropdownMenuItem>
                  {/if}
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        {/each}
      </TableBody>
    </Table>
  </TableFrame>
{/if}
