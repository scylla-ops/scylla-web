import { msg } from '@lingui/core/macro';

export const iconPickerMessages = {
  reset: msg`Reset`,
  iconTab: msg`Icon`,
  imageTab: msg`Image`,
  search: msg`Search for an icon (rocket, server, database…)`,
  noGlyph: msg`No icon matches this search.`,
  color: msg`Color`,
  mainColor: msg`Main color`,
  chartColor: (index: number) => msg`Color ${index}`,
  grey: msg`Grey`,
  freeColor: msg`Free color`,
  dropHere: msg`Drop an image here, or`,
  browse: msg`browse`,
  imageRules: msg`PNG, JPEG or WebP · 1 MB max · cropped to a square (256 × 256)`,
  tooLarge: msg`This file is too large: 1 MB max.`,
  wrongType: msg`This type of file is not accepted: use PNG, JPEG or WebP.`,
};
