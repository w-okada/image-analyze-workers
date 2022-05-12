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

    poseDetectorModelTFLites: { [key: string]: string };
    poseLandmarkModelTFLites: { [key: string]: string };
    poseModelKey: string;
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
    /** POSE  **/
    _getPoseInputBufferAddress(): number;
    _getPoseOutputBufferAddress(): number;
    _getPoseTemporaryBufferAddress(): number

    _getPoseDetectorModelBufferAddress(): number;
    _getPoseLandmarkModelBufferAddress(): number;

    _initPoseDetectorModelBuffer(size: number): void;
    _initPoseLandmarkModelBuffer(size: number): void;
    _initPoseInputBuffer(width: number, height: number, channel: number): void

    _loadPoseDetectorModel(bufferSize: number): number;
    _loadPoseLandmarkModel(bufferSize: number): number;
    _execPose(widht: number, height: number, max_pose_num: number, resizedFactor: number, cropExt: number): number;
    _set_pose_calculate_mode(mode: number): number
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

