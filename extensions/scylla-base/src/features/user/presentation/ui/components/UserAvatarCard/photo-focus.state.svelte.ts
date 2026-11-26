import { scyllaNavigate } from '@platform/context';

/** A request to show the card of the photo: the card takes it when it mounts, or at once. */
export const photoFocus = $state({ pending: false });

/** Opens Account > Profile with the card of the photo in view, and the focus in it. */
export const openProfilePhoto = (): void => {
  photoFocus.pending = true;
  scyllaNavigate.goToWorkspaceRoute('/account/profile');
};
