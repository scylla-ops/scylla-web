import { contextStore } from '@platform/context';
import { closeSession } from '../infrastructure/session.ts';

/**
 * Closes the session on the server, then a full page load: no query, store or permission of
 * the old session survives it.
 */
export const signOut = async (): Promise<void> => {
  await closeSession();
  contextStore.getState().reset();
  window.location.href = '/login';
};
