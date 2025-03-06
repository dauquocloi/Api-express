/// <reference types="node" />
export type GetManifestResponse = {
    schemaVersion: number;
    layers: Layer[];
};
export type Layer = {
    digest: string;
};
export type GetLayerResponse = {
    blob: Buffer;
};
export interface OciRegistry {
    getManifest(repository: string, tag: string): Promise<GetManifestResponse>;
    getLayer(repository: string, digest: string): Promise<GetLayerResponse>;
}
export declare class RemoteOciRegistry implements OciRegistry {
    private registry;
    private username?;
    private password?;
    private static options;
    constructor(registry: string, username?: string | undefined, password?: string | undefined);
    getManifest(repository: string, tag: string): Promise<GetManifestResponse>;
    getLayer(repository: string, digest: string): Promise<GetLayerResponse>;
}
