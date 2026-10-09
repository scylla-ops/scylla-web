<script lang="ts">
  import { Button } from '@scylla/ui/shadcn';
  import { t } from '@scylla/ui/i18n';
  import type { UserDetail } from '../../user-detail.state.svelte.ts';
  import { userMessages } from '../user.messages.ts';

  let { page }: { page: UserDetail } = $props();
</script>

<div class="flex flex-wrap gap-3">
  <Button variant="outline" disabled={page.isBusy} onclick={page.sendResetLink}>
    {t(userMessages.sendResetLink)}
  </Button>
  <Button
    variant={page.user?.isActive ? 'destructive' : 'default'}
    disabled={page.isBusy}
    onclick={() => page.askStatusChange()}
  >
    {page.user?.isActive ? t(userMessages.deactivate) : t(userMessages.reactivate)}
  </Button>
</div>
