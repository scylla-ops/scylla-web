import { msg, plural } from '@lingui/core/macro';

export const tokenLabelMessages = {
  readOnly: msg`Read-only`,
  deploy: msg`Deploy`,
  full: msg`Full`,
  custom: msg`Custom`,
  allProjects: msg`all projects`,
  projectCount: (count: number) => msg`${plural(count, { one: '# project', other: '# projects' })}`,
  expiresIn: (count: number) =>
    msg`${plural(count, { 0: 'Expires today', one: 'Expires in # day', other: 'Expires in # days' })}`,
  expiredOn: (day: string) => msg`Expired on ${day}`,
  revokedOn: (day: string) => msg`Revoked on ${day}`,
};
