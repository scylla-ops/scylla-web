<script lang="ts">
  import BotIcon from '@lucide/svelte/icons/bot';
  import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';
  import UserRoundIcon from '@lucide/svelte/icons/user-round';
  import { createMutation, createQuery, navigateTo } from '@scylla/core-sdk';
  import { accessQueries, platformRef, workspaceRef } from '@base/features/access';
  import { t } from '@scylla/ui/i18n';
  import { SegmentedControl } from '@scylla/ui';
  import { Button, Input, Label } from '@scylla/ui/primitives';
  import { untrack } from 'svelte';
  import { ScyllaError } from '@shared/utils/scylla-error.ts';
  import type { RoleEntity, RoleLevel } from '../../../domain/entities/role.entity.ts';
  import { permissionsFor } from '../../../domain/structs/catalog.struct.ts';
  import {
    copiedFrom,
    holderHints,
    holderLabels,
    missingPermissions,
    nameTaken,
    permissionLabel,
    removePermission,
    rolesMessages,
    selectedOf,
  } from '../../messages/roles.messages.ts';
  import { copySources } from '../../presenters/role-copy.presenter.ts';
  import { roleName } from '../../role-labels.ts';
  import { roleMutations, roleQueries } from '../../roles.queries.ts';
  import PermissionTable from '../components/PermissionTable/PermissionTable.svelte';
  import CopyFromRole from './CopyFromRole.svelte';
  import DeleteRoleDialog from './DeleteRoleDialog.svelte';
  import LevelChoice from './LevelChoice.svelte';
  import { createRoleDraft } from './role-draft.state.svelte.ts';
  import SaveRoleDialog from './SaveRoleDialog.svelte';

  interface Props {
    /** Absent: a new role. */
    role?: RoleEntity;
    /** Where the page goes back to. */
    listUrl: string;
    /** The key of the role to copy, for a new role. */
    startKey?: string;
    /** The workspace that owns the role. Absent: the instance. */
    workspaceId?: string;
  }

  let { role, listUrl, startKey, workspaceId }: Props = $props();

  const LEVELS = $derived<readonly RoleLevel[]>(
    workspaceId ? ['workspace', 'project'] : ['platform', 'workspace', 'project'],
  );
  const HOLDER_ICONS = { people: UserRoundIcon, apps: BotIcon };
  const holderOptions = $derived(
    (['people', 'apps'] as const).map(value => ({
      value,
      label: t(holderLabels[value]),
      icon: HOLDER_ICONS[value],
    })),
  );

  const catalogQuery = createQuery(() => roleQueries.catalog());
  const rolesQuery = createQuery(() => roleQueries.list(workspaceId));
  const heldQuery = createQuery(() =>
    accessQueries.held(workspaceId ? workspaceRef(workspaceId) : platformRef),
  );
  const createRole = createMutation(() => roleMutations.create());
  const updateRole = createMutation(() => roleMutations.update());

  const areas = $derived(catalogQuery.data ?? []);

  const draft = createRoleDraft(untrack(() => role), () => areas);
  let name = $state(untrack(() => role?.name ?? ''));
  let description = $state(untrack(() => role?.description ?? ''));
  let confirmDelete = $state(false);
  let confirmSave = $state(false);
  let nameError = $state(false);
  let saveError = $state<string | null>(null);
  let saveTrace = $state('');

  const editing = $derived(role !== undefined);
  const levelLocked = $derived((role?.holderCount ?? 0) > 0);
  const levelOff = (option: RoleLevel) =>
    levelLocked || (editing && draft.holder === 'apps' && option === 'platform');
  const total = $derived(permissionsFor(areas, draft.level, draft.holder).length);
  const sources = $derived(
    copySources(rolesQuery.data ?? [], {
      role,
      level: draft.level,
      holder: draft.holder,
      levels: LEVELS,
    }),
  );
  const sourceName = $derived(
    draft.source === 'empty'
      ? t(rolesMessages.emptyRole)
      : draft.source
        ? roleName(draft.source)
        : null,
  );
  const pending = $derived(createRole.isPending || updateRole.isPending);
  const canSave = $derived(name.trim().length > 0 && !pending && !nameError);

  /** A role name is unique for each owner, in any case. */
  const nameUsed = (text: string) =>
    (rolesQuery.data ?? []).some(
      other =>
        !other.builtin &&
        other.key !== role?.key &&
        other.workspaceId === workspaceId &&
        other.name.trim().toLowerCase() === text.trim().toLowerCase(),
    );

  /** What the server refused: the permissions that the caller does not hold. */
  const notHeldIds = $derived(
    heldQuery.data
      ? [...draft.selected].filter(id => {
          const permission = areas
            .flatMap(area => area.permissions)
            .find(one => one.id === id);
          return permission && !permission.implicit && !heldQuery.data?.has(id);
        })
      : [],
  );

  // The server adds the implicit permissions, but the table must show them from the start.
  $effect(() => {
    if (areas.length > 0) untrack(draft.fit);
  });

  // A link with `from` starts from a copy of that role.
  let linkCopied = false;
  $effect(() => {
    const source = (rolesQuery.data ?? []).find(other => other.key === startKey);
    if (!source || areas.length === 0 || linkCopied || editing) return;
    linkCopied = true;
    untrack(() => draft.copy(source));
  });

  const toList = () => navigateTo(listUrl);

  const onFailed = (thrown: unknown) => {
    const error = ScyllaError.from(thrown);
    saveTrace = error.trace();
    if (error.reason === 'ROLE_NAME_IN_USE') {
      nameError = true;
    } else if (error.reason === 'ESCALATION' && notHeldIds.length > 0) {
      saveError = t(missingPermissions(notHeldIds.map(id => permissionLabel(id, areas)).join(', ')));
    } else {
      saveError = error.userMessage();
    }
  };

  /** The list reloads first and can unmount the page: a callback of `mutate` would not run. */
  const send = async () => {
    saveError = null;
    confirmSave = false;
    const permissions = [...draft.selected];
    const { level, holder } = draft;
    try {
      if (role) {
        await updateRole.mutateAsync({
          id: role.key,
          name,
          description,
          permissions,
          ...(level === role.level ? {} : { level }),
        });
      } else {
        const owner = workspaceId ? { workspaceId } : {};
        await createRole.mutateAsync({ name, description, level, holder, permissions, ...owner });
      }
      toList();
    } catch (thrown) {
      onFailed(thrown);
    }
  };

  const changed = $derived(
    role !== undefined &&
      (role.permissions.length !== draft.selected.size ||
        role.permissions.some(id => !draft.selected.has(id))),
  );

  /** A change is live at once for each holder: the dialog shows it before the save. */
  const save = () => {
    if (role && role.holderCount > 0 && changed) confirmSave = true;
    else void send();
  };

  const dropNotHeld = () => {
    draft.change(new Set([...draft.selected].filter(id => !notHeldIds.includes(id))));
    saveError = null;
  };
</script>

<div class="flex w-full flex-col gap-6 pb-20">
  <button
    type="button"
    class="flex w-fit items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
    onclick={() => navigateTo(listUrl)}
  >
    <ChevronLeftIcon class="size-4" />
    {t(rolesMessages.back)}
  </button>

  <header class="flex items-start justify-between gap-6">
    <div class="flex flex-col gap-2">
      <h1>
        {role ? roleName(role) : t(rolesMessages.newRole)}
      </h1>
      <p class="max-w-3xl text-sm text-muted-foreground">{t(rolesMessages.newRoleHint)}</p>
    </div>
    <div class="flex shrink-0 gap-2">
      {#if role}
        <Button variant="outline" onclick={() => (confirmDelete = true)}>
          {t(rolesMessages.deleteRole)}
        </Button>
      {/if}
      <Button variant="outline" onclick={() => navigateTo(listUrl)}>
        {t(rolesMessages.cancel)}
      </Button>
      <span class="contents" data-tour="role-submit">
        <Button disabled={!canSave} onclick={save}>
          {editing ? t(rolesMessages.saveRole) : t(rolesMessages.createRole)}
        </Button>
      </span>
    </div>
  </header>

  <div class="grid items-start gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
    <section class="flex flex-col gap-5 rounded-2xl border bg-card p-5" data-tour="role-details">
        <h2 class="text-xl">{t(rolesMessages.details)}</h2>

        <div class="flex flex-col gap-2">
          <Label for="role-name">{t(rolesMessages.name)}</Label>
          <Input
            id="role-name"
            value={name}
            maxlength={100}
            placeholder={t(rolesMessages.namePlaceholder)}
            aria-invalid={nameError}
            class={nameError ? 'border-destructive' : ''}
            oninput={event => {
              name = event.currentTarget.value;
              nameError = false;
            }}
            onblur={() => (nameError = nameUsed(name))}
          />
          {#if nameError}
            <p class="text-xs text-destructive">{t(nameTaken)}</p>
          {/if}
        </div>

        <div class="flex flex-col gap-2">
          <Label for="role-description">{t(rolesMessages.description)}</Label>
          <Input
            id="role-description"
            value={description}
            maxlength={500}
            placeholder={t(rolesMessages.descriptionPlaceholder)}
            oninput={event => (description = event.currentTarget.value)}
          />
        </div>

        <LevelChoice
          levels={LEVELS}
          value={draft.level}
          locked={levelLocked}
          isOff={levelOff}
          onChoose={draft.chooseLevel}
        />

        <fieldset class="flex flex-col gap-2" disabled={editing || draft.level === 'platform'}>
          <legend class="mb-2 text-sm font-medium">{t(rolesMessages.whoCanHold)}</legend>
          <SegmentedControl
            value={draft.holder}
            options={holderOptions}
            onChange={draft.chooseHolder}
            aria-label={t(rolesMessages.whoCanHold)}
            fill
          />
          <p class="text-xs text-muted-foreground">{t(holderHints[draft.holder])}</p>
        </fieldset>
    </section>

    <section class="overflow-hidden rounded-2xl border bg-card" data-tour="role-permissions">
      {#if saveError}
        <div class="m-5 flex flex-col gap-2 rounded-xl border border-destructive p-4" role="alert">
          <p class="font-medium">{t(rolesMessages.notSaved)}</p>
          <p class="text-sm text-muted-foreground">{saveError}</p>
          <div class="flex flex-wrap items-center justify-between gap-2">
            {#if notHeldIds.length > 0}
              <Button class="w-fit" variant="outline" onclick={dropNotHeld}>
                {t(removePermission(notHeldIds.map(id => permissionLabel(id, areas)).join(', ')))}
              </Button>
            {/if}
            <code class="rounded bg-muted px-2 py-1 font-mono text-xs text-muted-foreground">
              {saveTrace}
            </code>
          </div>
        </div>
      {/if}
      <div class="flex items-center gap-3 px-5 pt-5 pb-3.5">
        <div class="min-w-0 flex-1">
          <h2 class="text-xl">{t(rolesMessages.permissions)}</h2>
          <p class="mt-1 text-xs text-muted-foreground tabular-nums">
            {t(selectedOf(draft.selected.size, total))}
            {#if sourceName}
              · {t(copiedFrom(sourceName))} ·
              <button
                type="button"
                class="font-medium text-primary hover:underline"
                onclick={draft.undo}
              >
                {t(rolesMessages.undo)}
              </button>
            {/if}
          </p>
        </div>
        <CopyFromRole roles={sources} current={draft.source} onPick={draft.copy} />
      </div>
      <PermissionTable
        {areas}
        level={draft.level}
        holder={draft.holder}
        selected={draft.selected}
        held={heldQuery.data}
        onChange={draft.change}
      />
    </section>
  </div>
</div>

{#if role}
  <DeleteRoleDialog
    {role}
    {workspaceId}
    open={confirmDelete}
    onOpenChange={open => (confirmDelete = open)}
    onDeleted={toList}
  />
  <SaveRoleDialog
    {role}
    next={draft.selected}
    {areas}
    open={confirmSave}
    pending={pending}
    onOpenChange={open => (confirmSave = open)}
    onConfirm={() => void send()}
  />
{/if}
