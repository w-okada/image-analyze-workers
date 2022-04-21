import { BrowserTypes } from "@dannadori/000_WorkerBase";

export const BackendTypes = {
    WebGL: "WebGL",
    wasm: "wasm",
    cpu: "cpu",
} as const;
export type BackendTypes = typeof BackendTypes[keyof typeof BackendTypes];

export interface FaceLandmarkDetectionConfig {
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

export interface FaceLandmarkDetectionOperationParams {
    processWidth: number;
    processHeight: number;
}

export interface TFLite extends EmscriptenModule {
    _getInputBufferAddress(): number;
    _getOutputBufferAddress(): number;
    _getTemporaryBufferAddress(): number

    _getDetectorModelBufferAddress(): number;
    _getLandmarkModelBufferAddress(): number;

    _initDetectorModelBuffer(size: number): void;
    _initLandmarkModelBuffer(size: number): void;
    _initInputBuffer(width: number, height: number, channel: number): void

    _loadDetectorModel(bufferSize: number): number;
    _loadLandmarkModel(bufferSize: number): number;
    _exec(widht: number, height: number, max_palm_num: number): number;
}
export const INPUT_WIDTH = 256
export const INPUT_HEIGHT = 256

export type TFLiteFaceLandmarkDetection = {
    score: number,
    landmarkScore: number,
    rotation: number,
    face: {
        minX: number,
        minY: number,
        maxX: number,
        maxY: number,
    },
    faceWithMargin: {
        minX: number,
        minY: number,
        maxX: number,
        maxY: number,
    },
    rotatedFace: {
        positions: {
            x: number,
            y: number
        }[]
    }
    faceKeypoints: {
        x: number,
        y: number
    }[],
    landmarkKeypoints: {
        x: number,
        y: number,
        z: number
    }[],
    landmarkLipsKeypoints: {
        x: number,
        y: number
    }[],
    landmarkLeftEyeKeypoints: {
        x: number,
        y: number
    }[],
    landmarkRightEyeKeypoints: {
        x: number,
        y: number
    }[],
    landmarkLeftIrisKeypoints: {
        x: number,
        y: number
    }[],
    landmarkRightIrisKeypoints: {
        x: number,
        y: number
    }[],
}

