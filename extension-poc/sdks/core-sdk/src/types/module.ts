export interface RouteDefinition {
    path: string;
    component: () => Promise<{ default: any }>;
}

export interface NavDefinition {
    title: string;
    url: string;
    icon?: string;
}

export interface ModuleManifest {
    id: string;
    routes: RouteDefinition[];
    nav?: NavDefinition[];
}