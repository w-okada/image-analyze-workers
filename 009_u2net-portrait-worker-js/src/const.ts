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
    modelJson_p3_1: string;
    modelWeight_p3_1: string;
    modelJson_p4_1: string;
    modelWeight_p4_1: string;
    modelJson_p4_2: string;
    modelWeight_p4_2: string;
    modelJson_p4_3: string;
    modelWeight_p4_3: string;
    modelJson_p4_4: string;
    modelWeight_p4_4: string;
    modelJson_p4_5: string;
    modelWeight_p4_5: string;
}

export interface U2NetPortraitOperationParams {
    type: U2NetPortraitFunctionType;
    processWidth: number;
    processHeight: number;
}

export enum U2NetPortraitFunctionType {
    Portrait,
    xxx, // Not implemented
}
