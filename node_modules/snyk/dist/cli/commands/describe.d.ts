import { MethodArgs } from '../args';
import { CustomError } from '../../lib/errors';
export declare class FlagError extends CustomError {
    constructor(flag: string);
}
declare const _default: (...args: MethodArgs) => Promise<any>;
export default _default;
