import { ParserFileType } from '@snyk/cloud-config-parser';
export type IacProjectTypes = 'k8sconfig' | 'terraformconfig' | 'cloudformationconfig' | 'armconfig' | 'customconfig' | 'multiiacconfig';
export type IacFileTypes = ParserFileType | 'tf' | 'tfvars';
export declare enum IacProjectType {
    K8S = "k8sconfig",
    TERRAFORM = "terraformconfig",
    CLOUDFORMATION = "cloudformationconfig",
    ARM = "armconfig",
    CUSTOM = "customconfig",
    MULTI_IAC = "multiiacconfig"
}
export declare const TEST_SUPPORTED_IAC_PROJECTS: IacProjectTypes[];
export declare const iacRemediationTypes: {
    [k in IacProjectTypes]?: string;
};
export declare const IacV2Name = "IaC+";
export declare const IacV2ShortLink = "https://snyk.co/iac+";
