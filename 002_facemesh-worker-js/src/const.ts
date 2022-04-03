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
export const FacemeshFunctionTypes = {
    DetectMesh: "DetectMesh",
} as const;
export type FacemeshFunctionTypes = typeof FacemeshFunctionTypes[keyof typeof FacemeshFunctionTypes];

export interface ModelConfig {
    maxContinuousChecks: number;
    detectionConfidence: number;
    maxFaces: number;
    iouThreshold: number;
    scoreThreshold: number;
}

export interface FacemeshConfig {
    browserType: BrowserTypes;
    useTFWasmBackend: boolean;
    useTFCPUBackend: boolean;
    wasmPath: string;
    modelReloadInterval: number; // if not reload, set zero
    model: ModelConfig;
    processOnLocal: boolean;
    pageUrl: string;
}

export interface FacemeshOperatipnParams {
    type: FacemeshFunctionTypes;
    processWidth: number;
    processHeight: number;
    predictIrises: boolean;
}
