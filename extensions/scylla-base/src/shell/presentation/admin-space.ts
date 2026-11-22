import { navLinks } from '@scylla/core-sdk';

/** The nav section of the pages of the server, and the id of their space. */
export const ADMIN_SECTION = 'instance';

/** The path of the administration of the server: outside any workspace. */
export const ADMIN_PATH = '/admin';

export const isAdminPath = (pathname: string): boolean =>
  pathname === ADMIN_PATH || pathname.startsWith(`${ADMIN_PATH}/`);

/** Reactive. The first page of the administration that the person may open, if any. */
export const adminHome = (): string | undefined =>
  navLinks().find(link => link.section.id === ADMIN_SECTION)?.href;
