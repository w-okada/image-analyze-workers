import { BrowserType } from "./BrowserUtil";

export const WorkerCommand = {
    INITIALIZE: "initialize",
    PREDICT: "predict",
};

export const WorkerResponse = {
    INITIALIZED: "initialized",
    PREDICTED: "predicted",
};

export type MODEL_INPUT_SIZES = 192 | 256 | 512;

export interface MODNetConfig {
    browserType: BrowserType;
    processOnLocal: boolean;
    useTFWasmBackend: boolean;
    wasmPath: string;
    pageUrl: string;
    modelJson_192: string;
    modelWeight_192: string;
    modelJson_256: string;
    modelWeight_256: string;
    modelJson_512: string;
    modelWeight_512: string;
    modelInputSize: MODEL_INPUT_SIZES;
}

export interface MODNetOperationParams {
    type: MODNetFunctionType;
    processWidth: number;
    processHeight: number;
}

export enum MODNetFunctionType {
    Segmentation,
    xxx, // Not implemented
}
