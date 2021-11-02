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

export interface SuperResolutionConfig {
    browserType: BrowserType;
    processOnLocal: boolean;
    modelPath: string;
    enableSIMD: boolean;
    useTFWasmBackend: boolean;
    wasmPath: string;
    pageUrl: string;
    tfjsModelPath: string;

    modelJson: { [key: string]: string };
    modelWeight: { [key: string]: string };
    modelTFLite: { [key: string]: string };
    modelKey: string;
    scaleFactor: { [key: string]: number };
    interpolationTypes: { [key: string]: number };

    wasmBase64?: string;
    wasmSimdBase64?: string;
    useSimd: boolean;
    useTFJS: boolean;
}

export interface SuperResolutionOperationParams {
    inputWidth: number;
    inputHeight: number;
    interpolation: number;
}

export const InterpolationTypes = {
    INTER_NEAREST: 0,
    INTER_LINEAR: 1,
    INTER_AREA: 2,
    INTER_CUBIC: 3,
    INTER_LANCZOS4: 4,
    INTER_ESPCN: 100,
    CANVAS: 200,
};

export interface TFLite extends EmscriptenModule {
    _getModelBufferMemoryOffset(): number;
    _getInputImageBufferOffset(): number;
    _getOutputImageBufferOffset(): number;

    _loadModel(bufferSize: number): number;
    _exec(widht: number, height: number, interpolationType: number): number;

    _extractY(width: number, height: number): number;
    _mergeY(width: number, height: number, scaled_width: number, scaled_height: number): number;
    _getYBufferOffset(): number;
    _getScaledYBufferOffset(): number;
}
