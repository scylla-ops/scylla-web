/**
 * The version text of a build of the web app, in the format of the server
 * (`scylla_proto::version` of scylla-ce). Only a release build sets `SCYLLA_RELEASE=true`, and
 * reports the bare version (`0.7.0`). Another build adds the first 7 characters of the commit of
 * `SCYLLA_BUILD` (`0.7.0+240da00`), or `dev` with no commit (`0.7.0+dev`): the dev server.
 */
export const versionText = (
  version: string,
  env: Readonly<Record<string, string | undefined>>,
): string => {
  if (env.SCYLLA_RELEASE === 'true') return version;
  const commit = (env.SCYLLA_BUILD ?? '').slice(0, 7);
  return `${version}+${commit || 'dev'}`;
};
