import { loginPoints } from '@scylla/base-sdk';
import type { WidgetInjection } from '@scylla/core-sdk';
import { FormItemType } from '@scylla/ui';
import { emailLoginMessages } from './email-login.messages.ts';

/** Cloud users sign in with their email: the words and the field type change together. */
export const EmailLoginWidgetInjection = {
  id: 'cloud-email-login',
  changes: [
    // The words: messages, so they stay in the catalogs and follow a change of language.
    loginPoints.texts.override({
      identifier: emailLoginMessages.email,
      identifierPlaceholder: emailLoginMessages.emailPlaceholder,
      description: emailLoginMessages.description,
    }),
    // The structure: the field becomes an email input. Its id stays: the submit reads it.
    loginPoints.fields.patch(fields =>
      fields.map(field =>
        field.id === 'identifier' && field.type === FormItemType.Input
          ? { ...field, inputType: 'email' as const }
          : field,
      ),
    ),
  ],
} satisfies WidgetInjection;
