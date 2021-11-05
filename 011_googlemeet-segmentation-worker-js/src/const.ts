import { BrowserType } from "./BrowserUtil";

export const WorkerCommand = {
    INITIALIZE: "initialize",
    PREDICT: "predict",
};

export const WorkerResponse = {
    INITIALIZED: "initialized",
    PREDICTED: "predicted",
    NOT_READY: "not_ready",
};

export interface GoogleMeetSegmentationConfig {
    browserType: BrowserType;
    processOnLocal: boolean;
    useTFWasmBackend: boolean;
    wasmPath: string;
    pageUrl: string;

    modelJsons: { [key: string]: string };
    modelWeights: { [key: string]: string };
    modelTFLites: { [key: string]: string };
    modelKey: string;

    processSizes: { [key: string]: number[] };

    wasmBase64?: string;
    wasmSimdBase64?: string;
    useSimd: boolean;
    useTFJS: boolean;
}

export interface GoogleMeetSegmentationOperationParams {
    type: GoogleMeetSegmentationFunctionType;
    processSizeKey: string;

    jbfD: number;
    jbfSigmaC: number;
    jbfSigmaS: number;
    jbfPostProcess: number;

    threshold: number;
    interpolation: number;
}

export enum GoogleMeetSegmentationFunctionType {
    Segmentation,
    xxx, // Not implemented
}

export enum GoogleMeetSegmentationSmoothingType {
    GPU,
    JS,
    WASM,
    JS_CANVAS,
}

export interface TFLite extends EmscriptenModule {
    _getModelBufferMemoryOffset(): number;
    _loadModel(bufferSize: number): number;

    _getInputImageBufferOffset(): number;
    _getJbfGuideImageBufferOffset(): number;
    _getJbfInputImageBufferOffset(): number;
    _getOutputImageBufferOffset(): number;

    _exec_with_jbf(widht: number, height: number, d: number, sigmaColor: number, sigmaSpace: number, postProcessType: number, interpolation: number, threshold: number): number;
    _jbf(widht: number, height: number, d: number, sigmaColor: number, sigmaSpace: number, postProcessType: number, interpolation: number, threshold: number): number;
    _jbf(inputwidht: number, inputheight: number, outputwidht: number, outputheight: number, d: number, sigmaColor: number, sigmaSpace: number, postProcessType: number, interpolation: number, threshold: number): number;
}
