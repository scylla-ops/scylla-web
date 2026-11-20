<script lang="ts">
  import ArrowDownIcon from '@lucide/svelte/icons/arrow-down';
  import ArrowUpIcon from '@lucide/svelte/icons/arrow-up';
  import ArrowUpDownIcon from '@lucide/svelte/icons/arrow-up-down';
  import { t } from '@scylla/ui/i18n';
  import { TableHead, TableHeader, TableRow } from '@scylla/ui/primitives';
  import { cn } from '@scylla/ui/utils';
  import { rolesMessages } from '../../messages/roles.messages.ts';
  import { nextSort, type RoleSort } from '../../presenters/roles-list.presenter.ts';

  let { sort, onSortChange }: { sort: RoleSort; onSortChange: (next: RoleSort) => void } = $props();

  const ARIA_SORT = { none: 'none', asc: 'ascending', desc: 'descending' } as const;
  const ICONS = { none: ArrowUpDownIcon, asc: ArrowUpIcon, desc: ArrowDownIcon };
  const Icon = $derived(ICONS[sort]);
</script>

<TableHeader>
  <TableRow>
    <TableHead class="h-10 text-sm" aria-sort={ARIA_SORT[sort]}>
      <button
        type="button"
        class="inline-flex items-center gap-1 text-foreground"
        onclick={() => onSortChange(nextSort(sort))}
      >
        {t(rolesMessages.role)}
        <Icon class={cn('size-3.5', sort === 'none' && 'text-muted-foreground/60')} />
      </button>
    </TableHead>
    <TableHead class="h-10 w-[356px] pl-0 text-sm">{t(rolesMessages.permissions)}</TableHead>
    <TableHead class="h-10 w-[184px] pl-0 text-sm">{t(rolesMessages.holders)}</TableHead>
    <TableHead class="h-10 w-8 pl-0"></TableHead>
  </TableRow>
</TableHeader>
