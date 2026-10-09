import type { MessageDescriptor } from '@lingui/core';
import { accountValidationMessages } from './account-validation.messages.ts';

/**
 * The account rules of the backend, checked before the call. Each check gives the message of a
 * wrong value, or `undefined`: the shape of `FormItem.validate`. The backend trims the names;
 * an empty required field is the form's own check.
 */

const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 255;
const USERNAME_MAX_BYTES = 255;
const DISPLAY_NAME_MAX_LENGTH = 100;

/** In characters, as the backend counts them, not in UTF-16 units. */
const characters = (value: string): number => [...value].length;

export const checkEmail = (value: string): MessageDescriptor | undefined =>
  EMAIL_FORMAT.test(value.trim()) ? undefined : accountValidationMessages.invalidEmail;

export const checkNewPassword = (value: string): MessageDescriptor | undefined => {
  if (value.trim().length === 0) return accountValidationMessages.passwordBlank;
  const length = characters(value);
  return length < PASSWORD_MIN_LENGTH || length > PASSWORD_MAX_LENGTH
    ? accountValidationMessages.passwordLength
    : undefined;
};

export const checkPasswordConfirmation = (
  value: string,
  newPassword: string,
): MessageDescriptor | undefined =>
  value === newPassword ? undefined : accountValidationMessages.passwordMismatch;

/** A username never holds '@': the sign-in reads an identifier with '@' as an email. */
export const checkUsername = (value: string): MessageDescriptor | undefined => {
  const username = value.trim();
  if (username.includes('@')) return accountValidationMessages.usernameAt;
  return new TextEncoder().encode(username).length > USERNAME_MAX_BYTES
    ? accountValidationMessages.usernameLength
    : undefined;
};

/** Spaces only is no display name, which is allowed. */
export const checkDisplayName = (value: string): MessageDescriptor | undefined =>
  characters(value.trim()) > DISPLAY_NAME_MAX_LENGTH
    ? accountValidationMessages.displayNameLength
    : undefined;
