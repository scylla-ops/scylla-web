<script lang="ts">
  import { createMutation } from '@scylla/core-sdk';
  import { Button, DialogFooter, Input, Label } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { appMutations } from '@base/features/apps/presentation/apps.queries.ts';
  import { agentPageMessages as messages } from '@base/features/apps/presentation/messages/agent-page.messages.ts';

  interface Props {
    appId: string;
    appName: string;
    app: boolean;
    close: () => void;
    onDeleted: () => void;
  }

  let { appId, appName, app, close, onDeleted }: Props = $props();

  const remove = createMutation(() => appMutations.remove(app ? 'app' : 'agent'));

  let typed = $state('');

  const submit = (event: SubmitEvent) => {
    event.preventDefault();
    if (typed === appName) remove.mutate(appId, { onSuccess: onDeleted });
  };
</script>

<form id="delete-agent" class="flex flex-col gap-1.5" onsubmit={submit}>
  <Label for="delete-agent-name">{t(messages.typeToConfirm(appName))}</Label>
  <Input id="delete-agent-name" bind:value={typed} autocomplete="off" />
</form>
<DialogFooter>
  <Button variant="outline" data-dialog-dismiss onclick={close}>{t(messages.cancel)}</Button>
  <Button
    type="submit"
    form="delete-agent"
    variant="destructive"
    disabled={typed !== appName || remove.isPending}
  >
    {t(messages.delete)}
  </Button>
</DialogFooter>
