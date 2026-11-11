<script lang="ts">
  import { i18n } from '@lingui/core';
  import { createMutation, createQuery } from '@scylla/core-sdk';
  import { ScyllaDialog } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { Button, Checkbox } from '@scylla/ui/primitives';
  import { userName } from '@shared/presentation/ui';
  import {
    OriginTag,
    roleDescription,
    roleMutations,
    roleName,
    roleQueries,
  } from '@base/features/roles';
  import type { UserEntity } from '@base/features/user/domain/entities/user.entity.ts';
  import { userMessages } from '@base/features/user/presentation/messages/user.messages.ts';

  let { user, onClose }: { user: UserEntity | null; onClose: () => void } = $props();

  const rolesQuery = createQuery(() => roleQueries.list(undefined, { enabled: user !== null }));
  const change = createMutation(() => roleMutations.changeInstanceRoles());

  const roles = $derived((rolesQuery.data ?? []).filter(role => role.level === 'platform'));
  const held = $derived(
    new Set((user?.instanceRoles ?? []).map(role => role.key)),
  );

  /** The keys the user changed, on top of what the user holds. */
  let toggled = $state<Set<string>>(new Set());

  const isChecked = (key: string): boolean => held.has(key) !== toggled.has(key);
  const name = $derived(user ? userName(user) : '');
  const chosen = $derived(roles.filter(role => isChecked(role.key)));

  const flip = (key: string) => {
    toggled = toggled.has(key)
      ? new Set([...toggled].filter(other => other !== key))
      : new Set([...toggled, key]);
  };

  const close = () => {
    toggled = new Set();
    onClose();
  };

  const save = () => {
    if (!user) return;
    const changed = roles.filter(role => toggled.has(role.key));
    change.mutate(
      {
        userId: user.id,
        give: changed.filter(role => !held.has(role.key)).map(role => role.grantName),
        takeBack: changed.filter(role => held.has(role.key)).map(role => role.grantName),
      },
      { onSuccess: close },
    );
  };
</script>

<ScyllaDialog
  open={user !== null}
  onOpenChange={open => {
    if (!open) close();
  }}
  title={i18n._(userMessages.instanceRolesOf(name))}
  description={i18n._(userMessages.instanceRolesHint(name))}
  class="sm:max-w-lg"
>
  <div class="flex flex-col gap-2">
    {#each roles as role (role.key)}
      {@const checked = isChecked(role.key)}
      <label
        class="flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors hover:bg-muted/40 {checked
          ? 'border-primary'
          : ''}"
      >
        <Checkbox
          {checked}
          aria-label={roleName(role)}
          onCheckedChange={() => flip(role.key)}
        />
        <span class="flex min-w-0 flex-col gap-1">
          <span class="flex items-center gap-2 text-sm font-medium">
            {roleName(role)}
            <OriginTag builtin={role.builtin} />
          </span>
          <span class="text-xs text-muted-foreground">{roleDescription(role)}</span>
        </span>
      </label>
    {/each}
  </div>

  <div class="mt-4 rounded-xl bg-muted p-3">
    <p class="text-xs font-medium">{t(userMessages.afterYouSave)}</p>
    <p class="mt-1 text-xs text-muted-foreground">
      {chosen.length > 0
        ? i18n._(
            userMessages.afterYouSaveRoles(name, chosen.map(role => roleName(role)).join(', ')),
          )
        : i18n._(userMessages.afterYouSaveNone(name))}
    </p>
  </div>

  <div class="mt-4 flex justify-end gap-2">
    <Button variant="outline" onclick={close}>{t(userMessages.cancel)}</Button>
    <Button disabled={toggled.size === 0 || change.isPending} onclick={save}>
      {t(userMessages.save)}
    </Button>
  </div>
</ScyllaDialog>
