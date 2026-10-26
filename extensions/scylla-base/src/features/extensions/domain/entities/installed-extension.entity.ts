/** An extension that the app runs. */
export interface InstalledExtensionEntity {
  id: string;
  name: string;
  version: string;
  /** The ids of the extensions that load before this one. */
  dependencies: string[];
  moduleCount: number;
  /** The routes that render a page, children included. */
  pageCount: number;
}
