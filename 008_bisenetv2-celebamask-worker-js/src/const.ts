import { BrowserTypes } from "@dannadori/000_WorkerBase";

export const WorkerCommand = {
    INITIALIZE: "initialize",
    PREDICT: "predict",
} as const;
export type WorkerCommand = typeof WorkerCommand[keyof typeof WorkerCommand];

export const WorkerResponse = {
    INITIALIZED: "initialized",
    PREDICTED: "predicted",
} as const;
export type WorkerResponse = typeof WorkerResponse[keyof typeof WorkerResponse];

export const BisenetV2CelebAMaskFunctionTypes = { Mask: "Mask" } as const;
export type BisenetV2CelebAMaskFunctionTypes = typeof BisenetV2CelebAMaskFunctionTypes[keyof typeof BisenetV2CelebAMaskFunctionTypes];

export const BackendTypes = {
    WebGL: "WebGL",
    wasm: "wasm",
    cpu: "cpu",
} as const;
export type BackendTypes = typeof BackendTypes[keyof typeof BackendTypes];

export interface BisenetV2CelebAMaskConfig {
    browserType: BrowserTypes;
    processOnLocal: boolean;
    backendType: BackendTypes;
    wasmPaths: { [key: string]: string };
    pageUrl: string;
    modelJson: string;
    modelWeight1: string;
    modelWeight2: string;
    modelWeight3: string;
}

export interface BisenetV2CelebAMaskOperatipnParams {
    type: BisenetV2CelebAMaskFunctionTypes;
    processWidth: number;
    processHeight: number;
}
