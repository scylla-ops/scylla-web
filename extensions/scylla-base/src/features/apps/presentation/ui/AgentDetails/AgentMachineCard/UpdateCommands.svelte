<script lang="ts">
  import { t } from '@scylla/ui/i18n';
  import { CopyBox } from '@shared/presentation/ui';
  import type { AppHost } from '@base/features/apps/domain/entities/app.entity.ts';
  import {
    dockerUpdateCommand,
    type ServerInfo,
    updateCommand,
  } from '@base/features/apps/domain/structs/agent-install.struct.ts';
  import { addAgentMessages } from '@base/features/apps/presentation/messages/add-agent.messages.ts';
  import { agentPageMessages as messages } from '@base/features/apps/presentation/messages/agent-page.messages.ts';

  interface Props {
    host: AppHost;
    /** The agent must be updated to run each job: the badge of its version tells it. */
    outdated: boolean;
    server: ServerInfo | undefined;
  }

  let { host, outdated, server }: Props = $props();

  const serverAddress: string = import.meta.env.VITE_API_URL || window.location.origin;
  const update = $derived(updateCommand(serverAddress, host.os));
</script>

<div class="mt-4 flex flex-col gap-2 border-t pt-4">
  {#if !outdated && server}
    <p class="text-xs">{t(messages.newVersion(host.version, server.version))}</p>
  {/if}
  {#if update}
    <CopyBox
      value={update}
      caption={t(messages.installedWithScript)}
      copyToast={t(addAgentMessages.copied)}
    />
  {/if}
  {#if host.os === 'linux' && server}
    <CopyBox
      value={dockerUpdateCommand(server.agentImage)}
      caption={t(messages.updateInDocker)}
      layout="lines"
      copyToast={t(addAgentMessages.copied)}
    />
  {/if}
</div>
