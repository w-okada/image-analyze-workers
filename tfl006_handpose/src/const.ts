import { BrowserTypes } from "@dannadori/000_WorkerBase";

export const BackendTypes = {
    WebGL: "WebGL",
    wasm: "wasm",
    cpu: "cpu",
} as const;
export type BackendTypes = typeof BackendTypes[keyof typeof BackendTypes];

export interface HandposeConfig {
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

    maxProcessWidth: number
    maxProcessHeight: number
}

export interface HandposeOperationParams {
    processWidth: number;
    processHeight: number;
}

export interface TFLite extends EmscriptenModule {
    _getInputBufferAddress(): number;
    _getOutputBufferAddress(): number;
    _getTemporaryBufferAddress(): number

    _getModelBufferAddress(): number;
    _getLandmarkModelBufferAddress(): number;

    _initModelBuffer(size: number): void;
    _initLandmarkModelBuffer(size: number): void;
    _initInputBuffer(width: number, height: number, channel: number): void

    _loadModel(bufferSize: number): number;
    _loadLandmarkModel(bufferSize: number): number;
    _exec(widht: number, height: number, max_palm_num: number): number;
}
export const INPUT_WIDTH = 256
export const INPUT_HEIGHT = 256

export type TFLiteHand = {
    score: number,
    landmarkScore: number,
    handedness: number,
    rotation: number,
    palm: {
        minX: number,
        minY: number,
        maxX: number,
        maxY: number,
    },
    hand: {
        minX: number,
        minY: number,
        maxX: number,
        maxY: number,
    },
    rotatedHand: {
        positions: {
            x: number,
            y: number
        }[]
    }
    palmKeypoints: {
        x: number,
        y: number
    }[],
    landmarkKeypoints: {
        x: number,
        y: number
    }[],
}

