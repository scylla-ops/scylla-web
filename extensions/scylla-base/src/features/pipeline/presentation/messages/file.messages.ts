import { msg, plural } from '@lingui/core/macro';

/** The page of a file pipeline, and the state of a file in the list. */
export const fileMessages = {
  fromFile: msg`From file`,
  readOnly: msg`Read only`,
  branch: msg`Branch`,
  file: msg`File`,
  comesFrom: (path: string, branch: string, sha: string) =>
    msg`This pipeline comes from ${path} on ${branch} at ${sha}. Change it in the repository.`,
  invalidOn: (file: string, count: number, branch: string, sha: string) =>
    msg`${file} has ${plural(count, { one: '# error', other: '# errors' })} on ${branch} at ${sha}. The graph shows the last valid version.`,
  missingOn: (branch: string) =>
    msg`This pipeline has no file on ${branch}. The graph shows the last valid version.`,
  readFailed: msg`Scylla could not read the file. The graph shows the last valid version.`,
  viewFileOn: (provider: string) => msg`View file on ${provider}`,
  viewFileAt: (sha: string) => msg`View file at ${sha}`,

  panelTitle: msg`Pipeline file`,
  errorsOn: (branch: string) => msg`Errors on ${branch}`,
  triggersFromOn: msg`Triggers · from on`,
  manualOnlyTitle: msg`Manual runs only`,
  manualOnly: msg`The file has no on section.`,
  push: msg`Push`,
  pullRequest: msg`Pull request`,
  tag: msg`Tag`,
  eachBranch: msg`each branch`,
  eachTag: msg`each tag`,
  except: (branches: string) => msg`except ${branches}`,
  into: (branches: string) => msg`into ${branches}`,
  draftsIncluded: msg`drafts included`,
  draftsSkipped: msg`drafts skipped`,
  skipCi: msg`[skip ci] skipped`,
  checkout: msg`Checkout`,
  checkoutBuiltIn: msg`Built in`,
  checkoutOff: msg`Off`,
  checkoutOffDetail: msg`the nodes start in an empty folder`,
  checkoutDepth: (depth: number) => msg`before the first node, depth ${depth}`,
  checkoutFullHistory: msg`before the first node, full history`,
  submodules: msg`submodules`,
  lfs: msg`LFS`,
  lineColumn: (line: number, column: number) => msg`Line ${line}:${column}`,
  line: (line: number) => msg`Line ${line}`,
  readOnlyHint: msg`Read only. Schedules and webhooks stay in Scylla. With no on section, the pipeline starts only on manual runs.`,
  invalidHint: msg`New runs fail with "Invalid pipeline file" until the file is valid.`,

  view: msg`View`,
  viewPipeline: msg`View pipeline`,
  errorsOnBranch: (file: string, count: number, branch: string) =>
    msg`${file} has ${plural(count, { one: '# error', other: '# errors' })} on ${branch}`,
  removedFrom: (branch: string) => msg`Removed from ${branch}`,
  defaultBranch: msg`the default branch`,
  archived: msg`Archived: the project uses the repository files`,
};
