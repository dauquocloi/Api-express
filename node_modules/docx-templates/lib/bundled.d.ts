type Buffer = ArrayBufferLike;
interface QualifiedName {
    name: string;
    prefix: string;
    local: string;
    uri: string;
}

interface QualifiedAttribute extends QualifiedName {
    value: string;
}

type Node = TextNode | NonTextNode;
type BaseNode = {
    _parent?: Node;
    _children: Array<Node>;
    _ifName?: string;
};
type TextNode = BaseNode & {
    _fTextNode: true;
    _text: string;
};
type NonTextNode = BaseNode & {
    _fTextNode: false;
    _tag: string;
    _attrs: {
        [key: string]: QualifiedAttribute | string;
    } & {
        Extension?: string;
        ContentType?: string;
        PartName?: string;
    };
};
type ReportData = any;
type QueryResolver = (query: string | undefined, queryVars: any) => ReportData | Promise<ReportData>;
type ErrorHandler = (e: Error, raw_code?: string) => any;
type RunJSFunc = (o: {
    sandbox: SandBox;
    ctx: Context;
}) => {
    modifiedSandbox: SandBox;
    result: unknown;
};
type UserOptions = {
    /**
     * Docx file template as a Uint8Array (or e.g. ArrayBuffer or NodeJS Buffer).
     */
    template: Uint8Array;
    /**
     * Object of data to be injected or a (async) function that resolves to the data. The function gets as an argument the contents of the QUERY command as a string.
     */
    data?: ReportData | QueryResolver;
    /**
     * Gets injected into data function as second argument.
     */
    queryVars?: any;
    /**
     * Defines a custom command delimiter. This can be a String e.g. '+++' or an Array of Strings with length 2: ['{', '}'] in which the first element serves as the start delimiter and the second as the end delimiter.
     */
    cmdDelimiter?: string | [string, string];
    /**
     * The delimiter that's used to indicate literal XML that should be inserted into the docx XML tree as-is. Defaults to `||`.
     */
    literalXmlDelimiter?: string;
    /**
     * Handle linebreaks in result of commands as actual linebreaks (Default: true)
     */
    processLineBreaks?: boolean;
    /**
     * INSECURE: Set this option to true to disable running all commands in a new JS-VM. USE ONLY WITH TRUSTED TEMPLATES. Beware of arbitrary code injection risks. Can slightly improve performance on complex templates.
     */
    noSandbox?: boolean;
    /**
     * Custom sandbox. See documentation for details.
     */
    runJs?: RunJSFunc;
    /**
     * Add functions or other static data to this option to have access to it in your commands.
     *
     * ```js
     * additionalJsContext: {
     *   qrCode: url => {
     *     const dataUrl = createQrImage(url, { size: 500 });
     *     const data = dataUrl.slice('data:image/gif;base64,'.length);
     *     return { width: 6, height: 6, data, extension: '.gif' };
     *   },
     * }
     * ```
     */
    additionalJsContext?: Object;
    /**
     * Whether to fail on the first error encountered in the template. Defaults to true. Can be used to collect all errors in a template (e.g. misspelled commands) before failing.
     */
    failFast?: boolean;
    /**
     * When set to `true`, this setting ensures `createReport` throws a `NullishCommandResultError` when the result of an INS, HTML, IMAGE, or LINK command is `null` or `undefined`. This is useful as nullish return values usually indicate a mistake in the template or the invoking code. Defaults to `false`.
     */
    rejectNullish?: boolean;
    /**
     * Custom error handler to catch any errors that may occur evaluating commands in the template. The value returned from this handler will be inserted into the template instead.
     */
    errorHandler?: ErrorHandler;
    /**
     * MS Word usually autocorrects JS string literal quotes with unicode 'smart' quotes ('curly' quotes). E.g. 'aubergine' -> ‘aubergine’.
     * This causes an error when evaluating commands containing these smart quotes, as they are not valid JavaScript.
     * If you set fixSmartQuotes to 'true', these smart quotes will automatically get replaced with straight quotes (') before command evaluation.
     * Defaults to false.
     */
    fixSmartQuotes?: boolean;
    /**
     * Use the new way of injecting line breaks from command results (only applies when `processLineBreaks` is `true`)
     * which has better results in LibreOffice and Google Drive.
     * (Default: false)
     */
    processLineBreaksAsNewText?: boolean;
    /**
     * Maximum loop iterations allowed when walking through the template.
     * You can increase this to generate reports with large amount of FOR loop elements.
     * Tip: You can disable infinite loop protection by using the `Infinity` constant.
     * This may be useful if you implement a process timeout instead.
     * (Default: 1,000,000)
     */
    maximumWalkingDepth?: number;
};
type CreateReportOptions = {
    cmdDelimiter: [string, string];
    literalXmlDelimiter: string;
    processLineBreaks: boolean;
    noSandbox: boolean;
    runJs?: RunJSFunc;
    additionalJsContext: Object;
    failFast: boolean;
    rejectNullish: boolean;
    errorHandler: ErrorHandler | null;
    fixSmartQuotes: boolean;
    processLineBreaksAsNewText: boolean;
    maximumWalkingDepth?: number;
};
type SandBox = {
    __code__: string | undefined;
    __result__: unknown | undefined;
    [k: string]: unknown;
};
type Context = {
    gCntIf: number;
    gCntEndIf: number;
    level: number;
    fCmd: boolean;
    cmd: string;
    fSeekQuery: boolean;
    query?: string;
    buffers: {
        'w:p': BufferStatus;
        'w:tr': BufferStatus;
        'w:tc': BufferStatus;
    };
    pendingImageNode?: {
        image: NonTextNode;
        caption?: NonTextNode[];
    };
    imageAndShapeIdIncrement: number;
    images: Images;
    pendingLinkNode?: NonTextNode;
    linkId: number;
    links: Links;
    pendingHtmlNode?: TextNode | NonTextNode;
    htmlId: number;
    htmls: Htmls;
    vars: {
        [name: string]: VarValue;
    };
    loops: Array<LoopStatus>;
    fJump: boolean;
    shorthands: {
        [shorthand: string]: string;
    };
    options: CreateReportOptions;
    jsSandbox?: SandBox;
    textRunPropsNode?: NonTextNode;
    pIfCheckMap: Map<Node, string>;
    trIfCheckMap: Map<Node, string>;
};
type Images = {
    [id: string]: Image;
};
declare const ImageExtensions: readonly [".png", ".gif", ".jpg", ".jpeg", ".svg"];
type ImageExtension = (typeof ImageExtensions)[number];
type Image = {
    extension: ImageExtension;
    data: ArrayBuffer | string;
};
type Links = {
    [id: string]: Link;
};
type Link = {
    url: string;
};
type Htmls = {
    [id: string]: string;
};
type BufferStatus = {
    text: string;
    cmds: string;
    fInsertedText: boolean;
};
type VarValue = unknown;
type LoopStatus = {
    refNode: Node;
    refNodeLevel: number;
    varName: string;
    loopOver: Array<VarValue>;
    idx: number;
    isIf?: boolean;
};
type CommandSummary = {
    raw: string;
    type: BuiltInCommand;
    code: string;
};
type BuiltInCommand = (typeof BUILT_IN_COMMANDS)[number];
declare const BUILT_IN_COMMANDS: readonly ["QUERY", "CMD_NODE", "ALIAS", "FOR", "END-FOR", "IF", "END-IF", "INS", "EXEC", "IMAGE", "LINK", "HTML"];

/**
 * Create Report from docx template
 *
 * example:
 * ```js
 * const report = await createReport({
 *   template,
 *   data: query => graphqlServer.execute(query),
 *   additionalJsContext: {
 *     // all of these will be available to JS snippets in your template commands
 *     foo: 'bar',
 *     qrCode: async url => {
 *       // do stuff
 *     },
 *   },
 *   cmdDelimiter: '+++',
 *   literalXmlDelimiter: '||',
 *   processLineBreaks: true,
 *   noSandbox: false,
 * });
 * ```
 *
 * @param options Options for Report
 */
declare function createReport(options: UserOptions): Promise<Uint8Array>;
/**
 * For development and testing purposes. Don't use _probe if you don't know what you are doing
 */
declare function createReport(options: UserOptions, _probe: 'JS'): Promise<Node>;
/**
 * For development and testing purposes. Don't use _probe if you don't know what you are doing
 */
declare function createReport(options: UserOptions, _probe: 'XML'): Promise<string>;
/**
 * Lists all the commands in a docx template.
 *
 * example:
 * ```js
 * const template_buffer = fs.readFileSync('template.docx');
 * const commands = await listCommands(template_buffer, ['{', '}']);
 * // `commands` will contain something like:
 * [
 *    { raw: 'INS some_variable', code: 'some_variable', type: 'INS' },
 *    { raw: 'IMAGE svgImgFile()', code: 'svgImgFile()', type: 'IMAGE' },
 * ]
 * ```
 *
 * @param template the docx template as a Buffer-like object
 * @param delimiter the command delimiter (defaults to ['+++', '+++'])
 */
declare function listCommands(template: ArrayBuffer, delimiter?: string | [string, string]): Promise<CommandSummary[]>;
/**
 * Extract metadata from a document, such as the number of pages or words.
 * @param template the docx template as a Buffer-like object
 */
declare function getMetadata(template: ArrayBuffer): Promise<{
    pages: number | undefined;
    words: number | undefined;
    characters: number | undefined;
    lines: number | undefined;
    paragraphs: number | undefined;
    company: string | undefined;
    template: string | undefined;
    title: string | undefined;
    subject: string | undefined;
    creator: string | undefined;
    description: string | undefined;
    lastModifiedBy: string | undefined;
    revision: string | undefined;
    lastPrinted: string | undefined;
    created: string | undefined;
    modified: string | undefined;
    category: string | undefined;
}>;

declare function isError(err: unknown): err is Error;
/**
 * Thrown when `rejectNullish` is set to `true` and a command returns `null` or `undefined`.
 */
declare class NullishCommandResultError extends Error {
    command: string;
    constructor(command: string);
}
/**
 * Thrown when the result of an `INS` command is an `Object`. This ensures you don't accidentally put `'[object Object]'` in your report.
 */
declare class ObjectCommandResultError extends Error {
    command: string;
    result: unknown;
    constructor(command: string, result: unknown);
}
declare class CommandSyntaxError extends Error {
    command: string;
    constructor(command: string);
}
declare class InvalidCommandError extends Error {
    command: string;
    constructor(msg: string, command: string);
}
declare class CommandExecutionError extends Error {
    command: string;
    err: Error;
    constructor(err: Error, command: string);
}
declare class ImageError extends CommandExecutionError {
}
declare class InternalError extends Error {
    constructor(msg: string);
}
declare class TemplateParseError extends Error {
}
declare class IncompleteConditionalStatementError extends Error {
    constructor();
}
declare class UnterminatedForLoopError extends Error {
    constructor(loop: LoopStatus);
}

export { CommandExecutionError, CommandSyntaxError, ImageError, IncompleteConditionalStatementError, InternalError, InvalidCommandError, NullishCommandResultError, ObjectCommandResultError, QueryResolver, TemplateParseError, UnterminatedForLoopError, createReport, createReport as default, getMetadata, isError, listCommands };
