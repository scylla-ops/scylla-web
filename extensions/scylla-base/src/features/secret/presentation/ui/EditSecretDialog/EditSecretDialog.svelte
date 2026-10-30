<script lang="ts">
  import { createMutation } from '@scylla/core-sdk';
  import { FormDialog, FormItemType, type FormItem, type FormValues } from '@scylla/ui';
  import { t } from '@scylla/ui/i18n';
  import type { SecretEntity } from '@base/features/secret/domain/entities/secret.entity.ts';
  import {
    secretMutations,
    type UpdateSecretValues,
  } from '@base/features/secret/presentation/secret.queries.ts';
  import ReplaceSecretValueDialog from './ReplaceSecretValueDialog.svelte';
  import { editSecretMessages as messages } from '@base/features/secret/presentation/messages/edit-secret.messages.ts';

  interface Props {
    secret: SecretEntity | null;
    projectId: string;
    onClose: () => void;
  }

  let { secret, projectId, onClose }: Props = $props();

  const update = createMutation(() => secretMutations.update(projectId));

  let replacement = $state<UpdateSecretValues | null>(null);

  const items = $derived<readonly FormItem<'description' | 'value'>[]>([
    {
      id: 'description',
      label: t(messages.description),
      type: FormItemType.Input,
      inputType: 'text',
      optional: true,
      defaultValue: secret?.description ?? '',
    },
    {
      id: 'value',
      label: t(messages.newValue),
      placeholder: t(messages.keepValue),
      type: FormItemType.Input,
      inputType: 'text',
      optional: true,
    },
  ]);

  const handleSubmit = ({ description, value }: FormValues<'description' | 'value'>) => {
    if (!secret) return;
    const values = { secretId: secret.id, description: description.trim() };
    if (value.trim()) {
      replacement = { ...values, value };
      return;
    }
    update.mutate(values);
    onClose();
  };

  const finish = (confirmed: boolean) => {
    if (confirmed && replacement) update.mutate(replacement);
    replacement = null;
    onClose();
  };
</script>

<FormDialog
  open={secret !== null && replacement === null}
  onOpenChange={open => {
    if (!open) onClose();
  }}
  title={t(messages.title(secret?.name ?? ''))}
  {items}
  submitLabel={t(messages.save)}
  onSubmit={handleSubmit}
/>

<ReplaceSecretValueDialog
  open={replacement !== null}
  {projectId}
  secretName={secret?.name ?? ''}
  onCancel={() => finish(false)}
  onConfirm={() => finish(true)}
/>
