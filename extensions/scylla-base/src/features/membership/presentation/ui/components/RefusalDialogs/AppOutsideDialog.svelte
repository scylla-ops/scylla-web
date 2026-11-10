<script lang="ts">
  import { Permission, can } from '@platform/authz';
  import { navigateTo, routePathname } from '@scylla/core-sdk';
  import { ScyllaDialog } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { Button } from '@scylla/ui/primitives';
  import {
    appOutsideBody,
    cannotAdd,
    membershipMessages,
    newAppIn,
  } from '../../../messages/membership.messages.ts';

  interface Props {
    open: boolean;
    name: string;
    workspaceName: string;
    onClose: () => void;
  }

  let { open, name, workspaceName, onClose }: Props = $props();

  const slug = $derived(routePathname().split('/')[1] ?? '');
  const canAddApp = $derived(can(Permission.LIST_APPS_BY_WORKSPACE) && can(Permission.CREATE_APP));
</script>

<ScyllaDialog
  {open}
  onOpenChange={value => {
    if (!value) onClose();
  }}
  title={t(cannotAdd(name, workspaceName))}
  description={t(appOutsideBody(name, workspaceName))}
>
  <div class="flex justify-end gap-2">
    <Button variant="outline" onclick={onClose}>{t(membershipMessages.close)}</Button>
    {#if canAddApp}
      <Button onclick={() => navigateTo(`/${slug}/apps`)}>{t(newAppIn(workspaceName))}</Button>
    {/if}
  </div>
</ScyllaDialog>
