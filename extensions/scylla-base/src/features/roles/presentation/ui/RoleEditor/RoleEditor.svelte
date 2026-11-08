<script lang="ts">
  import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';
  import InfoIcon from '@lucide/svelte/icons/info';
  import { createMutation, createQuery, navigateTo } from '@scylla/core-sdk';
  import { accessQueries, platformRef, workspaceRef } from '@base/features/access';
  import { t } from '@scylla/ui/i18n';
  import { SearchSelect } from '@scylla/ui';
  import {
    Button,
    Input,
    Label,
  } from '@scylla/ui/primitives';
  import { untrack } from 'svelte';
  import { ScyllaError } from '@shared/utils/scylla-error.ts';
  import type { RoleEntity, RoleHolder, RoleLevel } from '../../../domain/entities/role.entity.ts';
  import { fitToRole, permissionsFor, withoutImplicit } from '../../../domain/structs/catalog.struct.ts';
  import {
    holderHints,
    holderLabels,
    levelHints,
    levelLabels,
    missingPermissions,
    nameTaken,
    permissionLabel,
    removePermission,
    rolesMessages,
    selectedOf,
  } from '../../messages/roles.messages.ts';
  import { roleName } from '../../role-labels.ts';
  import { roleMutations, roleQueries } from '../../roles.queries.ts';
  import PermissionTable from '../components/PermissionTable.svelte';
  import DeleteRoleDialog from './DeleteRoleDialog.svelte';
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
  const HOLDERS: readonly RoleHolder[] = ['people', 'apps'];

  const catalogQuery = createQuery(() => roleQueries.catalog());
  const rolesQuery = createQuery(() => roleQueries.list(workspaceId));
  const heldQuery = createQuery(() =>
    accessQueries.held(workspaceId ? workspaceRef(workspaceId) : platformRef),
  );
  const createRole = createMutation(() => roleMutations.create());
  const updateRole = createMutation(() => roleMutations.update());

  const areas = $derived(catalogQuery.data ?? []);

  let name = $state(untrack(() => role?.name ?? ''));
  let description = $state(untrack(() => role?.description ?? ''));
  let level = $state<RoleLevel>(untrack(() => role?.level ?? 'workspace'));
  let holder = $state<RoleHolder>(untrack(() => role?.holder ?? 'people'));
  let start = $state(untrack(() => startKey ?? ''));
  let selected = $state<Set<string>>(new Set(untrack(() => role?.permissions ?? [])));
  let confirmDelete = $state(false);
  let confirmSave = $state(false);
  let nameError = $state(false);
  let saveError = $state<string | null>(null);
  let saveTrace = $state('');

  const editing = $derived(role !== undefined);
  const levelLocked = $derived((role?.holderCount ?? 0) > 0);
  const levelOff = (option: RoleLevel) =>
    levelLocked || (editing && holder === 'apps' && option === 'platform');
  const total = $derived(permissionsFor(areas, level, holder).length);
  const startRoles = $derived(
    (rolesQuery.data ?? []).filter(other => other.level === level && other.holder === holder),
  );
  const startChoices = $derived(
    startRoles.map(other => ({ value: other.key, label: roleName(other) })),
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
      ? [...selected].filter(id => {
          const permission = areas
            .flatMap(area => area.permissions)
            .find(one => one.id === id);
          return permission && !permission.implicit && !heldQuery.data?.has(id);
        })
      : [],
  );

  const fit = () => {
    selected = fitToRole(withoutImplicit(selected, areas), areas, level, holder);
  };

  // The server adds the implicit permissions, but the table must show them from the start.
  $effect(() => {
    if (areas.length > 0) untrack(fit);
  });

  // A copy of a role: a link with `from`, or the select of the form.
  let copied = $state('');
  $effect(() => {
    const source = (rolesQuery.data ?? []).find(other => other.key === start);
    if (!source || copied === source.key || editing) return;
    copied = source.key;
    untrack(() => {
      level = source.level;
      holder = source.holder;
      selected = fitToRole(new Set(source.permissions), areas, source.level, source.holder);
    });
  });

  const chooseLevel = (next: RoleLevel) => {
    level = next;
    if (next === 'platform') holder = 'people';
    start = '';
    fit();
  };

  const chooseHolder = (next: RoleHolder) => {
    holder = next;
    start = '';
    fit();
  };

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
    const permissions = [...selected];
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
      (role.permissions.length !== selected.size ||
        role.permissions.some(id => !selected.has(id))),
  );

  /** A change is live at once for each holder: the dialog shows it before the save. */
  const save = () => {
    if (role && role.holderCount > 0 && changed) confirmSave = true;
    else void send();
  };

  const dropNotHeld = () => {
    selected = new Set([...selected].filter(id => !notHeldIds.includes(id)));
    saveError = null;
  };

  const cardClass = (chosen: boolean, disabled: boolean) =>
    `flex w-full gap-3 rounded-xl border p-3 text-left transition-colors ${
      chosen ? 'border-primary' : ''
    } ${disabled ? 'cursor-not-allowed opacity-60' : 'hover:bg-muted/40'}`;
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

  <div class="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
    <div class="flex flex-col gap-6">
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

        <fieldset class="flex flex-col gap-2" disabled={levelLocked}>
          <legend class="mb-2 text-sm font-medium">{t(rolesMessages.level)}</legend>
          {#each LEVELS as option (option)}
            {@const off = levelOff(option)}
            <button
              type="button"
              role="radio"
              aria-checked={level === option}
              disabled={off}
              class={cardClass(level === option, off)}
              onclick={() => chooseLevel(option)}
            >
              <span
                class="mt-0.5 size-4 shrink-0 rounded-full border {level === option
                  ? 'border-4 border-primary'
                  : ''}"
              ></span>
              <span>
                <span class="block text-sm font-medium">{t(levelLabels[option])}</span>
                <span class="block text-xs text-muted-foreground">{t(levelHints[option])}</span>
              </span>
            </button>
          {/each}
          <p class="text-xs text-muted-foreground">{t(rolesMessages.levelHint)}</p>
        </fieldset>

        <fieldset class="flex flex-col gap-2" disabled={editing}>
          <legend class="mb-2 text-sm font-medium">{t(rolesMessages.whoCanHold)}</legend>
          {#each HOLDERS as option (option)}
            {@const off = editing || (level === 'platform' && option === 'apps')}
            <button
              type="button"
              role="radio"
              aria-checked={holder === option}
              disabled={off}
              class={cardClass(holder === option, off)}
              onclick={() => chooseHolder(option)}
            >
              <span
                class="mt-0.5 size-4 shrink-0 rounded-full border {holder === option
                  ? 'border-4 border-primary'
                  : ''}"
              ></span>
              <span>
                <span class="block text-sm font-medium">{t(holderLabels[option])}</span>
                <span class="block text-xs text-muted-foreground">{t(holderHints[option])}</span>
              </span>
            </button>
          {/each}
        </fieldset>

        {#if !editing}
          <div class="flex flex-col gap-2">
            <Label>{t(rolesMessages.startFrom)}</Label>
            <SearchSelect
              options={startChoices}
              bind:value={start}
              loading={rolesQuery.isLoading}
              placeholder={t(rolesMessages.startFromEmpty)}
              aria-label={t(rolesMessages.startFrom)}
            />
            <p class="text-xs text-muted-foreground">{t(rolesMessages.startFromHint)}</p>
          </div>
        {/if}
      </section>

      <aside class="flex gap-3 rounded-2xl border border-primary/40 bg-primary/5 p-4">
        <InfoIcon class="mt-0.5 size-4 shrink-0 text-primary" />
        <div>
          <p class="text-sm font-medium">{t(rolesMessages.liveTitle)}</p>
          <p class="mt-1 text-xs text-muted-foreground">{t(rolesMessages.liveHint)}</p>
        </div>
      </aside>
    </div>

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
      <div class="p-5">
        <h2 class="text-xl">{t(rolesMessages.permissions)}</h2>
        <p class="mt-1 text-xs text-muted-foreground tabular-nums">
          {t(selectedOf(selected.size, total))}
        </p>
      </div>
      <div class="relative overflow-x-auto p-1.5">
        <PermissionTable
          {areas}
          {level}
          {holder}
          {selected}
          held={heldQuery.data}
          onChange={next => (selected = next)}
        />
      </div>
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
    next={selected}
    {areas}
    open={confirmSave}
    pending={pending}
    onOpenChange={open => (confirmSave = open)}
    onConfirm={() => void send()}
  />
{/if}
