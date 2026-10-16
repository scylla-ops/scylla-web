import { msg } from '@lingui/core/macro';

export const accountValidationMessages = {
  invalidEmail: msg`Enter a valid email address.`,
  passwordLength: msg`The password must have 8 to 255 characters.`,
  passwordBlank: msg`The password cannot be only spaces.`,
  passwordMismatch: msg`The two passwords are not the same.`,
  usernameAt: msg`A username cannot contain "@".`,
  usernameLength: msg`The username is too long: 255 bytes at most.`,
  displayNameLength: msg`The display name must have 100 characters at most.`,
};
