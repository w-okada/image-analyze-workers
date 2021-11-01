import { BrowserType } from "./BrowserUtil";

export const WorkerCommand = {
    INITIALIZE: "initialize",
    PREDICT: "predict",
};

export const WorkerResponse = {
    INITIALIZED: "initialized",
    PREDICTED: "predicted",
};

export interface U2NetPortraitConfig {
    browserType: BrowserType;
    processOnLocal: boolean;
    useTFWasmBackend: boolean;
    wasmPath: string;
    pageUrl: string;
    modelJson: { [key: string]: string };
    modelWeight: { [key: string]: string };
    modelInputs: { [key: string]: number[] };
    modelKey: string;
}

export interface U2NetPortraitOperationParams {
    type: U2NetPortraitFunctionType;
    // blurParams?: BlurParams | null;
    processWidth: number;
    processHeight: number;
    // withBlurImage: boolean;
}

export enum U2NetPortraitFunctionType {
    Portrait,
    xxx, // Not implemented
}
