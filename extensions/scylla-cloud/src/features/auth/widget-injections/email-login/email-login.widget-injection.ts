import { msg } from '@lingui/core/macro';
import { loginPoints } from '@scylla/base-sdk';
import { FormItemType } from '@scylla/ui';

/** Cloud users sign in with their email: the words and the field type change together. */
export const EmailLoginWidgetInjection = [
  loginPoints.texts.override({
    identifier: msg`Email`,
    identifierPlaceholder: msg`you@example.com`,
    description: msg`Enter your email below to login to your account`,
  }),
  // The field becomes an email input. Its id stays: the submit reads it.
  loginPoints.fields.patch(fields =>
    fields.map(field =>
      field.id === 'identifier' && field.type === FormItemType.Input
        ? { ...field, inputType: 'email' as const }
        : field,
    ),
  ),
];
