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
  import { ScyllaDialog } from '@scylla/ui';
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
  import { toast } from '@scylla/ui/utils';
  import { checkEmail } from '@shared/utils/account-validation.ts';
  import { userName } from '@shared/presentation/ui';
  import { summaryLines } from '../../../presenters/add-members.presenter.ts';
  import {
    addCount,
    addTitle,
    membershipMessages,
  } from '../../../messages/membership.messages.ts';
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

  let chips = $state<Chip[]>([]);
  let text = $state('');
  let workspaceRoles = $state<string[]>(['member']);
  let projectRows = $state<ProjectRow[]>([]);
  let pending = $state(false);
  let showAll = $state(false);

  const chosen = $derived(new Set(chips.map(chip => ('user' in chip ? chip.user.id : chip.email))));
  const suggestions = $derived(
    text.trim().length === 0
      ? []
      : candidates
          .filter(user => !chosen.has(user.id))
          .filter(user =>
            `${userName(user)} ${user.username ?? ''} ${user.email ?? ''}`
              .toLowerCase()
              .includes(text.trim().toLowerCase()),
          )
          .slice(0, 6),
  );
  const hasEmails = $derived(chips.some(chip => 'email' in chip));

  /** An invitation carries one built-in role of the workspace. */
  const inviteRole = $derived(
    workspaceRoles.find(role => workspaceOptions.some(o => o.grantName === role && o.builtin)),
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
  };

  const addFromText = () => {
    const value = text.trim().replace(/,$/, '');
    if (!value) return;
    const known = candidates.find(user => user.email === value || user.username === value);
    if (known) addChip({ user: known });
    else if (!checkEmail(value)) addChip({ email: value });
  };

  const onKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ',') {
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
      toast.success(i18n._(addCount(chips.length)));
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
      <div class="flex flex-wrap items-center gap-2 rounded-md border p-2">
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
        <Input
          id="add-members-people"
          class="h-7 min-w-40 flex-1 border-0 p-0 shadow-none focus-visible:ring-0"
          placeholder={t(membershipMessages.addPeoplePlaceholder)}
          value={text}
          oninput={event => (text = event.currentTarget.value)}
          onkeydown={onKeydown}
        />
      </div>
      {#if suggestions.length > 0}
        <ul class="rounded-md border p-1 text-sm">
          {#each suggestions as user (user.id)}
            <li>
              <button
                type="button"
                class="w-full rounded px-2 py-1 text-left hover:bg-muted"
                onclick={() => addChip({ user })}
              >
                {userName(user)}
                {#if user.email}
                  <span class="ml-2 text-xs text-muted-foreground">{user.email}</span>
                {/if}
              </button>
            </li>
          {/each}
        </ul>
      {/if}
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
          <Select
            type="single"
            value={row.projectId}
            onValueChange={next =>
              (projectRows = projectRows.map((r, i) => (i === index ? { ...r, projectId: next } : r)))}
          >
            <SelectTrigger class="w-full" aria-label={t(membershipMessages.project)}>
              {projects.find(project => project.id === row.projectId)?.name ??
                t(membershipMessages.chooseProject)}
            </SelectTrigger>
            <SelectContent>
              {#each projects as project (project.id)}
                <SelectItem value={project.id} label={project.name}>{project.name}</SelectItem>
              {/each}
            </SelectContent>
          </Select>
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
      <Button disabled={!canSubmit} onclick={() => void submit()}>
        {t(addCount(chips.length))}
      </Button>
    </div>
  </div>
</ScyllaDialog>
