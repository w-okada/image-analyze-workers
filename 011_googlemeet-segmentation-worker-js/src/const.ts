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

export const PostProcessTypes = {
    none: 0,
    softmax: 1,
    jbf: 2,
    softmax_jbf: 3,
} as const;
export type PostProcessTypes = typeof PostProcessTypes[keyof typeof PostProcessTypes];
export const InterpolationTypes = {
    nearest: 0,
    liner: 1,
    area: 2,
    cubic: 3,
    lanczos: 4,
} as const;
export type InterpolationTypes = typeof InterpolationTypes[keyof typeof InterpolationTypes];

export interface GoogleMeetSegmentationConfig {
    browserType: BrowserTypes;
    processOnLocal: boolean;
    wasmPaths: { [key: string]: string };

    modelKey: string;
    modelInputs: { [key: string]: number[] };
    modelTFLites: { [key: string]: string };

    wasmBase64?: string;
    wasmSimdBase64?: string;
    useSimd: boolean;
}

export interface GoogleMeetSegmentationOperationParams {
    type: GoogleMeetSegmentationFunctionType;
    processSizeKey: string;

    jbfD: number;
    jbfSigmaC: number;
    jbfSigmaS: number;
    jbfPostProcess: PostProcessTypes;

    threshold: number;
    interpolation: InterpolationTypes;

    processWidth: number;
    processHeight: number;
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
