const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Whether a text has the form of an id of the server. A text that does not is the id of nothing:
 * the client does not ask the server, which would refuse it with a message for developers.
 */
export const isId = (text: string | undefined): text is string => !!text && ID.test(text);

/** The route parameters that name an entity by its id. Not the others, for example a package name. */
const ID_PARAMS = [
  'projectId',
  'pipelineId',
  'jobId',
  'actorId',
  'appId',
  'dashboardId',
  'triggerId',
  'fragmentId',
  'userId',
] as const;

/** The id parameters of a URL that have a wrong form: they name no entity. */
export const malformedIdParams = (params: Readonly<Record<string, string | undefined>>): string[] =>
  ID_PARAMS.filter(name => params[name] !== undefined && !isId(params[name]));
