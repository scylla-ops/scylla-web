<script lang="ts">
  import { StatusShape } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { userMessages } from '@base/features/user/presentation/messages/user.messages.ts';

  let { isActive }: { isActive: boolean } = $props();

  const label = $derived(isActive ? t(userMessages.active) : t(userMessages.deactivated));
</script>

<span class="inline-flex items-center gap-1.5 text-xs font-medium">
  <StatusShape state={isActive ? 'success' : 'cancelled'} {label} size={20} />
  <span aria-hidden="true">{label}</span>
</span>
