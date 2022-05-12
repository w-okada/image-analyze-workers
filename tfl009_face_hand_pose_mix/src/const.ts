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

    palmDetectorModelTFLites: { [key: string]: string };
    handLandmarkModelTFLites: { [key: string]: string };
    handModelKey: string;

    faceDetectorModelTFLites: { [key: string]: string };
    faceLandmarkModelTFLites: { [key: string]: string };
    faceModelKey: string;

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
    /** Hand  **/
    _getHandInputBufferAddress(): number;
    _getHandOutputBufferAddress(): number;
    _getHandTemporaryBufferAddress(): number

    _getPalmDetectorModelBufferAddress(): number;
    _getHandLandmarkModelBufferAddress(): number;

    _initPalmDetectorModelBuffer(size: number): void;
    _initHandLandmarkModelBuffer(size: number): void;
    _initHandInputBuffer(width: number, height: number, channel: number): void

    _loadPalmDetectorModel(bufferSize: number): number;
    _loadHandLandmarkModel(bufferSize: number): number;
    _execHand(widht: number, height: number, max_palm_num: number, resizedFactor: number): number;

    /** Face */
    _getFaceInputBufferAddress(): number;
    _getFaceOutputBufferAddress(): number;
    _getFaceTemporaryBufferAddress(): number

    _getFaceDetectorModelBufferAddress(): number;
    _getFaceLandmarkModelBufferAddress(): number;

    _initFaceDetectorModelBuffer(size: number): void;
    _initFaceLandmarkModelBuffer(size: number): void;
    _initFaceInputBuffer(width: number, height: number, channel: number): void

    _loadFaceDetectorModel(bufferSize: number): number;
    _loadFaceLandmarkModel(bufferSize: number): number;
    _execFace(widht: number, height: number, max_palm_num: number): number;

    /** Pose  **/
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
        z: number
    }[],
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
        visibility: number,
        presence: number,
    }[],
    landmarkKeypoints3D: {
        x: number,
        y: number,
        z: number,
    }[],

}


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

