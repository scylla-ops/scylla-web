import { msg } from '@lingui/core/macro';

/** The texts of the photo and the initials of the own account. */
export const avatarMessages = {
  title: msg`Profile photo`,
  description: msg`Members of your workspaces see it: the member lists, the authors of the jobs, the account bar.`,
  uploadImage: msg`Upload an image`,
  imageRules: msg`PNG, JPEG or WebP · 1 MB max · 256 × 256`,
  initialsHint: msg`Your initials, on the color you choose`,
  useInitials: msg`Use my initials`,
  useInitialsTitle: msg`Use your initials instead?`,
  useInitialsDescription: msg`Your image is deleted. You cannot get it back.`,
  sources: msg`Kind of profile photo`,
  sourceInitials: msg`Initials`,
  sourceAvatar: msg`Avatar`,
  sourceImage: msg`Image`,
  useProviderPhoto: (provider: string) => msg`Use my ${provider} photo`,
  providerPhotoUsed: (provider: string) => msg`Your ${provider} photo is your profile photo`,
  replaceTitle: msg`Replace your profile photo?`,
  replaceDescription: (provider: string) =>
    msg`Your ${provider} photo replaces the current photo. The current photo is deleted.`,
  replace: msg`Replace`,
  providerPhotoFailed: (provider: string) =>
    msg`The ${provider} photo could not be imported. Try again later.`,
  changePhoto: msg`Change your photo`,
  glyphHint: msg`A figure in the colors you choose`,
  makeAvatar: msg`Make an avatar`,
  editAvatar: msg`Edit the avatar`,
};
