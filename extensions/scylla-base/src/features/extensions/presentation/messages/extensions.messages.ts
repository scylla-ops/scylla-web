import { msg, plural } from '@lingui/core/macro';

export const extensionsMessages = {
  platform: msg`Platform`,
  extension: msg`Extension`,
  extensions: msg`Extensions`,
  loadError: msg`The installed extensions could not be read.`,
  noExtensions: msg`No extension is installed.`,
  active: msg({ context: 'feminine', message: 'Active' }),
  dependsOn: msg`Depends on`,
  noDependency: msg`No dependency`,
  moduleCount: (count: number) => msg`${plural(count, { one: '# module', other: '# modules' })}`,
  pageCount: (count: number) => msg`${plural(count, { one: '# page', other: '# pages' })}`,
};
