// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest';
import { installTestNavigator } from '@test/navigator.ts';
import { rolesCommands } from '../roles.commands.ts';

let navigator: ReturnType<typeof installTestNavigator> | undefined;

afterEach(() => navigator?.restore());

const formPath = (id: string) => {
  const command = rolesCommands.find(item => item.id === id);
  if (!command || !('path' in command.form)) throw new Error(id);
  return command.form.path();
};

describe('the commands of the roles', () => {
  it('opens the form of a workspace role in the workspace of the page', () => {
    navigator = installTestNavigator({ params: { workspaceSlug: 'acme' } });

    expect(formPath('roles.create-workspace')).toBe('/acme/access/roles/new');
  });

  it('opens the form of an instance role in the administration, also outside a workspace', () => {
    navigator = installTestNavigator({ pathname: '/admin/users' });

    expect(formPath('roles.create-instance')).toBe('/admin/roles/new');
  });
});
