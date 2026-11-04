<script lang="ts">
  import { t } from '@scylla/ui/i18n';
  import { formatDate } from '@shared/utils/date-utils.ts';
  import type { JoinCode } from '@base/features/apps/domain/entities/app.entity.ts';
  import CopyBox from '../CopyBox/CopyBox.svelte';
  import { appsMessages } from '@base/features/apps/presentation/messages/apps.messages.ts';

  interface Props {
    joinCode: JoinCode;
    /** An agent gets the commands of `scylla-agent`; another app, the code alone. */
    runner: boolean;
  }

  let { joinCode, runner }: Props = $props();

  const server: string = import.meta.env.VITE_API_URL || window.location.origin;
  const config = '/var/lib/scylla-agent/agent.json';
  const commands = $derived(
    `scylla-agent --config ${config} join ${server} ${joinCode.code}\n` +
      `scylla-agent --config ${config} run`,
  );
</script>

<div class="flex flex-col gap-3">
  <p class="text-sm">{t(runner ? appsMessages.joinAgent : appsMessages.joinApp)}</p>
  <CopyBox
    value={runner ? commands : joinCode.code}
    secret={joinCode.code}
    layout={runner ? 'lines' : 'wrap'}
    copyToast={t(appsMessages.codeCopied)}
    focusOnMount
  />
  <p class="text-xs text-muted-foreground">
    {t(appsMessages.joinExpires(formatDate(joinCode.expiresAt)))}
  </p>
</div>
