import { BrowserTypes } from "@dannadori/worker-base";

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

export const U2NetPortraitFunctionTypes = {
    Portrait: "Portrait",
} as const;
export type U2NetPortraitFunctionTypes = typeof U2NetPortraitFunctionTypes[keyof typeof U2NetPortraitFunctionTypes];
export const BackendTypes = {
    WebGL: "WebGL",
    wasm: "wasm",
    cpu: "cpu",
} as const;
export type BackendTypes = typeof BackendTypes[keyof typeof BackendTypes];

export interface U2NetPortraitConfig {
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

export interface U2NetPortraitOperationParams {
    type: U2NetPortraitFunctionTypes;
    // blurParams?: BlurParams | null;
    processWidth: number;
    processHeight: number;
    // withBlurImage: boolean;
}
