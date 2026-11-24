<script lang="ts">
  import { createMutation, createQuery } from '@scylla/core-sdk';
  import { FormDialog, FormItemType, type FormItem, type FormValues } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import { toast } from '@scylla/ui/utils';
  import { i18n } from '@lingui/core';
  import { checkEmail } from '@shared/utils/account-validation.ts';
  import {
    myIdentityQueries,
    userMutations,
  } from '@base/features/user/presentation/user.queries.ts';
  import { userMessages } from '@base/features/user/presentation/messages/user.messages.ts';

  interface Props {
    open: boolean;
    setOpen: (open: boolean) => void;
  }

  let { open, setOpen }: Props = $props();

  // An account made with a provider has no password to give.
  const methods = createQuery(() => myIdentityQueries.signInMethods());
  const hasPassword = $derived(methods.data?.hasPassword ?? true);

  const request = createMutation(() => userMutations.requestEmailChange());

  const items: readonly FormItem<'email' | 'password'>[] = $derived([
    {
      id: 'email',
      label: t(userMessages.newEmail),
      type: FormItemType.Input,
      inputType: 'email',
      autocomplete: 'email',
      validate: checkEmail,
    },
    ...(hasPassword
      ? [
          {
            id: 'password' as const,
            label: t(userMessages.currentPasswordForEmail),
            type: FormItemType.Input as const,
            inputType: 'password' as const,
            autocomplete: 'current-password' as const,
          },
        ]
      : []),
  ]);

  const handleSubmit = ({ email, password }: FormValues<'email' | 'password'>) => {
    request.mutate(
      { newEmail: email, password: password ?? '' },
      {
        onSuccess: refusal => {
          if (refusal) {
            toast.error(refusal);
            return;
          }
          toast.success(i18n._(userMessages.emailLinkSent(email.trim())));
          setOpen(false);
        },
      },
    );
  };
</script>

<FormDialog
  {open}
  onOpenChange={setOpen}
  title={t(userMessages.changeEmail)}
  description={t(userMessages.emailDescription)}
  {items}
  isPending={request.isPending}
  submitLabel={t(userMessages.sendEmailLink)}
  onSubmit={handleSubmit}
/>
