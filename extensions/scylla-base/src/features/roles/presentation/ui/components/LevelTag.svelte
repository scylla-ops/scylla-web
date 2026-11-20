<script lang="ts">
  import { t } from '@scylla/ui/i18n';
  import { Badge } from '@scylla/ui/primitives';
  import type { RoleLevel } from '../../../domain/entities/role.entity.ts';
  import { levelLabels } from '../../messages/roles.messages.ts';
  import { LEVEL_APPEARANCES } from '../../presenters/role-level.presenter.ts';

  let { level }: { level: RoleLevel } = $props();

  const Icon = $derived(LEVEL_APPEARANCES[level].icon);
</script>

<Badge variant="secondary" class="gap-1.5 rounded-full font-medium">
  <Icon class="size-3.5" />
  {t(levelLabels[level])}
</Badge>
