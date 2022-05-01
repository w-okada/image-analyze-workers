import { BrowserTypes } from "@dannadori/000_WorkerBase";

export const BackendTypes = {
    WebGL: "WebGL",
    wasm: "wasm",
    cpu: "cpu",
} as const;
export type BackendTypes = typeof BackendTypes[keyof typeof BackendTypes];

export interface PoseLandmarkDetectionConfig {
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

export interface PoseLandmarkDetectionOperationParams {
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
    _exec(widht: number, height: number, max_pose_num: number, resizedFactor: number, cropExt: number): number;
}
export const INPUT_WIDTH = 256
export const INPUT_HEIGHT = 256

export type TFLitePoseLandmarkDetection = {
    score: number,
    landmarkScore: number,
    rotation: number,
    pose: {
        minX: number,
        minY: number,
        maxX: number,
        maxY: number,
    },
    poseWithMargin: {
        minX: number,
        minY: number,
        maxX: number,
        maxY: number,
    },
    rotatedPose: {
        positions: {
            x: number,
            y: number
        }[]
    }
    poseKeypoints: {
        x: number,
        y: number
    }[],
    landmarkKeypoints: {
        x: number,
        y: number,
        z: number,
        visibility: number,
        presence: number,
    }[],
    landmarkKeypoints3D: {
        x: number,
        y: number,
        z: number,
    }[],

}

