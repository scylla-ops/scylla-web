import {ModuleManifest} from "./module";

export type ExtensionManifest = {
    id: string;
    name: string;
    version?: string;
    dependencies?: string[];
    modules?: ModuleManifest[];
}