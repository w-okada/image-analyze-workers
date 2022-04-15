import { BrowserTypes } from "@dannadori/000_WorkerBase";

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

    modelTFLites: { [key: string]: string };
    landmarkModelTFLites: { [key: string]: string };
    modelKey: string;
    wasmBase64: string;
    wasmSimdBase64: string;
    useSimd: boolean;
}

export interface BlazefaceOperationParams {
    processWidth: number;
    processHeight: number;
}

export interface TFLite extends EmscriptenModule {
    _getModelBufferAddress(): number;
    _getInputBufferAddress(): number;
    _getOutputBufferAddress(): number;

    _getLandmarkModelBufferAddress(): number;
    _getLandmarkInputBufferAddress(): number;
    _getLandmarkOutputBufferAddress(): number;


    _initModelBuffer(size: number): void;
    _initLandmarkModelBuffer(size: number): void;
    _initInputBuffer(width: number, height: number, channel: number): void

    _loadModel(bufferSize: number): number;
    _loadLandmarkModel(bufferSize: number): number;
    _exec2(widht: number, height: number): number;
    _copySrc2Dst(width: number, height: number, channel: number): void
}

export const INPUT_WIDTH = 256
export const INPUT_HEIGHT = 256

