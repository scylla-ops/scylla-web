<script lang="ts">
  import BotIcon from '@lucide/svelte/icons/bot';
  import LockIcon from '@lucide/svelte/icons/lock';
  import ShieldCheckIcon from '@lucide/svelte/icons/shield-check';
  import { RoleKind } from '@platform/authz';
  import { Badge, Checkbox } from '@scylla/ui/shadcn';
  import { cn } from '@scylla/ui/utils';
  import { t } from '@scylla/ui/i18n';
  import type { RoleEntity } from '../../../../domain/entities/role.entity.ts';
  import { scopeLabelOf } from '../../../utils/permission-mapping.ts';
  import { rolesMessages } from '../../roles.messages.ts';

  interface Props {
    role: RoleEntity;
    /** `null`: the grants are out of reach, so no count is shown. */
    memberCount: number | null;
    active: boolean;
    selected: boolean;
    /** False for builtins, for read-only roles, or without the rights. */
    selectable: boolean;
    /** A platform role seen from an organization. */
    locked?: boolean;
    onOpen: () => void;
    onToggleSelect: () => void;
  }

  let {
    role,
    memberCount,
    active,
    selected,
    selectable,
    locked = false,
    onOpen,
    onToggleSelect,
  }: Props = $props();

  const appsOnly = $derived(role.kind === RoleKind.AGENT);
</script>

<div
  role="button"
  tabindex="0"
  onclick={onOpen}
  onkeydown={event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onOpen();
    }
  }}
  class={cn(
    'group flex w-full cursor-pointer items-center gap-4 overflow-hidden rounded-xl border p-4 transition-all duration-200',
    active
      ? 'border-primary/40 bg-primary/6 hover:border-primary/40'
      : 'hover:border-slate-300 hover:shadow-sm',
  )}
>
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div
    class="flex w-5 items-center justify-center"
    onclick={event => event.stopPropagation()}
  >
    <Checkbox
      checked={selected}
      disabled={!selectable}
      aria-label={role.name}
      onCheckedChange={onToggleSelect}
    />
  </div>

  <div class="mr-4 flex w-full min-w-0 flex-1 items-center gap-3 overflow-hidden">
    <div
      class={cn(
        'flex size-9 shrink-0 items-center justify-center rounded-lg',
        locked ? 'bg-muted' : 'bg-primary/10',
      )}
    >
      {#if appsOnly}
        <BotIcon class={cn('size-4', locked ? 'text-muted-foreground' : 'text-primary')} />
      {:else}
        <ShieldCheckIcon class={cn('size-4', locked ? 'text-muted-foreground' : 'text-primary')} />
      {/if}
    </div>
    <div class="flex min-w-0 flex-1 flex-col items-start">
      <p class="flex w-full min-w-0 items-center gap-2">
        <span class="truncate font-semibold text-foreground">{role.name}</span>
        {#if appsOnly}
          <Badge variant="outline" class="shrink-0">{t(rolesMessages.appsOnly)}</Badge>
        {/if}
      </p>
      <p class="w-full truncate text-xs text-muted-foreground">
        {role.description || t(rolesMessages.noDescription)}
      </p>
    </div>
  </div>

  <div class="flex items-center gap-1.5">
    <Badge variant="secondary">{scopeLabelOf(role.scope)}</Badge>
    {#if memberCount !== null}
      <Badge variant="outline">{t(rolesMessages.memberCount(memberCount))}</Badge>
    {/if}
    {#if locked}
      <LockIcon class="size-3.5 text-muted-foreground" aria-hidden="true" />
      <span class="sr-only">{t(rolesMessages.readOnly)}</span>
    {/if}
  </div>
</div>
