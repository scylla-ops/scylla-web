<script lang="ts">
  import { i18n } from '@lingui/core';
  import XIcon from '@lucide/svelte/icons/x';
  import { createMutation, createQuery } from '@scylla/core-sdk';
  import {
    accessMutations,
    accessQueries,
    projectRef,
    workspaceRef,
  } from '@base/features/access';
  import { invitationMutations } from '@base/features/invitation';
  import { projectQueries } from '@base/features/project';
  import { missingPermissionIds, roleQueries, roleName } from '@base/features/roles';
  import type { UserSummary } from '@base/features/user';
  import { ScyllaDialog, SearchSelect } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import {
    Button,
    Combobox,
    ComboboxContent,
    ComboboxInput,
    ComboboxItem,
    Label,
  } from '@scylla/ui/primitives';
  import { matchesSearch, toast } from '@scylla/ui/utils';
  import { checkEmail } from '@shared/utils/account-validation.ts';
  import { userName } from '@shared/presentation/ui';
  import { summaryLines } from '../../../presenters/add-members.presenter.ts';
  import {
    addCount,
    membersAdded,
    addTitle,
    membershipMessages,
    morePeople,
  } from '../../../messages/membership.messages.ts';
  import { OWNER_KEY } from '../../../presenters/member-rows.presenter.ts';
  import RolePicker from '../RolePicker/RolePicker.svelte';

  interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    workspaceId: string;
    workspaceName: string;
    /** The people of the directory that are not in the workspace yet. */
    candidates: readonly UserSummary[];
    /** Whether the caller can read the directory. Without it, only an email adds someone. */
    canBrowse: boolean;
    onAdded: () => void;
  }

  let {
    open,
    onOpenChange,
    workspaceId,
    workspaceName,
    candidates,
    canBrowse,
    onAdded,
  }: Props = $props();

  const uid = $props.id();
  /** A long directory stays quick to open: the text narrows the rest. */
  const MAX_SUGGESTIONS = 50;

  type Chip = { user: UserSummary } | { email: string };
  interface ProjectRow {
    projectId: string;
    role: string;
  }

  const rolesQuery = createQuery(() => roleQueries.list(workspaceId, { enabled: open }));
  const catalogQuery = createQuery(() => ({ ...roleQueries.catalog(), enabled: open }));
  const projectsQuery = createQuery(() => ({
    ...projectQueries.lookup(workspaceId),
    enabled: open,
  }));
  const heldQuery = createQuery(() =>
    accessQueries.held(workspaceRef(workspaceId), { enabled: open }),
  );
  const grant = createMutation(() => accessMutations.grant());
  const invite = createMutation(() => invitationMutations.create());

  const areas = $derived(catalogQuery.data ?? []);
  const people = $derived((rolesQuery.data ?? []).filter(role => role.holder === 'people'));
  const workspaceOptions = $derived(people.filter(role => role.level === 'workspace'));
  const projectOptions = $derived(people.filter(role => role.level === 'project'));
  const projects = $derived(projectsQuery.data?.items ?? []);
  const projectChoices = $derived(
    projects.map(project => ({ value: project.id, label: project.name })),
  );

  let chips = $state<Chip[]>([]);
  let text = $state('');
  let workspaceRoles = $state<string[]>(['member']);
  let projectRows = $state<ProjectRow[]>([]);
  let pending = $state(false);
  let showAll = $state(false);

  const peopleListId = `${uid}-people`;
  let peopleAnchor = $state<HTMLElement | null>(null);
  let peopleOpen = $state(false);
  /** Empty after each pick: the field adds a chip, it does not hold a value. */
  let pickedPerson = $state('');

  const chosen = $derived(new Set(chips.map(chip => ('user' in chip ? chip.user.id : chip.email))));
  const matches = $derived(
    candidates
      .filter(user => !chosen.has(user.id))
      .filter(user => matchesSearch(text, [userName(user), user.username, user.email])),
  );
  const suggestions = $derived(matches.slice(0, MAX_SUGGESTIONS));
  const hiddenMatches = $derived(matches.length - suggestions.length);
  const showSuggestions = $derived(peopleOpen && suggestions.length > 0);
  const hasEmails = $derived(chips.some(chip => 'email' in chip));

  /** An invitation carries one built-in role of the workspace, and not the role owner. */
  const inviteRole = $derived(
    workspaceRoles.find(
      role =>
        role !== OWNER_KEY && workspaceOptions.some(o => o.grantName === role && o.builtin),
    ),
  );
  /** The server refuses a role with a permission that the caller does not hold. */
  const isLocked = (name: string): boolean => {
    const role = people.find(one => one.grantName === name);
    return role !== undefined && heldQuery.data !== undefined
      ? missingPermissionIds(role, heldQuery.data, areas).length > 0
      : false;
  };

  // The first role that the caller can give, when it cannot give the usual one.
  $effect(() => {
    if (!heldQuery.data || workspaceOptions.length === 0) return;
    if (workspaceRoles.length === 1 && isLocked(workspaceRoles[0] ?? '')) {
      workspaceRoles = [
        workspaceOptions.find(role => !isLocked(role.grantName))?.grantName ?? '',
      ];
    }
  });

  const canSubmit = $derived(
    chips.length > 0 &&
      workspaceRoles.length > 0 &&
      workspaceRoles.every(role => role && !isLocked(role)) &&
      projectRows.every(row => row.projectId && row.role && !isLocked(row.role)) &&
      (!hasEmails || inviteRole !== undefined) &&
      !pending,
  );

  const summary = $derived(
    summaryLines({
      roles: people,
      workspaceRoles,
      projectRows: projectRows.map(row => ({
        role: row.role,
        projectName: projects.find(project => project.id === row.projectId)?.name ?? '',
      })),
      workspaceName,
    }),
  );

  const addChip = (chip: Chip) => {
    chips = [...chips, chip];
    text = '';
    peopleOpen = false;
  };

  const addFromText = () => {
    const value = text.trim().replace(/,$/, '');
    if (!value) return;
    const known = candidates.find(user => user.email === value || user.username === value);
    if (known) addChip({ user: known });
    else if (!checkEmail(value)) addChip({ email: value });
  };

  const pickPerson = (id: string) => {
    const user = candidates.find(one => one.id === id);
    if (user) addChip({ user });
    pickedPerson = '';
  };

  // Enter on an open list picks the highlighted row: bits-ui does it.
  const onKeydown = (event: KeyboardEvent) => {
    if (event.key === ',' || (event.key === 'Enter' && !showSuggestions)) {
      event.preventDefault();
      addFromText();
    }
  };

  const reset = () => {
    chips = [];
    text = '';
    workspaceRoles = ['member'];
    projectRows = [];
    showAll = false;
  };

  /** The workspace roles first: a person needs one before a role on a project. */
  const submit = async () => {
    addFromText();
    pending = true;
    const workspace = workspaceRef(workspaceId);
    try {
      for (const chip of chips) {
        if ('email' in chip) {
          await invite.mutateAsync({ workspaceId, email: chip.email, role: inviteRole ?? '' });
          continue;
        }
        const actorId = chip.user.id;
        for (const role of workspaceRoles) {
          await grant.mutateAsync({ object: workspace, role, actorId });
        }
        for (const row of projectRows) {
          await grant.mutateAsync({ object: projectRef(row.projectId), role: row.role, actorId });
        }
      }
      const added = chips.filter(chip => 'user' in chip).length;
      if (added > 0) toast.success(i18n._(membersAdded(added)));
      reset();
      onAdded();
      onOpenChange(false);
    } catch {
      // The global mutation handler toasts the error. The dialog stays open.
    } finally {
      pending = false;
    }
  };
</script>

<ScyllaDialog
  {open}
  {onOpenChange}
  title={t(addTitle(workspaceName))}
  description={t(membershipMessages.addMembersHint)}
>
  <div class="flex flex-col gap-5">
    <div class="flex flex-col gap-2">
      <Label for="add-members-people">{t(membershipMessages.people)}</Label>
      <Combobox
        type="single"
        allowDeselect={false}
        bind:value={pickedPerson}
        onValueChange={pickPerson}
        bind:open={() => showSuggestions, next => (peopleOpen = next)}
      >
        <div bind:this={peopleAnchor} class="flex flex-wrap items-center gap-2 rounded-md border p-2">
          {#each chips as chip, index (index)}
            <span class="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs">
              {'user' in chip ? userName(chip.user) : chip.email}
              <button
                type="button"
                aria-label={t(membershipMessages.removeChip)}
                onclick={() => (chips = chips.filter((_, i) => i !== index))}
              >
                <XIcon class="size-3" />
              </button>
            </span>
          {/each}
          <ComboboxInput
            id="add-members-people"
            class="h-7 w-auto min-w-40 flex-1 rounded-none border-0 p-0 shadow-none focus-visible:ring-0"
            placeholder={t(membershipMessages.addPeoplePlaceholder)}
            value={text}
            aria-haspopup="listbox"
            aria-controls={showSuggestions ? peopleListId : undefined}
            onclick={() => (peopleOpen = true)}
            oninput={event => {
              text = event.currentTarget.value;
              peopleOpen = true;
            }}
            onkeydown={onKeydown}
          />
        </div>
        <ComboboxContent id={peopleListId} customAnchor={peopleAnchor}>
          {#each suggestions as user (user.id)}
            <ComboboxItem value={user.id} label={userName(user)}>
              <span class="flex min-w-0 flex-col">
                <span class="truncate">{userName(user)}</span>
                {#if user.email}
                  <span class="truncate text-xs text-muted-foreground">{user.email}</span>
                {/if}
              </span>
            </ComboboxItem>
          {/each}
          {#if hiddenMatches > 0}
            <p class="px-2 py-1.5 text-xs text-muted-foreground">{t(morePeople(hiddenMatches))}</p>
          {/if}
        </ComboboxContent>
      </Combobox>
      {#if !canBrowse}
        <p class="text-xs text-muted-foreground">{t(membershipMessages.emailOnlyHint)}</p>
      {/if}
    </div>

    <div class="flex flex-col gap-2">
      <Label>{t(membershipMessages.workspaceRole)}</Label>
      {#each workspaceRoles as role, index (index)}
        <div class="flex items-center gap-2">
          <RolePicker
            roles={workspaceOptions}
            value={role}
            held={heldQuery.data}
            {areas}
            label={t(membershipMessages.workspaceRole)}
            onChange={next => (workspaceRoles = workspaceRoles.map((r, i) => (i === index ? next : r)))}
          />
          {#if workspaceRoles.length > 1}
            <Button
              variant="ghost"
              size="icon"
              aria-label={t(membershipMessages.removeRow)}
              onclick={() => (workspaceRoles = workspaceRoles.filter((_, i) => i !== index))}
            >
              <XIcon class="size-4" />
            </Button>
          {/if}
        </div>
      {/each}
      <button
        type="button"
        class="w-fit text-xs font-medium text-primary hover:underline"
        onclick={() => (workspaceRoles = [...workspaceRoles, ''])}
      >
        {t(membershipMessages.addWorkspaceRole)}
      </button>
      {#if hasEmails && workspaceRoles.includes(OWNER_KEY)}
        <p class="text-xs text-muted-foreground">{t(membershipMessages.ownerNotInvited)}</p>
      {/if}
    </div>

    <div class="flex flex-col gap-2">
      <Label>
        {t(membershipMessages.projectRoles)}
        <span class="ml-1 text-xs font-normal text-muted-foreground">
          {t(membershipMessages.optional)}
        </span>
      </Label>
      {#each projectRows as row, index (index)}
        <div class="grid grid-cols-[1fr_1fr_auto] items-center gap-2">
          <SearchSelect
            options={projectChoices}
            value={row.projectId}
            onValueChange={next =>
              (projectRows = projectRows.map((r, i) => (i === index ? { ...r, projectId: next } : r)))}
            loading={projectsQuery.isLoading}
            placeholder={t(membershipMessages.chooseProject)}
            aria-label={t(membershipMessages.project)}
          />
          <RolePicker
            roles={projectOptions}
            value={row.role}
            held={heldQuery.data}
            {areas}
            label={t(membershipMessages.projectRoles)}
            onChange={next =>
              (projectRows = projectRows.map((r, i) => (i === index ? { ...r, role: next } : r)))}
          />
          <Button
            variant="ghost"
            size="icon"
            aria-label={t(membershipMessages.removeRow)}
            onclick={() => (projectRows = projectRows.filter((_, i) => i !== index))}
          >
            <XIcon class="size-4" />
          </Button>
        </div>
      {/each}
      <button
        type="button"
        class="w-fit text-xs font-medium text-primary hover:underline"
        onclick={() => (projectRows = [...projectRows, { projectId: '', role: '' }])}
      >
        {t(membershipMessages.addProjectRole)}
      </button>
      {#if hasEmails}
        <p class="text-xs text-muted-foreground">{t(membershipMessages.inviteHint)}</p>
      {/if}
    </div>

    <div class="rounded-md bg-muted p-3 text-xs">
      <div class="flex items-center justify-between">
        <span class="font-medium">{t(membershipMessages.whatTheyGet)}</span>
        <button
          type="button"
          class="font-medium text-primary hover:underline"
          onclick={() => (showAll = !showAll)}
        >
          {t(membershipMessages.seeAllPermissions)}
        </button>
      </div>
      <p class="mt-1 text-muted-foreground">{summary.join(' ')}</p>
      {#if showAll}
        <ul class="mt-2 flex flex-col gap-1 text-muted-foreground">
          {#each people.filter(role => workspaceRoles.includes(role.grantName) || projectRows.some(row => row.role === role.grantName)) as role (role.key)}
            <li>
              <span class="font-medium text-foreground">{roleName(role)}:</span>
              {role.permissions.join(', ')}
            </li>
          {/each}
        </ul>
      {/if}
    </div>

    <div class="flex justify-end gap-2">
      <Button variant="outline" onclick={() => onOpenChange(false)}>
        {t(membershipMessages.cancel)}
      </Button>
      <span class="contents" data-tour="members-submit">
        <Button disabled={!canSubmit} onclick={() => void submit()}>
          {t(addCount(chips.length))}
        </Button>
      </span>
    </div>
  </div>
</ScyllaDialog>
