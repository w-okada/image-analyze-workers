import { BrowserTypes } from "@dannadori/worker-base";
import { Hand } from "./hand-pose-detection-worker";

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
export const ModelTypes = {
    mediapipe: "mediapipe",
    tfjs: "tfjs",
    tflite: "tflite",
} as const;
export type ModelTypes = typeof ModelTypes[keyof typeof ModelTypes];

export const ModelTypes2 = {
    full: "full",
    lite: "lite",
} as const;
export type ModelTypes2 = typeof ModelTypes2[keyof typeof ModelTypes2];

export interface HandPoseDetectionConfig {
    browserType: BrowserTypes;
    processOnLocal: boolean;
    backendType: BackendTypes;
    wasmPaths: { [key: string]: string };
    pageUrl: string;

    maxHands: number;
    iouThreshold: number;
    scoreThreshold: number;
    modelType: ModelTypes;
    modelType2: ModelTypes2;

    wasmBase64: string;
    wasmSimdBase64: string;
    palmModelTFLite: { [key: string]: string };
    landmarkModelTFLite: { [key: string]: string };
    useSimd: boolean;
    maxProcessWidth: number
    maxProcessHeight: number
}

export interface HandPoseDetectionOperationParams {
    processWidth: number;
    processHeight: number;
    movingAverageWindow: number;
    affineResizedFactor: number
}


export const FingerLookupIndices: { [key: string]: number[] } = {
    thumb: [0, 1, 2, 3, 4],
    indexFinger: [0, 5, 6, 7, 8],
    middleFinger: [0, 9, 10, 11, 12],
    ringFinger: [0, 13, 14, 15, 16],
    pinky: [0, 17, 18, 19, 20],
};

export type HandPredictionEx = {
    rowPrediction: Hand[] | null;
    singlePersonKeypointsMovingAverage?: Hand[];
    // trackingArea?: TrackingArea;
};


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
        y: number,
        z: number,
    }[],
}



export interface TFLite extends EmscriptenModule {
    _getInputBufferAddress(): number;
    _getOutputBufferAddress(): number;

    _getModelBufferAddress(): number;
    _getLandmarkModelBufferAddress(): number;

    _initModelBuffer(size: number): void;
    _initLandmarkModelBuffer(size: number): void;
    _initInputBuffer(width: number, height: number, channel: number): void

    _loadModel(bufferSize: number): number;
    _loadLandmarkModel(bufferSize: number): number;
    _exec(widht: number, height: number, max_palm_num: number, affineResizedFactor: number): number;
}