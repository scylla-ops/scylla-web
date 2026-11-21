import { contextStore } from '@platform/context';
import { forgetAccountStorage } from '../infrastructure/account-storage.ts';
import { closeSession } from '../infrastructure/session.ts';

/**
 * Closes the session on the server, removes the local keys of the account, then a full page load:
 * no query, store or permission of the old session survives it.
 */
export const signOut = async (): Promise<void> => {
  await closeSession();
  contextStore.getState().reset();
  forgetAccountStorage();
  window.location.href = '/login';
};
