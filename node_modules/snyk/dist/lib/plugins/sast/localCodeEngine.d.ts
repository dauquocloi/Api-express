import { SastSettings } from './types';
export declare function isLocalCodeEngine(sastSettings: SastSettings): boolean;
export declare function logLocalCodeEngineVersion(localEngineUrl?: string): Promise<void>;
