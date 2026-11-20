<script lang="ts">
  import type { MessageDescriptor } from '@lingui/core';
  import { slide } from 'svelte/transition';
  import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
  import FolderIcon from '@lucide/svelte/icons/folder';
  import { SegmentedControl } from '@scylla/ui';
  import {
    Button,
    Checkbox,
    Input,
    Label,
    RadioGroup,
    RadioGroupItem,
  } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { cn, matchesSearch } from '@scylla/ui/utils';
  import type { TokenExpiry, TokenPreset } from '@shared/domain/structs/api-token.struct.ts';
  import {
    ACTION_GROUPS,
    actionKey,
    TOKEN_EXPIRIES,
    expiryDateOf,
    presetKeys,
    type ActionGroupId,
    type ActionId,
    type ActionKey,
  } from '@shared/domain/structs/token-actions.struct.ts';
  import { formatDay } from '@shared/utils/date-utils.ts';
  import { tokenFormMessages as messages } from '@shared/presentation/messages/token-form.messages.ts';

  interface Props {
    name: string;
    expiry: TokenExpiry;
    preset: TokenPreset;
    /** The checked boxes, with `custom`. */
    keys: ActionKey[];
    someProjects: boolean;
    projectIds: string[];
    /** The projects that the user can choose. */
    projects: readonly { id: string; name: string }[];
    /** Below the limits: whose roles bound them. */
    hint: string;
    /** For the ids of the fields. */
    idPrefix?: string;
  }

  let {
    name = $bindable(),
    expiry = $bindable(),
    preset = $bindable(),
    keys = $bindable(),
    someProjects = $bindable(),
    projectIds = $bindable(),
    projects,
    hint,
    idPrefix = 'token',
  }: Props = $props();

  let advanced = $state(false);
  let choosingProjects = $state(false);

  /** Below this, all the rows show at once. */
  const PROJECT_FILTER_FROM = 8;
  let projectFilter = $state('');
  const shownProjects = $derived(
    projects.filter(project => matchesSearch(projectFilter, [project.name])),
  );

  const PRESETS: readonly { value: Exclude<TokenPreset, 'custom'>; title: MessageDescriptor; body: MessageDescriptor }[] = [
    { value: 'read_only', title: messages.readOnly, body: messages.readOnlyBody },
    { value: 'deploy', title: messages.deploy, body: messages.deployBody },
    { value: 'full', title: messages.full, body: messages.fullBody },
  ];

  const GROUP_LABEL: Record<ActionGroupId, MessageDescriptor> = {
    projects: messages.projects,
    pipelines: messages.pipelines,
    jobs: messages.jobs,
    secrets: messages.secrets,
    triggers: messages.triggers,
    apps: messages.apps,
  };

  const actionLabel = (group: ActionGroupId, action: ActionId): MessageDescriptor => {
    if (action === 'read') return group === 'secrets' ? messages.readNames : messages.read;
    if (action === 'logs') return messages.readLogs;
    return { change: messages.change, run: messages.run, cancel: messages.cancel, manage: messages.manage }[action];
  };

  const expiries = $derived(
    TOKEN_EXPIRIES.map(days => ({
      value: String(days),
      label: days === 365 ? t(messages.oneYear) : t(messages.days(days)),
    })),
  );

  const checked = $derived(preset === 'custom' ? keys : presetKeys(preset));

  const choosePreset = (value: Exclude<TokenPreset, 'custom'>) => {
    preset = value;
    keys = presetKeys(value);
  };

  const toggle = (key: ActionKey, on: boolean) => {
    const base = preset === 'custom' ? keys : presetKeys(preset);
    keys = on ? [...base, key] : base.filter(item => item !== key);
    preset = 'custom';
  };

  const chooseProject = (id: string, on: boolean) => {
    projectIds = on ? [...projectIds, id] : projectIds.filter(item => item !== id);
  };

  const projectLine = $derived(
    someProjects
      ? t(
          messages.someProjects(
            projects
              .filter(project => projectIds.includes(project.id))
              .map(project => project.name)
              .join(', '),
          ),
        )
      : t(messages.allProjects),
  );
</script>

<div class="flex flex-col gap-4">
  <div class="flex flex-col gap-1.5">
    <Label for="{idPrefix}-name">{t(messages.name)}</Label>
    <Input
      id="{idPrefix}-name"
      bind:value={name}
      placeholder={t(messages.namePlaceholder)}
      autocomplete="off"
    />
  </div>

  <div class="flex flex-col gap-1.5">
    <span class="text-sm font-medium" id="{idPrefix}-expiry">{t(messages.expiresIn)}</span>
    <SegmentedControl
      value={String(expiry)}
      options={expiries}
      onChange={next => (expiry = Number(next) as TokenExpiry)}
      aria-labelledby="{idPrefix}-expiry"
      fill
    />
    <p class="text-xs text-muted-foreground">
      {t(messages.expiresOn(formatDay(expiryDateOf(expiry, new Date()).toISOString())))}
    </p>
  </div>

  <fieldset class="flex flex-col gap-2">
    <legend class="mb-2 text-sm font-medium">{t(messages.limits)}</legend>
    <RadioGroup
      value={preset === 'custom' ? '' : preset}
      onValueChange={value => choosePreset(value as Exclude<TokenPreset, 'custom'>)}
      class="grid gap-2 sm:grid-cols-3"
    >
      {#each PRESETS as item (item.value)}
        <Label
          class={cn(
            'flex cursor-pointer items-center gap-2.5 rounded-lg border p-3 font-normal',
            preset === item.value && 'border-primary',
          )}
        >
          <RadioGroupItem value={item.value} />
          <span class="flex flex-col gap-1">
            <span class="text-sm font-medium">{t(item.title)}</span>
            <span class="text-xs text-muted-foreground">{t(item.body)}</span>
          </span>
        </Label>
      {/each}
    </RadioGroup>

    <button
      type="button"
      class="flex items-center gap-2 py-1 text-left text-sm"
      aria-expanded={advanced}
      onclick={() => (advanced = !advanced)}
    >
      <ChevronRightIcon
        class={cn('size-4 transition-transform motion-reduce:transition-none', advanced && 'rotate-90')}
        aria-hidden="true"
      />
      {preset === 'custom' ? t(messages.advancedCustom) : t(messages.advanced)}
    </button>
    {#if advanced}
      <div class="grid grid-cols-2 gap-4 sm:grid-cols-3" transition:slide={{ duration: 200 }}>
        {#each ACTION_GROUPS as group (group.id)}
          <fieldset class="flex flex-col gap-2">
            <legend class="mb-1 text-xs font-medium">{t(GROUP_LABEL[group.id])}</legend>
            {#each group.actions as action (action.id)}
              {@const key = actionKey(group.id, action.id)}
              <Label class="flex items-center gap-2 text-sm font-normal">
                <Checkbox
                  checked={checked.includes(key)}
                  onCheckedChange={value => toggle(key, value === true)}
                />
                {t(actionLabel(group.id, action.id))}
              </Label>
            {/each}
          </fieldset>
        {/each}
      </div>
    {/if}

    <div class="flex items-center justify-between gap-2 text-xs">
      <span class="flex items-center gap-2 text-muted-foreground">
        <FolderIcon class="size-4" aria-hidden="true" />
        {projectLine}
      </span>
      <Button
        type="button"
        variant="link"
        size="sm"
        class="h-auto p-0 text-xs"
        aria-expanded={choosingProjects}
        onclick={() => (choosingProjects = !choosingProjects)}
      >
        {t(messages.changeProjects)}
      </Button>
    </div>
    {#if choosingProjects}
      <div class="flex flex-col gap-2" transition:slide={{ duration: 200 }}>
        <RadioGroup
          value={someProjects ? 'some' : 'all'}
          onValueChange={value => (someProjects = value === 'some')}
        >
          <Label class="flex items-center gap-2 font-normal">
            <RadioGroupItem value="all" />
            {t(messages.allProjectsChoice)}
          </Label>
          <Label class="flex items-center gap-2 font-normal">
            <RadioGroupItem value="some" />
            {t(messages.someProjectsChoice)}
          </Label>
        </RadioGroup>
        {#if someProjects}
          {#if projects.length >= PROJECT_FILTER_FROM}
            <Input
              placeholder={t(messages.findProject)}
              aria-label={t(messages.findProject)}
              autocomplete="off"
              bind:value={projectFilter}
            />
          {/if}
          <div class="relative max-h-40 overflow-y-auto rounded-md border px-3 py-1">
            {#each shownProjects as project (project.id)}
              <Label class="flex items-center gap-2 py-1.5 font-normal">
                <Checkbox
                  checked={projectIds.includes(project.id)}
                  onCheckedChange={value => chooseProject(project.id, value === true)}
                />
                {project.name}
              </Label>
            {:else}
              <p role="status" class="py-1.5 text-xs text-muted-foreground">
                {projects.length === 0 ? t(messages.noProject) : t(messages.noProjectMatch)}
              </p>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
    <p class="text-xs text-muted-foreground">{hint}</p>
  </fieldset>
</div>
