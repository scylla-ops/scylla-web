<script lang="ts">
  import type { MemberRoleEntity } from '@base/features/access';
  import { EntityIcon, swapIn, swapOut } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { createScopeIcon } from './scope-icon.svelte.ts';
  import { SCOPE_KINDS } from './scope-kinds.registry.ts';

  interface Props {
    kind: MemberRoleEntity['scopeKind'];
    /** With it, the label shows the icon of the scope in place of the glyph of its kind. */
    id?: string;
    name: string;
  }

  let { kind, id, name }: Props = $props();

  const Icon = $derived(SCOPE_KINDS[kind].icon);
  const scopeIcon = createScopeIcon(
    () => kind,
    () => id,
  );
</script>

<span class="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
  <span data-part="scope-icon" class="grid size-4 shrink-0 place-items-center *:col-start-1 *:row-start-1">
    {#if scopeIcon.props}
      <span class="flex" in:swapIn out:swapOut>
        <EntityIcon {...scopeIcon.props} size={16} />
      </span>
    {:else}
      <span class="flex" in:swapIn out:swapOut>
        <Icon class="size-3.5" aria-hidden="true" />
      </span>
    {/if}
  </span>
  <span class="sr-only">{t(SCOPE_KINDS[kind].label)}</span>
  <span class="truncate">{name}</span>
</span>
