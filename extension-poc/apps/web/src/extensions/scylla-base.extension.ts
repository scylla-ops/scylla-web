import {Extension, ModuleManifest} from '@scylla/core-sdk';

const TestModule: ModuleManifest = {
    id: 'test-module',
    routes: [],
    nav: []
}

@Extension({
    id: 'scylla-base',
    name: 'Scylla Base Reference Extension',
    version: '1.0.0',
    modules: [TestModule]
})
export class ScyllaBaseExtension {
    constructor() {
        console.log('ScyllaBaseExtension instanciée !');
    }
}