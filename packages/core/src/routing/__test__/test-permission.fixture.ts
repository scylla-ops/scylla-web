import type { RoutePermission } from '@scylla/core-sdk';

/** The core never knows the type of a permission: an extension registers it. */
export const testPermission = (name: string): RoutePermission => name as unknown as RoutePermission;

export const LIST_USERS = testPermission('LIST_USERS');
export const LIST_SECRETS = testPermission('LIST_SECRETS');
export const CREATE_SECRET = testPermission('CREATE_SECRET');
export const READ_PROJECT = testPermission('READ_PROJECT');

/** What `TestGuard.fixture.svelte` lets through. Set it before the page renders. */
export const granted = new Set<RoutePermission>();
