<script lang="ts">
  import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
  } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { CopyBox } from '@shared/presentation/ui';
  import {
    DOCKER_UNINSTALL_COMMAND,
    uninstallCommand,
  } from '@base/features/apps/domain/structs/agent-install.struct.ts';
  import { addAgentMessages } from '@base/features/apps/presentation/messages/add-agent.messages.ts';
  import { agentPageMessages as messages } from '@base/features/apps/presentation/messages/agent-page.messages.ts';

  interface Props {
    /** The system of the machine of the agent. */
    os: string;
  }

  let { os }: Props = $props();

  const server: string = import.meta.env.VITE_API_URL || window.location.origin;
  const command = $derived(uninstallCommand(server, os));
</script>

<!-- A Docker agent reports linux: Linux also shows the Docker command. -->
{#if command}
  <Card class="gap-4">
    <CardHeader>
      <CardTitle><h2>{t(messages.uninstallTitle)}</h2></CardTitle>
      <CardDescription>{t(messages.uninstallHint)}</CardDescription>
    </CardHeader>
    <CardContent class="flex flex-col gap-2">
      <CopyBox
        value={command}
        caption={t(messages.installedWithScript)}
        copyToast={t(addAgentMessages.copied)}
      />
      {#if os === 'linux'}
        <CopyBox
          value={DOCKER_UNINSTALL_COMMAND}
          caption={t(messages.runsInDocker)}
          layout="lines"
          copyToast={t(addAgentMessages.copied)}
        />
      {/if}
    </CardContent>
  </Card>
{/if}
