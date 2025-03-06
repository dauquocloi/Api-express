import * as sarif from 'sarif';
import { TestResult, AnnotatedIssue } from '../snyk-test/legacy';
export declare function getResults(testResult: TestResult): sarif.Result[];
export declare function getLevel(vuln: AnnotatedIssue): "error" | "warning" | "note";
