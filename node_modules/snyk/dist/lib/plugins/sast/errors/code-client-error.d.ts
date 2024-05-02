import { CustomError } from '../../../errors/custom-error';
export declare class CodeClientError extends CustomError {
    constructor(statusCode: number, statusText: string, additionalUserHelp?: string);
}
export declare class CodeClientErrorWithDetail extends CustomError {
    constructor(message: string, statusCode: number, detail: string);
}
