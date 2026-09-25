export type TargetHandler<TManifest> = (manifest: TManifest, target: any) => void;

export interface RegistrableDecorator<TManifest> {
    decorator: (manifest: TManifest) => ClassDecorator;
    setHandler: (handler: TargetHandler<TManifest>) => void;
}

/**
 * Generic factory function to create a decorator that can be used to register classes.
 */
export function createRegistrableDecorator<TManifest>(): RegistrableDecorator<TManifest> {
    let globalHandler: TargetHandler<TManifest> | null = null;
    const deferredQueue: Array<{ manifest: TManifest; target: any }> = [];

    const setHandler = (handler: TargetHandler<TManifest>) => {
        globalHandler = handler;
        for (const item of deferredQueue) {
            handler(item.manifest, item.target);
        }
        deferredQueue.length = 0;
    };

    const decorator = (manifest: TManifest): ClassDecorator => {
        return function (target: any) {
            if (globalHandler) {
                globalHandler(manifest, target);
            } else {
                deferredQueue.push({ manifest, target });
            }
        };
    };

    return { decorator, setHandler };
}