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

export const BackendTypes = {
    WebGL: "WebGL",
    wasm: "wasm",
    cpu: "cpu",
} as const;
export type BackendTypes = typeof BackendTypes[keyof typeof BackendTypes];

export interface HandPoseConfig {
    browserType: BrowserTypes;
    model: ModelConfig;
    backendType: BackendTypes;
    wasmPaths: { [key: string]: string };
    processOnLocal: boolean;
    pageUrl: string;
}

export interface ModelConfig {
    maxContinuousChecks?: number;
    detectionConfidence?: number;
    iouThreshold?: number;
    scoreThreshold?: number;
}

export enum HandPoseFunctionType {
    EstimateHands,
}

export interface HandPoseOperationParams {
    type: HandPoseFunctionType;
    estimateHands: EstimateHandsParams;
    processWidth: number;
    processHeight: number;
}

export interface EstimateHandsParams {
    flipHorizontal: boolean;
}

export const FingerLookupIndices: { [key: string]: number[] } = {
    thumb: [0, 1, 2, 3, 4],
    indexFinger: [0, 5, 6, 7, 8],
    middleFinger: [0, 9, 10, 11, 12],
    ringFinger: [0, 13, 14, 15, 16],
    pinky: [0, 17, 18, 19, 20],
};
