<script lang="ts">
  import type { MemberRoleEntity } from '@base/features/access';
  import { t } from '@scylla/ui/i18n';
  import { SCOPE_KINDS } from './scope-kinds.registry.ts';

  interface Props {
    kind: MemberRoleEntity['scopeKind'];
    name: string;
  }

  let { kind, name }: Props = $props();

  const Icon = $derived(SCOPE_KINDS[kind].icon);
</script>

<span class="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
  <Icon class="size-3.5 shrink-0" aria-hidden="true" />
  <span class="sr-only">{t(SCOPE_KINDS[kind].label)}</span>
  <span class="truncate">{name}</span>
</span>
