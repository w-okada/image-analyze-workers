import { BrowserTypes } from "@dannadori/000_WorkerBase";

export const WorkerCommand = {
    INITIALIZE: "initialize",
    PREDICT: "predict",
};

export const WorkerResponse = {
    INITIALIZED: "initialized",
    PREDICTED: "predicted",
};

export const BackendTypes = {
    WebGL: "WebGL",
    wasm: "wasm",
    cpu: "cpu",
} as const;
export type BackendTypes = typeof BackendTypes[keyof typeof BackendTypes];

export const MODNetFunctionTypes = {
    Segmentation: "Segmentation",
} as const;
export type MODNetFunctionTypes = typeof MODNetFunctionTypes[keyof typeof MODNetFunctionTypes];

export type MODEL_INPUT_SIZES = 192 | 256 | 512;

export interface MODNetConfig {
    browserType: BrowserTypes;
    processOnLocal: boolean;
    backendType: BackendTypes;
    wasmPaths: { [key: string]: string };
    pageUrl: string;
    modelJson: { [key: string]: string };
    modelWeight: { [key: string]: string };
    modelInputs: { [key: string]: number[] };
    modelKey: string;
}

export interface MODNetOperationParams {
    type: MODNetFunctionTypes;
    processWidth: number;
    processHeight: number;
}
