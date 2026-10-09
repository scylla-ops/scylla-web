import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { render } from '@test/render.svelte.ts';
import type { UserEntity } from '../../../../domain/entities/user.entity.ts';
import UserProfileForm from './UserProfileForm.svelte';

const ada: UserEntity = {
  userId: 'user-1',
  username: 'ada',
  email: 'ada@example.com',
  isActive: true,
  updatedAt: '2025-01-01T00:00:00.000Z',
};

describe('UserProfileForm', () => {
  it('seeds the fields from the user, the display name empty when it has none', () => {
    render(UserProfileForm, { user: ada, emailEditable: false, onSave: vi.fn() });

    expect(screen.getByLabelText('Display name')).toHaveValue('');
    expect(screen.getByLabelText('Username')).toHaveValue('ada');
    expect(screen.getByLabelText('Email')).toHaveValue('ada@example.com');
  });

  it('gives each field its autocomplete value', () => {
    render(UserProfileForm, { user: ada, emailEditable: true, onSave: vi.fn() });

    expect(screen.getByLabelText('Display name')).toHaveAttribute('autocomplete', 'name');
    expect(screen.getByLabelText('Username')).toHaveAttribute('autocomplete', 'username');
    expect(screen.getByLabelText('Email')).toHaveAttribute('autocomplete', 'email');
  });

  it('checks the format of an editable email before it saves', async () => {
    const onSave = vi.fn();
    render(UserProfileForm, { user: ada, emailEditable: true, onSave });
    const user = userEvent.setup();

    await user.clear(screen.getByLabelText('Email'));
    await user.type(screen.getByLabelText('Email'), 'not-an-email');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('hands the values to onSave', async () => {
    const onSave = vi.fn();
    render(UserProfileForm, { user: ada, emailEditable: false, onSave });
    const user = userEvent.setup();

    await user.type(screen.getByLabelText('Display name'), 'Ada');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSave).toHaveBeenCalledWith({
      displayName: 'Ada',
      username: 'ada',
      email: 'ada@example.com',
    });
  });

  it('has no save button for a viewer who may not change the user', () => {
    render(UserProfileForm, { user: ada, emailEditable: false, canEdit: false, onSave: vi.fn() });

    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Display name')).toHaveAttribute('readonly');
  });

  it('checks the username and the display name before it saves', async () => {
    const onSave = vi.fn();
    render(UserProfileForm, { user: ada, emailEditable: false, onSave });
    const user = userEvent.setup();

    await user.type(screen.getByLabelText('Username'), '@home');
    await user.type(screen.getByLabelText('Display name'), 'a'.repeat(101));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByLabelText('Username')).toHaveAccessibleDescription(
      'A handle that other people see. A username cannot contain "@".',
    );
    expect(
      screen.getByText('The display name must have 100 characters at most.'),
    ).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });
});
