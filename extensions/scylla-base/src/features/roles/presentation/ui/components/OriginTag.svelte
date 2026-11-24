<script lang="ts">
  import { t } from '@scylla/ui/i18n';
  import { Badge } from '@scylla/ui/primitives';
  import { rolesMessages } from '../../messages/roles.messages.ts';

  let { builtin }: { builtin: boolean } = $props();
</script>

<Badge variant="outline" class="rounded-full font-medium">
  {builtin ? t(rolesMessages.builtIn) : t(rolesMessages.custom)}
</Badge>
