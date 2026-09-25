import { ExtensionManifest, setExtensionHandler} from '@scylla/core-sdk';
import { Registry } from './registry/registry';

export class Core {
    private _extensionRegistry = new Registry<ExtensionManifest>();

    constructor() {
        setExtensionHandler((manifest, target) => {
            console.log(`[Core] Extension interceptée : ${manifest.name}`);
            this._extensionRegistry.register(manifest, target);
        });
    }

    init() {
        console.log('[Core] Initialisation...');
        // Ici, tu peux boucler sur this.registry.getAll() pour instancier tes targets
        for (const ext of this._extensionRegistry.getAll()) {
            console.log(`- Instanciation de la classe extension cible pour : ${ext.manifest.name}`);
            const instance = new ext.target();
        }
    }
}