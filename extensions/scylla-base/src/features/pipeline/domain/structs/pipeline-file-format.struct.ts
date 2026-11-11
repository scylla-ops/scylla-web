/** The formats of a pipeline file in a repository: `.scylla/pipelines/<key>.<format>`. */
export type PipelineFileFormat = 'toml' | 'yaml' | 'json';

/** In the order that the server reads them. */
export const PIPELINE_FILE_FORMATS: readonly PipelineFileFormat[] = ['toml', 'yaml', 'json'];
