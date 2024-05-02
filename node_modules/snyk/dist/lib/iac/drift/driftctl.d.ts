import { DriftctlExecutionResult, DriftCTLOptions } from '../types';
import * as child_process from 'child_process';
import { StdioOptions } from 'child_process';
export declare const DCTL_EXIT_CODES: {
    EXIT_IN_SYNC: number;
    EXIT_NOT_IN_SYNC: number;
    EXIT_ERROR: number;
};
export declare const driftctlVersion = "v0.40.0";
export declare const generateArgs: (options: DriftCTLOptions, driftIgnore?: string[]) => Promise<string[]>;
export declare function translateExitCode(exitCode: number | null): number;
export declare const runDriftCTL: ({ options, driftIgnore, input, stdio, }: {
    options: DriftCTLOptions;
    driftIgnore?: string[] | undefined;
    input?: string | undefined;
    stdio?: child_process.StdioOptions | undefined;
}) => Promise<DriftctlExecutionResult>;
