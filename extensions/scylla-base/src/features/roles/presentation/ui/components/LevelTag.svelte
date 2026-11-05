<script lang="ts">
  import FolderIcon from '@lucide/svelte/icons/folder';
  import ServerIcon from '@lucide/svelte/icons/server';
  import UsersRoundIcon from '@lucide/svelte/icons/users-round';
  import { t } from '@scylla/ui/i18n';
  import { Badge } from '@scylla/ui/primitives';
  import type { RoleLevel } from '../../../domain/entities/role.entity.ts';
  import { levelLabels } from '../../messages/roles.messages.ts';

  let { level }: { level: RoleLevel } = $props();

  const ICONS = { platform: ServerIcon, workspace: UsersRoundIcon, project: FolderIcon };
  const Icon = $derived(ICONS[level]);
</script>

<Badge variant="secondary" class="gap-1.5 rounded-full font-medium">
  <Icon class="size-3.5" />
  {t(levelLabels[level])}
</Badge>
