<script lang="ts">
  import { ScyllaDialog } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { Button } from '@scylla/ui/primitives';
  import {
    cannotRemove,
    lastOwnerBody,
    membershipMessages,
  } from '../../../messages/membership.messages.ts';

  interface Props {
    /** Absent: the dialog is closed. */
    name?: string;
    workspaceName: string;
    onClose: () => void;
  }

  let { name, workspaceName, onClose }: Props = $props();
</script>

<ScyllaDialog
  open={name !== undefined}
  onOpenChange={open => {
    if (!open) onClose();
  }}
  title={t(cannotRemove(name ?? ''))}
  description={t(lastOwnerBody(name ?? '', workspaceName))}
>
  <div class="flex justify-end">
    <Button onclick={onClose}>{t(membershipMessages.ok)}</Button>
  </div>
</ScyllaDialog>
