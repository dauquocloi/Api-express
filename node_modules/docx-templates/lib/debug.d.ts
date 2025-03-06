type LogSink = (message?: string, ...optionalParams: unknown[]) => void;
export declare const logger: {
    debug: LogSink;
};
export declare function setDebugLogSink(f: LogSink): void;
export {};
