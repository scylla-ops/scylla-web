<script lang="ts">
  import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';
  import InfoIcon from '@lucide/svelte/icons/info';
  import { createMutation, createQuery, navigateTo } from '@scylla/core-sdk';
  import { ConfirmOperationAlertDialog } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import {
    Button,
    Input,
    Label,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
  } from '@scylla/ui/primitives';
  import { untrack } from 'svelte';
  import type { RoleEntity, RoleHolder, RoleLevel } from '../../../domain/entities/role.entity.ts';
  import { fitToRole, permissionsFor, withoutImplicit } from '../../../domain/structs/catalog.struct.ts';
  import {
    holderHints,
    holderLabels,
    levelHints,
    levelLabels,
    rolesMessages,
    selectedOf,
  } from '../../messages/roles.messages.ts';
  import { roleName } from '../../role-labels.ts';
  import { roleMutations, roleQueries } from '../../roles.queries.ts';
  import PermissionTable from '../components/PermissionTable.svelte';

  interface Props {
    /** Absent: a new role. */
    role?: RoleEntity;
    /** Where the page goes back to. */
    listUrl: string;
    /** The key of the role to copy, for a new role. */
    startKey?: string;
  }

  let { role, listUrl, startKey }: Props = $props();

  const LEVELS: readonly RoleLevel[] = ['platform', 'workspace', 'project'];
  const HOLDERS: readonly RoleHolder[] = ['people', 'apps'];

  const catalogQuery = createQuery(() => roleQueries.catalog());
  const rolesQuery = createQuery(() => roleQueries.list());
  const createRole = createMutation(() => roleMutations.create());
  const updateRole = createMutation(() => roleMutations.update());
  const removeRole = createMutation(() => roleMutations.remove());

  const areas = $derived(catalogQuery.data ?? []);

  let name = $state(untrack(() => role?.name ?? ''));
  let description = $state(untrack(() => role?.description ?? ''));
  let level = $state<RoleLevel>(untrack(() => role?.level ?? 'workspace'));
  let holder = $state<RoleHolder>(untrack(() => role?.holder ?? 'people'));
  let start = $state(untrack(() => startKey ?? ''));
  let selected = $state<Set<string>>(new Set(untrack(() => role?.permissions ?? [])));
  let confirmDelete = $state(false);

  const editing = $derived(role !== undefined);
  const total = $derived(permissionsFor(areas, level, holder).length);
  const startRoles = $derived(
    (rolesQuery.data ?? []).filter(other => other.level === level && other.holder === holder),
  );
  const pending = $derived(createRole.isPending || updateRole.isPending);
  const canSave = $derived(name.trim().length > 0 && !pending);

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

  const toList = { onSuccess: () => navigateTo(listUrl) };

  const save = () => {
    const permissions = [...selected];
    if (role) {
      updateRole.mutate({ id: role.key, name, description, permissions }, toList);
    } else {
      createRole.mutate({ name, description, level, holder, permissions }, toList);
    }
  };

  const remove = () => {
    if (role) removeRole.mutate(role.key, toList);
  };

  const cardClass = (chosen: boolean, disabled: boolean) =>
    `flex w-full gap-3 rounded-xl border p-3 text-left transition-colors ${
      chosen ? 'border-primary' : ''
    } ${disabled ? 'cursor-not-allowed opacity-60' : 'hover:bg-muted/40'}`;
</script>

<div class="flex w-full flex-col gap-6">
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
      <h1 class="text-3xl font-semibold tracking-tight">
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
      <Button disabled={!canSave} onclick={save}>
        {editing ? t(rolesMessages.saveRole) : t(rolesMessages.createRole)}
      </Button>
    </div>
  </header>

  <div class="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
    <div class="flex flex-col gap-6">
      <section class="flex flex-col gap-5 rounded-2xl border bg-card p-5">
        <h2 class="text-xl font-semibold">{t(rolesMessages.details)}</h2>

        <div class="flex flex-col gap-2">
          <Label for="role-name">{t(rolesMessages.name)}</Label>
          <Input
            id="role-name"
            value={name}
            maxlength={100}
            placeholder={t(rolesMessages.namePlaceholder)}
            oninput={event => (name = event.currentTarget.value)}
          />
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

        <fieldset class="flex flex-col gap-2" disabled={editing}>
          <legend class="mb-2 text-sm font-medium">{t(rolesMessages.level)}</legend>
          {#each LEVELS as option (option)}
            <button
              type="button"
              role="radio"
              aria-checked={level === option}
              disabled={editing}
              class={cardClass(level === option, editing)}
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
          <p class="text-xs text-muted-foreground">{t(rolesMessages.levelFixed)}</p>
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
            <Select type="single" value={start} onValueChange={next => (start = next)}>
              <SelectTrigger class="w-full" aria-label={t(rolesMessages.startFrom)}>
                {#if startRoles.find(other => other.key === start)}
                  {roleName(startRoles.find(other => other.key === start) as RoleEntity)}
                {:else}
                  {t(rolesMessages.startFromEmpty)}
                {/if}
              </SelectTrigger>
              <SelectContent>
                {#each startRoles as other (other.key)}
                  <SelectItem value={other.key} label={roleName(other)}>
                    {roleName(other)}
                  </SelectItem>
                {/each}
              </SelectContent>
            </Select>
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

    <section class="overflow-hidden rounded-2xl border bg-card">
      <div class="p-5">
        <h2 class="text-xl font-semibold">{t(rolesMessages.permissions)}</h2>
        <p class="mt-1 text-xs text-muted-foreground tabular-nums">
          {t(selectedOf(selected.size, total))}
        </p>
      </div>
      <div class="overflow-x-auto">
        <PermissionTable
          {areas}
          {level}
          {holder}
          {selected}
          onChange={next => (selected = next)}
        />
      </div>
    </section>
  </div>
</div>

<ConfirmOperationAlertDialog
  open={confirmDelete}
  onOpenChange={open => (confirmDelete = open)}
  title={t(rolesMessages.deleteTitle)}
  description={t(rolesMessages.deleteHint)}
  onContinue={remove}
  isLoading={removeRole.isPending}
/>
