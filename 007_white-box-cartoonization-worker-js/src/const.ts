import { BrowserType } from "./BrowserUtil";

export const WorkerCommand = {
    INITIALIZE: "initialize",
    PREDICT: "predict",
};

export const WorkerResponse = {
    INITIALIZED: "initialized",
    PREDICTED: "predicted",
};

export interface CartoonConfig {
    browserType: BrowserType;
    processOnLocal: boolean;
    useTFWasmBackend: boolean;
    wasmPath: string;
    pageUrl: string;
    modelJson: string;
    modelWeight: string;
}

export interface CartoonOperatipnParams {
    type: CartoonFunctionType;
    processWidth: number;
    processHeight: number;
}

export enum CartoonFunctionType {
    Cartoon,
    xxx, // Not implemented
}
