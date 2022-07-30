import { BrowserTypes, Config, OperationParams } from "@dannadori/worker-base";
import { Face, Keypoint } from "@tensorflow-models/face-landmarks-detection";
import { BoundingBox } from "@tensorflow-models/face-landmarks-detection/dist/shared/calculators/interfaces/shape_interfaces";
import { Hand } from "@tensorflow-models/hand-pose-detection";
import { Pose } from "@tensorflow-models/pose-detection";

export const OperationType = {
    hand: "hand",
    face: "face",
    pose: "pose"
} as const;
export type OperationType = typeof OperationType[keyof typeof OperationType];


export type ModelConfig = {
    detectionConfidence: number;
    maxPoses: number;
}

export type MediapipeMix2Config = Config & {
    browserType: BrowserTypes;
    processOnLocal: boolean;
    pageUrl: string;

    wasmBin: ArrayBuffer;

    palmDetectorModelTFLites: { [key: string]: ArrayBuffer };
    handLandmarkModelTFLites: { [key: string]: ArrayBuffer };
    handModelKey: string;

    faceDetectorModelTFLites: { [key: string]: ArrayBuffer };
    faceLandmarkModelTFLites: { [key: string]: ArrayBuffer };
    faceModelKey: string;

    poseDetectorModelTFLites: { [key: string]: ArrayBuffer };
    poseLandmarkModelTFLites: { [key: string]: ArrayBuffer };
    poseModelKey: string;

    maxProcessWidth: number
    maxProcessHeight: number
}

export type MediapipeMix2OperationParams = OperationParams & {
    operationType: OperationType;
    handProcessWidth: number;
    handProcessHeight: number
    handMaxHands: number;
    handAffineResizedFactor: number

    faceProcessWidth: number;
    faceProcessHeight: number
    faceMaxFaces: number
    faceMovingAverageWindow: number;

    poseProcessWidth: number;
    poseProcessHeight: number
    poseMaxPoses: number
    poseMovingAverageWindow: number;
    poseAffineResizedFactor: number
    poseCropExt: number
    poseCalculateMode: number // for debug
}

export type HandPredictionEx = {
    operationType: OperationType
    rowPrediction: Hand[] | null;
}

export type FacePredictionEx = {
    operationType: OperationType
    rowPrediction: Face[] | null;
    singlePersonKeypointsMovingAverage?: Keypoint[];
    singlePersonBoxMovingAverage?: BoundingBox;
    // trackingArea?: TrackingArea;
};

export type PosePredictionEx = {
    operationType: OperationType
    rowPrediction: Pose[] | null;
    singlePersonKeypointsMovingAverage?: Keypoint[];
    singlePersonKeypoints3DMovingAverage?: Keypoint[];
    singlePersonBoxMovingAverage?: BoundingBox;
};

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
    _execFace(widht: number, height: number, max_face_num: number): number;

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
        score: number,
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


export const FingerLookupIndices: { [key: string]: number[] } = {
    thumb: [0, 1, 2, 3, 4],
    indexFinger: [0, 5, 6, 7, 8],
    middleFinger: [0, 9, 10, 11, 12],
    ringFinger: [0, 13, 14, 15, 16],
    pinky: [0, 17, 18, 19, 20],
};

