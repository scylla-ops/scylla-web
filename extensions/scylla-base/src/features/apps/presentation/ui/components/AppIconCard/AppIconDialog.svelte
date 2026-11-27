<script lang="ts">
  import { ScyllaDialog } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import type { AppEntity } from '@base/features/apps/domain/entities/app.entity.ts';
  import { agentPageMessages as messages } from '@base/features/apps/presentation/messages/agent-page.messages.ts';
  import { appPageMessages } from '@base/features/apps/presentation/messages/app-page.messages.ts';
  import AppIconForm from './AppIconForm.svelte';

  interface Props {
    app: Pick<AppEntity, 'id' | 'name' | 'icon' | 'runner'>;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Opens on the Avatar tab: "Make an avatar". */
    avatar?: boolean;
  }

  let { app, open, onOpenChange, avatar = false }: Props = $props();
</script>

<!--
  The card, the avatar of the header and its menu open it. The form is built again at each
  opening: it starts on the icon of the app.
-->
<ScyllaDialog
  {open}
  {onOpenChange}
  title={t(app.runner ? messages.icon : appPageMessages.icon)}
  description={t(app.runner ? messages.iconDialogDescription : appPageMessages.iconDialogDescription)}
  stable={38}
  class="sm:max-w-lg"
>
  <AppIconForm {app} {avatar} close={() => onOpenChange(false)} />
</ScyllaDialog>
