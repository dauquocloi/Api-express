import { SEVERITY } from '../../../../snyk-test/legacy';
import { ResourceKind, TestOutput } from '../scan/results';
export declare function getIacType(testOutput: TestOutput): IacType;
export type PackageManager = ResourceKind;
export type IacType = {
    [packageManager in PackageManager]?: {
        count: number;
        'resource-count': number;
    } & {
        [severity in SEVERITY]?: number;
    };
};
export type ResourcesCountByPackageManager = {
    [packageManager in PackageManager]?: number;
};
export type FilesCountByPackageManager = {
    [packageManager in PackageManager]?: number;
};
export type VulnerabilityAnalyticsByPackageManager = {
    [packageManager in PackageManager]?: VulnerabilityAnalitycs;
};
export type VulnerabilityAnalitycs = {
    [severity in SEVERITY]?: number;
};
