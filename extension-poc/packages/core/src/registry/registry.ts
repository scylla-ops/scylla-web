export type RegisteredItem<T> = {
    manifest: T;
    target: any;
};

// On met le <T> au niveau de la classe, pas besoin de le redéclarer sur les méthodes
export class Registry<T> {
    private items: RegisteredItem<T>[] = [];

    public register(manifest: T, target: any): void {
        this.items.push({ manifest, target });
    }

    public getAll(): RegisteredItem<T>[] {
        return this.items;
    }
}