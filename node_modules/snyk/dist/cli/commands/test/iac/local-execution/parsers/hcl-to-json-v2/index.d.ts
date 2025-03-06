type FilePath = string;
type FileContent = string;
type MapOfFiles = Record<FilePath, FileContent>;
type ParsedResults = {
    parsedFiles: MapOfFiles;
    failedFiles: MapOfFiles;
    debugLogs: MapOfFiles;
};
export default function hclToJsonV2(files: MapOfFiles): ParsedResults;
export {};
