import { msg } from '@lingui/core/macro';

/** The texts of the photo and the initials of the own account. */
export const avatarMessages = {
  title: msg`Profile photo`,
  description: msg`Members of your workspaces see it: the member lists, the authors of the jobs, the account bar.`,
  uploadImage: msg`Upload an image`,
  removeImage: msg`Remove the image`,
  imageRules: msg`PNG, JPEG or WebP · 1 MB max · cropped to a square (256 × 256)`,
  initialsHint: msg`Without an image: your initials, on the color you choose`,
  mainColor: msg`Main color`,
  chartColor: (index: number) => msg`Color ${index}`,
  grey: msg`Grey`,
};
