<script lang="ts">
  import { Badge } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { userMessages } from '../user.messages.ts';

  let { isActive }: { isActive: boolean } = $props();
</script>

<Badge variant={isActive ? 'default' : 'secondary'}>
  {isActive ? t(userMessages.active) : t(userMessages.deactivated)}
</Badge>
