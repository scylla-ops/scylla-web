import { msg, plural } from '@lingui/core/macro';

export const pipelineSourceMessages = {
  title: msg`Pipeline source`,
  description: msg`Where the pipelines of this project live. One source per project.`,
  editor: msg`Scylla editor`,
  editorBody: msg`Draw the pipelines in Scylla. Triggers are set in Scylla.`,
  files: msg`Repository files`,
  formats: msg`TOML · YAML · JSON`,
  filesBody: msg`.scylla/pipeline.toml, or one file per pipeline in .scylla/pipelines/. Read at the commit of each run.`,
  manualOnly: msg`A file pipeline with no on section starts only on manual runs. Schedules and webhooks of a file pipeline stay in Scylla.`,

  foundOn: (branch: string, sha: string) => msg`Found on ${branch} at ${sha}`,
  noFileOn: (branch: string, sha: string) => msg`No pipeline file on ${branch} at ${sha}.`,
  readFailed: (branch: string) => msg`Scylla cannot read the files of ${branch} now.`,
  valid: msg`Valid`,
  errors: (count: number) => msg`${plural(count, { one: '# error', other: '# errors' })}`,
  triggers: (sections: string) => msg`on: ${sections}`,
  noOnSection: msg`no on section: manual runs only`,
  errorAt: (line: number, message: string) => msg`line ${line}: ${message}`,

  toFilesTitle: msg`Use the repository files?`,
  toFilesBody: (branch: string) =>
    msg`Scylla reads the pipeline files on ${branch}. The editor pipelines become archived: they are read only, their triggers stop, and their runs stay.`,
  toFilesEmpty: msg`With no file, the project has no pipeline until you add one to the repository.`,
  toFilesErrors: msg`A file with errors gives a pipeline whose runs fail with "Invalid pipeline file" until you correct the file.`,
  useFiles: msg`Use the files`,
  toEditorTitle: msg`Go back to the Scylla editor?`,
  toEditorBody: msg`The archived editor pipelines come back with their triggers. The file pipelines are hidden, and their runs stay.`,
  useEditor: msg`Use the editor`,
  nowFiles: msg`The pipelines now come from the repository files.`,
  nowEditor: msg`The pipelines now come from the Scylla editor.`,
};
