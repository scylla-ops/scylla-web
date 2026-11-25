import { msg } from '@lingui/core/macro';

export const exportMessages = {
  export: msg`Export`,
  exportDenied: msg`You don't have permission to read this pipeline.`,
  title: (name: string) => msg`Export ${name}`,
  titleUnnamed: msg`Export the pipeline`,
  description: msg`The pipeline as a file for the repository: put it at this path, then use the repository files as the source of the project.`,
  formats: msg`File format`,
  savedVersion: msg`The file has the saved version. Save the pipeline to export your changes.`,
  keyNote: (key: string) =>
    msg`On the default branch, this file takes the key ${key}: the file pipeline then sends the check scylla/${key}, and this Scylla pipeline stops sending it.`,
  failed: msg`Scylla could not write the file.`,
  retry: msg`Try again`,
  copy: msg`Copy`,
  download: msg`Download`,
  copied: msg`File copied`,
  conditionalNodes: msg`The saved pipeline has a switch, a merge or a node linked to an error output. A file cannot hold them yet.`,
};
