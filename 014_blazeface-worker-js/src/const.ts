import { BrowserTypes } from "@dannadori/000_WorkerBase";
import * as BlazeFace from "@tensorflow-models/blazeface";

export const WorkerCommand = {
    INITIALIZE: "initialize",
    PREDICT: "predict",
};

export const WorkerResponse = {
    INITIALIZED: "initialized",
    PREDICTED: "predicted",
    NOT_READY: "not_ready",
};

export const BackendTypes = {
    WebGL: "WebGL",
    wasm: "wasm",
    cpu: "cpu",
} as const;
export type BackendTypes = typeof BackendTypes[keyof typeof BackendTypes];

export interface BlazefaceConfig {
    browserType: BrowserTypes;
    processOnLocal: boolean;
    backendType: BackendTypes;
    wasmPaths: { [key: string]: string };
    pageUrl: string;

    maxFaces: number;
    iouThreshold: number;
    scoreThreshold: number;
}

export interface BlazefaceOperationParams {
    processWidth: number;
    processHeight: number;
    annotateBox: boolean;
    movingAverageWindow: number;
}

export type BlazefacePredictionEx = {
    rowPrediction: BlazeFace.NormalizedFace[] | null;
    singlePersonMovingAverage?: {
        topLeft: [number, number];
        bottomRight: [number, number];
        landmarks: number[][];
    };
};

// export interface TFLite extends EmscriptenModule {
//     _getModelBufferMemoryOffset(): number;
//     _getInputImageBufferOffset(): number;
//     _getOutputImageBufferOffset(): number;

//     _loadModel(bufferSize: number): number;
//     _exec(widht: number, height: number, interpolationType: number): number;

//     _extractY(width: number, height: number): number;
//     _mergeY(width: number, height: number, scaled_width: number, scaled_height: number): number;
//     _getYBufferOffset(): number;
//     _getScaledYBufferOffset(): number;
// }
