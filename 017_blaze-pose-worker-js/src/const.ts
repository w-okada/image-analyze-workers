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

export const ModelTypes = {
    mediapipe: "mediapipe",
    tfjs: "tfjs",
    tflite: "tflite"

} as const;
export type ModelTypes = typeof ModelTypes[keyof typeof ModelTypes];

export const LandmarkTypes = {
    lite: "lite",
    full: "full",
    heavy: "heavy"
}
export type LandmarkTypes = typeof LandmarkTypes[keyof typeof LandmarkTypes];

export const DetectorTypes = {
    lite: "lite",
}
export type DetectorTypes = typeof DetectorTypes[keyof typeof DetectorTypes];


export interface ModelConfig {
    detectionConfidence: number;
    maxPoses: number;
}

export interface BlazePoseConfig {
    browserType: BrowserTypes;
    backendType: BackendTypes;
    wasmPaths: { [key: string]: string };
    model: ModelConfig;
    processOnLocal: boolean;
    pageUrl: string;
    modelType: ModelTypes;

    wasmBase64: string;
    wasmSimdBase64: string;
    detectorModelTFLite: { [key: string]: string };
    landmarkModelTFLite: { [key: string]: string };
    useSimd: boolean;
    maxProcessWidth: number
    maxProcessHeight: number

    detectorModelKey: DetectorTypes
    landmarkModelKey: LandmarkTypes
}

export interface BlazePoseOperationParams {
    processWidth: number;
    processHeight: number;

    movingAverageWindow: number;
    affineResizedFactor: number
    cropExt: number
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
        score: number,
        visibility: number,
        presence: number,
    }[],
    landmarkKeypoints3D: {
        x: number,
        y: number,
        z: number,
        visibility?: number,
        presence?: number,
    }[],
}

export const PartsLookupIndices: { [key: string]: number[] } = {
    leftEye: [0, 1, 2, 3, 7],
    rightEye: [0, 4, 5, 6, 8],
    mouth: [9, 10],
    body: [11, 12, 24, 23, 11],
    leftArm: [11, 13, 15],
    leftThum: [15, 21],
    leftIndex: [15, 19],
    leftPinly: [15, 17],
    rightArm: [12, 14, 16],
    rightThum: [16, 22],
    rightIndex: [16, 20],
    rightPinly: [16, 18],
    leftLeg: [23, 25, 27],
    leftFoot: [27, 29, 31],
    rightLeg: [24, 26, 28],
    rightFoot: [28, 30, 32],
};