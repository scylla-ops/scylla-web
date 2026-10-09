import { contextStore } from '@platform/context';
import { closeSession } from '../infrastructure/session/session.ts';

/** A full page load: no query, store or permission of the old session survives it. */
export const signOut = (): void => {
  closeSession();
  contextStore.getState().reset();
  window.location.href = '/login';
};
