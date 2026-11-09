<script lang="ts">
  import BotIcon from '@lucide/svelte/icons/bot';
  import CheckIcon from '@lucide/svelte/icons/check';
  import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
  import CopyIcon from '@lucide/svelte/icons/copy';
  import PencilIcon from '@lucide/svelte/icons/pencil';
  import PlusIcon from '@lucide/svelte/icons/plus';
  import SearchIcon from '@lucide/svelte/icons/search';
  import { t } from '@scylla/ui/i18n';
  import {
    Button,
    Command,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    Popover,
    PopoverContent,
    PopoverTrigger,
  } from '@scylla/ui/primitives';
  import type { RoleEntity } from '../../../domain/entities/role.entity.ts';
  import { groupLabels, holderLabels, rolesMessages } from '../../messages/roles.messages.ts';
  import { copyGroups } from '../../presenters/role-copy.presenter.ts';
  import { roleName } from '../../role-labels.ts';
  import LevelTile from '../components/LevelTile.svelte';
  import type { CopySource } from './role-draft.state.svelte.ts';

  interface Props {
    roles: readonly RoleEntity[];
    /** The source of the last copy. */
    current: CopySource | null;
    onPick: (source: CopySource) => void;
  }

  let { roles, current, onPick }: Props = $props();

  let open = $state(false);
  let search = $state('');

  const groups = $derived(copyGroups(roles, search));
  const currentKey = $derived(current === 'empty' ? 'empty' : current?.key);

  const pick = (source: CopySource) => {
    open = false;
    onPick(source);
  };
</script>

<Popover
  bind:open
  onOpenChange={next => {
    if (next) search = '';
  }}
>
  <PopoverTrigger>
    {#snippet child({ props })}
      <Button
        {...props}
        variant="outline"
        class="h-[34px] shrink-0 gap-1.5 border-[1.5px] border-primary px-3.5 data-[state=open]:bg-accent"
      >
        <CopyIcon class="size-3.5" aria-hidden="true" />
        {t(rolesMessages.copyFromRole)}
        <ChevronDownIcon class="size-3.5" aria-hidden="true" />
      </Button>
    {/snippet}
  </PopoverTrigger>
  <PopoverContent
    class="w-[300px] max-w-[calc(100vw-2rem)] rounded-xl p-1.5"
    side="bottom"
    align="end"
    collisionPadding={16}
  >
    <Command shouldFilter={false} loop label={t(rolesMessages.copyFromRole)}>
      <div class="flex h-[34px] items-center gap-2 rounded-lg border border-input bg-background px-2.5">
        <SearchIcon class="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <CommandInput
          bind:value={search}
          autofocus
          class="h-8"
          placeholder={t(rolesMessages.search)}
          aria-label={t(rolesMessages.search)}
        />
      </div>
      <CommandList class="mt-px max-h-[min(26rem,55dvh)]">
        <CommandItem value="empty" class="gap-2 px-2.5 py-2" onSelect={() => pick('empty')}>
          <PlusIcon class="size-3.5 shrink-0" aria-hidden="true" />
          <span>{t(rolesMessages.emptyRole)}</span>
          <span class="min-w-0 flex-1 truncate text-xs text-muted-foreground">
            {t(rolesMessages.emptyRoleHint)}
          </span>
          {#if currentKey === 'empty'}
            <CheckIcon class="size-3.5 shrink-0 text-primary" aria-hidden="true" />
          {/if}
        </CommandItem>
        {#each groups as group (group.level)}
          <CommandGroup value={group.level} class="py-0">
            <div class="flex items-center gap-2 px-2.5 pt-2.5 pb-1 text-xs font-medium text-muted-foreground">
              <LevelTile level={group.level} class="size-[18px] rounded-[5px]" />
              {t(groupLabels[group.level])}
            </div>
            {#each group.roles as role (role.key)}
              <CommandItem
                value={role.key}
                class="gap-2 py-[7px] pr-2.5 pl-9"
                aria-current={currentKey === role.key ? 'true' : undefined}
                onSelect={() => pick(role)}
              >
                <span class="min-w-0 flex-1 truncate">{roleName(role)}</span>
                {#if !role.builtin}
                  <PencilIcon
                    class="size-3.5 shrink-0 text-primary"
                    role="img"
                    aria-label={t(rolesMessages.custom)}
                  />
                {/if}
                {#if role.holder === 'apps'}
                  <BotIcon
                    class="size-3.5 shrink-0 text-muted-foreground"
                    role="img"
                    aria-label={t(holderLabels.apps)}
                  />
                {/if}
                {#if currentKey === role.key}
                  <CheckIcon class="size-3.5 shrink-0 text-primary" aria-hidden="true" />
                {/if}
              </CommandItem>
            {/each}
          </CommandGroup>
        {/each}
        {#if groups.length === 0 && search.trim()}
          <p class="px-2.5 py-2 text-sm text-muted-foreground">{t(rolesMessages.noMatch)}</p>
        {/if}
      </CommandList>
    </Command>
  </PopoverContent>
</Popover>
