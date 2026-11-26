<script lang="ts">
  import { apiAnswers, serviceStatus } from '@platform/grpc';
  import { enter, exit } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { layoutMessages } from '@base/shell/presentation/layout/messages/layout.messages.ts';

  const POLL_MS = 5000;

  // While the API is down, ask it every few seconds. When it answers, the page loads again: no
  // action of the user, and no screen that shows data of before the outage.
  $effect(() => {
    if (!serviceStatus.unavailable) return;
    const timer = setInterval(() => {
      void apiAnswers().then(answers => {
        if (answers) window.location.reload();
      });
    }, POLL_MS);
    return () => clearInterval(timer);
  });
</script>

<!-- One banner for the whole app, over each page: an outage shows no toast for each failed call. -->
{#if serviceStatus.unavailable}
  <div
    in:enter
    out:exit
    role="alert"
    class="fixed inset-x-0 top-0 z-50 flex items-center justify-center bg-destructive px-4 py-2 text-center text-sm font-medium text-destructive-foreground"
  >
    {t(layoutMessages.serviceUnavailable)}
  </div>
{/if}
