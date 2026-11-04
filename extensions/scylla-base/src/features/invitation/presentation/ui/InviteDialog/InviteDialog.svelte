<script lang="ts">
  import { createMutation } from '@scylla/core-sdk';
  import { FormDialog, FormItemType, type FormItem, type FormValues } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { checkEmail } from '@shared/utils/account-validation.ts';
  import { roleLabel, rolesOf } from '@base/features/access';
  import { invitationMutations } from '@base/features/invitation/presentation/invitation.queries.ts';
  import { invitationMessages } from '@base/features/invitation/presentation/messages/invitation.messages.ts';

  interface Props {
    open: boolean;
    setOpen: (open: boolean) => void;
    workspaceId: string;
  }

  let { open, setOpen, workspaceId }: Props = $props();

  const invite = createMutation(() => invitationMutations.create());

  const items: readonly FormItem<'email' | 'role'>[] = $derived([
    {
      id: 'email',
      label: t(invitationMessages.email),
      placeholder: t(invitationMessages.emailPlaceholder),
      type: FormItemType.Input,
      inputType: 'email',
      autocomplete: 'off',
      validate: checkEmail,
    },
    {
      id: 'role',
      label: t(invitationMessages.role),
      type: FormItemType.Select,
      defaultValue: 'member',
      options: rolesOf('workspace').map(role => ({ value: role, label: roleLabel(role) })),
    },
  ]);

  const handleSubmit = ({ email, role }: FormValues<'email' | 'role'>) => {
    invite.mutate({ workspaceId, email, role }, { onSuccess: () => setOpen(false) });
  };
</script>

<FormDialog
  {open}
  onOpenChange={setOpen}
  title={t(invitationMessages.inviteTitle)}
  description={t(invitationMessages.inviteDescription)}
  {items}
  isPending={invite.isPending}
  submitLabel={t(invitationMessages.send)}
  onSubmit={handleSubmit}
/>
