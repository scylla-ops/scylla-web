// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  checkDisplayName,
  checkEmail,
  checkNewPassword,
  checkPasswordConfirmation,
  checkUsername,
} from '../account-validation.ts';
import { accountValidationMessages } from '../account-validation.messages.ts';

describe('checkEmail', () => {
  it.each(['ada@example.com', '  ada@example.com  ', 'a.b+c@mail.example.org'])(
    'accepts %s',
    value => {
      expect(checkEmail(value)).toBeUndefined();
    },
  );

  it.each(['ada', 'ada@', '@example.com', 'ada@example', 'ada @example.com'])(
    'refuses %s',
    value => {
      expect(checkEmail(value)).toBe(accountValidationMessages.invalidEmail);
    },
  );
});

describe('checkNewPassword', () => {
  it('refuses fewer than 8 characters', () => {
    expect(checkNewPassword('1234567')).toBe(accountValidationMessages.passwordLength);
  });

  it('accepts 8 and 255 characters', () => {
    expect(checkNewPassword('12345678')).toBeUndefined();
    expect(checkNewPassword('a'.repeat(255))).toBeUndefined();
  });

  it('refuses more than 255 characters', () => {
    expect(checkNewPassword('a'.repeat(256))).toBe(accountValidationMessages.passwordLength);
  });

  it('refuses a password of spaces only, whatever its length', () => {
    expect(checkNewPassword(' '.repeat(12))).toBe(accountValidationMessages.passwordBlank);
  });

  it('counts a character outside the BMP once, as the backend does', () => {
    expect(checkNewPassword('😀'.repeat(8))).toBeUndefined();
    expect(checkNewPassword('😀'.repeat(4))).toBe(accountValidationMessages.passwordLength);
  });
});

describe('checkPasswordConfirmation', () => {
  it('accepts the same value', () => {
    expect(checkPasswordConfirmation('hunter22', 'hunter22')).toBeUndefined();
  });

  it('refuses a different value', () => {
    expect(checkPasswordConfirmation('hunter2', 'hunter22')).toBe(
      accountValidationMessages.passwordMismatch,
    );
  });
});

describe('checkUsername', () => {
  it('accepts a handle', () => {
    expect(checkUsername('ada.lovelace')).toBeUndefined();
  });

  it('refuses an "@", which would make it an email at sign-in', () => {
    expect(checkUsername('ada@home')).toBe(accountValidationMessages.usernameAt);
  });

  it('counts the bytes of the trimmed value, at most 255', () => {
    expect(checkUsername(` ${'a'.repeat(255)} `)).toBeUndefined();
    expect(checkUsername('a'.repeat(256))).toBe(accountValidationMessages.usernameLength);
    expect(checkUsername('é'.repeat(128))).toBe(accountValidationMessages.usernameLength);
  });
});

describe('checkDisplayName', () => {
  it('accepts 100 characters after the trim', () => {
    expect(checkDisplayName(` ${'a'.repeat(100)} `)).toBeUndefined();
  });

  it('refuses more than 100 characters', () => {
    expect(checkDisplayName('a'.repeat(101))).toBe(accountValidationMessages.displayNameLength);
  });

  it('accepts spaces only: that is no display name', () => {
    expect(checkDisplayName('   ')).toBeUndefined();
  });
});
