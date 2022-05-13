import { BrowserTypes } from "@dannadori/worker-base";
import { Face } from "@tensorflow-models/face-landmarks-detection/dist/types";
import { Hand } from "@tensorflow-models/hand-pose-detection/dist/types";
import { Pose } from "@tensorflow-models/pose-detection/dist/types";
import { MediapipeMixConfig, MediapipeMixOperationParams, OperationType, TFLite, TFLiteFaceLandmarkDetection, TFLiteHand, TFLitePoseLandmarkDetection, WorkerCommand, WorkerResponse } from "./const";
import { RefinedPoints } from "./facePoints";

// import { Face } from "@tensorflow-models/face-landmarks-detection";
// import { Hand } from "@tensorflow-models/hand-pose-detection";
// import { Pose } from "@tensorflow-models/pose-detection";


const ctx: Worker = self as any; // eslint-disable-line no-restricted-globals

let tflite: TFLite | null = null;
let tfliteHandInputAddress: number = 0
let tfliteHandOutputAddress: number = 0
let tfliteFaceInputAddress: number = 0
let tfliteFaceOutputAddress: number = 0
let tflitePoseInputAddress: number = 0
let tflitePoseOutputAddress: number = 0

let config: MediapipeMixConfig | null = null;


const predict = async (config: MediapipeMixConfig, params: MediapipeMixOperationParams, data: Uint8ClampedArray) => {
    if (params.operationType === OperationType.hand) {
        return predictHand(config, params, data)
    }
    if (params.operationType === OperationType.face) {
        return predictFace(config, params, data)
    }
    if (params.operationType === OperationType.pose) {
        return predictPose(config, params, data)
    }

    return null
}

const predictHand = async (config: MediapipeMixConfig, params: MediapipeMixOperationParams, data: Uint8ClampedArray): Promise<Hand[] | null> => {
    const imageData = new ImageData(data, params.handProcessWidth, params.handProcessHeight);
    tflite!.HEAPU8.set(imageData.data, tfliteHandInputAddress);
    tflite!._execHand(params.handProcessWidth, params.handProcessHeight, params.handMaxHands, params.handAffineResizedFactor);
    const handNum = tflite!.HEAPF32[tfliteHandOutputAddress / 4];
    const tfliteHands: TFLiteHand[] = []

    for (let i = 0; i < handNum; i++) {
        // 12: score and rects
        //  8: ratated hand
        // 14: palm keypoints
        // 63: landmark keypoints
        // -> 12 + 8 + 14 + 63 = 97
        const offset = tfliteHandOutputAddress / 4 + 1 + i * (97)
        const hand: TFLiteHand = {
            score: tflite!.HEAPF32[offset + 0],
            landmarkScore: tflite!.HEAPF32[offset + 1],
            handedness: tflite!.HEAPF32[offset + 2],
            rotation: tflite!.HEAPF32[offset + 3],
            palm: {
                minX: tflite!.HEAPF32[offset + 4],
                minY: tflite!.HEAPF32[offset + 5],
                maxX: tflite!.HEAPF32[offset + 6],
                maxY: tflite!.HEAPF32[offset + 7],
            },
            hand: {
                minX: tflite!.HEAPF32[offset + 8],
                minY: tflite!.HEAPF32[offset + 9],
                maxX: tflite!.HEAPF32[offset + 10],
                maxY: tflite!.HEAPF32[offset + 11],
            },
            rotatedHand: {
                positions: []
            },
            palmKeypoints: [
            ],
            landmarkKeypoints: [
            ],
        }
        for (let j = 0; j < 4; j++) {
            let rotatedOffset = (tfliteHandOutputAddress / 4 + 1) + (i * 97) + (12) + (j * 2)
            hand.rotatedHand.positions.push({
                x: tflite!.HEAPF32[rotatedOffset + 0],
                y: tflite!.HEAPF32[rotatedOffset + 1],
            })
        }
        for (let j = 0; j < 7; j++) {
            let palmKeypointOffset = (tfliteHandOutputAddress / 4 + 1) + (i * 97) + (12 + 8) + (j * 2)
            hand.palmKeypoints.push({
                x: tflite!.HEAPF32[palmKeypointOffset + 0],
                y: tflite!.HEAPF32[palmKeypointOffset + 1],
            })
        }
        for (let j = 0; j < 21; j++) {
            let landmarkKeypointOffset = (tfliteHandOutputAddress / 4 + 1) + (i * 97) + (12 + 8 + 14) + (j * 3)
            hand.landmarkKeypoints.push({
                x: tflite!.HEAPF32[landmarkKeypointOffset + 0],
                y: tflite!.HEAPF32[landmarkKeypointOffset + 1],
                z: tflite!.HEAPF32[landmarkKeypointOffset + 2],
            })
        }
        tfliteHands.push(hand)
    }

    const hands: Hand[] = tfliteHands.map(x => {
        const hand: Hand = {
            keypoints: [...x.landmarkKeypoints],
            handedness: x.handedness < 0.5 ? "Left" : "Right",
            // score: x.landmarkScore, // not work??
            score: x.score

        }
        return hand
    })

    return hands;
};


const predictFace = async (config: MediapipeMixConfig, params: MediapipeMixOperationParams, data: Uint8ClampedArray): Promise<Face[] | null> => {
    const imageData = new ImageData(data, params.faceProcessWidth, params.faceProcessHeight);
    tflite!.HEAPU8.set(imageData.data, tfliteFaceInputAddress);
    tflite!._execFace(params.faceProcessWidth, params.faceProcessHeight, params.faceMaxFaces);
    const faceNum = tflite!.HEAPF32[tfliteFaceOutputAddress / 4];
    const tfliteFaces: TFLiteFaceLandmarkDetection[] = []
    for (let i = 0; i < faceNum; i++) {
        //   11: score and rects
        //    8: ratated face (4x2D)
        //   12: palm keypoints(6x2D)
        // 1404: landmark keypoints(468x3D)
        //  160: landmark Lip keypoints(80x2D)
        //  142: landmark left eye keypoints(71x2D)
        //  142: landmark right eye keypoints(71x2D)
        //   10: landmark left iris keypoint(5x2D)
        //   10: landmark right iris keypoint(5x2D)
        // -> 11 + 8 + 12 + 1404 + 160 + 142 + 142 + 10 + 10 = 1899
        const offset = tfliteFaceOutputAddress / 4 + 1 + i * (1899)
        const face: TFLiteFaceLandmarkDetection = {
            score: tflite!.HEAPF32[offset + 0],
            landmarkScore: tflite!.HEAPF32[offset + 1],
            rotation: tflite!.HEAPF32[offset + 2],
            face: {
                minX: tflite!.HEAPF32[offset + 3],
                minY: tflite!.HEAPF32[offset + 4],
                maxX: tflite!.HEAPF32[offset + 5],
                maxY: tflite!.HEAPF32[offset + 6],
            },
            faceWithMargin: {
                minX: tflite!.HEAPF32[offset + 7],
                minY: tflite!.HEAPF32[offset + 8],
                maxX: tflite!.HEAPF32[offset + 9],
                maxY: tflite!.HEAPF32[offset + 10],
            },
            rotatedFace: {
                positions: [
                ]
            },
            faceKeypoints: [
            ],
            landmarkKeypoints: [
            ],
            landmarkLipsKeypoints: [
            ],
            landmarkLeftEyeKeypoints: [
            ],
            landmarkRightEyeKeypoints: [
            ],
            landmarkLeftIrisKeypoints: [
            ],
            landmarkRightIrisKeypoints: [
            ],
        }
        for (let j = 0; j < 4; j++) {
            let offset = (tfliteFaceOutputAddress / 4 + 1) + (i * 1899) + (11) + (j * 2)
            face.rotatedFace.positions.push({
                x: tflite!.HEAPF32[offset + 0],
                y: tflite!.HEAPF32[offset + 1],
            })
        }
        for (let j = 0; j < 6; j++) {
            let offset = (tfliteFaceOutputAddress / 4 + 1) + (i * 1899) + (11 + 8) + (j * 2)
            face.faceKeypoints.push({
                x: tflite!.HEAPF32[offset + 0],
                y: tflite!.HEAPF32[offset + 1],
            })
        }
        for (let j = 0; j < 468; j++) {
            let offset = (tfliteFaceOutputAddress / 4 + 1) + (i * 1899) + (11 + 8 + 12) + (j * 3)
            face.landmarkKeypoints.push({
                x: tflite!.HEAPF32[offset + 0],
                y: tflite!.HEAPF32[offset + 1],
                z: tflite!.HEAPF32[offset + 2],
            })
        }
        for (let j = 0; j < 80; j++) {
            let offset = (tfliteFaceOutputAddress / 4 + 1) + (i * 1899) + (11 + 8 + 12 + 1404) + (j * 2)
            face.landmarkLipsKeypoints.push({
                x: tflite!.HEAPF32[offset + 0],
                y: tflite!.HEAPF32[offset + 1],
            })
        }
        for (let j = 0; j < 71; j++) {
            let offset = (tfliteFaceOutputAddress / 4 + 1) + (i * 1899) + (11 + 8 + 12 + 1404 + 160) + (j * 2)
            face.landmarkLeftEyeKeypoints.push({
                x: tflite!.HEAPF32[offset + 0],
                y: tflite!.HEAPF32[offset + 1],
            })
        }
        for (let j = 0; j < 71; j++) {
            let offset = (tfliteFaceOutputAddress / 4 + 1) + (i * 1899) + (11 + 8 + 12 + 1404 + 160 + 142) + (j * 2)
            face.landmarkRightEyeKeypoints.push({
                x: tflite!.HEAPF32[offset + 0],
                y: tflite!.HEAPF32[offset + 1],
            })
        }
        for (let j = 0; j < 5; j++) {
            let offset = (tfliteFaceOutputAddress / 4 + 1) + (i * 1899) + (11 + 8 + 12 + 1404 + 160 + 142 + 142) + (j * 2)
            face.landmarkLeftIrisKeypoints.push({
                x: tflite!.HEAPF32[offset + 0],
                y: tflite!.HEAPF32[offset + 1],
            })
        }
        for (let j = 0; j < 5; j++) {
            let offset = (tfliteFaceOutputAddress / 4 + 1) + (i * 1899) + (11 + 8 + 12 + 1404 + 160 + 142 + 142 + 10) + (j * 2)
            face.landmarkRightIrisKeypoints.push({
                x: tflite!.HEAPF32[offset + 0],
                y: tflite!.HEAPF32[offset + 1],
            })
        }

        if (face.score > 0.5 && face.landmarkScore > 0.5) {
            tfliteFaces.push(face)

        }
    }
    const faces: Face[] = tfliteFaces.map(x => {
        const face: Face = {
            keypoints: [...x.landmarkKeypoints],
            box: {
                xMin: x.face.minX,
                yMin: x.face.minY,
                xMax: x.face.maxX,
                yMax: x.face.maxY,
                width: x.face.maxX - x.face.minX,
                height: x.face.maxY - x.face.maxY
            }
        }

        RefinedPoints.lips.forEach((dst, src) => {
            face.keypoints[dst].x = x.landmarkLipsKeypoints[src].x;
            face.keypoints[dst].y = x.landmarkLipsKeypoints[src].y;
        })
        RefinedPoints.leftEye.forEach((dst, src) => {
            face.keypoints[dst].x = x.landmarkLeftEyeKeypoints[src].x;
            face.keypoints[dst].y = x.landmarkLeftEyeKeypoints[src].y;
        })
        RefinedPoints.rightEye.forEach((dst, src) => {
            face.keypoints[dst].x = x.landmarkRightEyeKeypoints[src].x;
            face.keypoints[dst].y = x.landmarkRightEyeKeypoints[src].y;
        })
        RefinedPoints.leftIris.forEach((dst, src) => {
            face.keypoints[dst] = x.landmarkLeftIrisKeypoints[src];
        })
        RefinedPoints.rightIris.forEach((dst, src) => {
            face.keypoints[dst] = x.landmarkRightIrisKeypoints[src];
        })

        return face
    })
    return faces
};



const predictPose = async (config: MediapipeMixConfig, params: MediapipeMixOperationParams, data: Uint8ClampedArray): Promise<Pose[] | null> => {
    const imageData = new ImageData(data, params.poseProcessWidth, params.poseProcessHeight);
    tflite!.HEAPU8.set(imageData.data, tflitePoseInputAddress);
    tflite!._set_pose_calculate_mode(params.poseCalculateMode) // for debug
    tflite!._execPose(params.poseProcessWidth, params.poseProcessHeight, params.poseMaxPoses, params.poseAffineResizedFactor, params.poseCropExt);
    const poseNum = tflite!.HEAPF32[tflitePoseOutputAddress / 4];
    const tflitePoses: TFLitePoseLandmarkDetection[] = []
    for (let i = 0; i < poseNum; i++) {
        //   11: score and rects
        //    8: ratated pose (4x2D)
        //    8: pose keypoints(6x2D)
        //  195: landmark keypoints(39x5D)
        //  117: landmark keypoints(39x3D)
        // -> 11 + 8 + 12 + 195 + 117 = 343
        const offset = tflitePoseOutputAddress / 4 + 1 + i * (343)
        const pose: TFLitePoseLandmarkDetection = {
            score: tflite!.HEAPF32[offset + 0],
            landmarkScore: tflite!.HEAPF32[offset + 1],
            rotation: tflite!.HEAPF32[offset + 2],
            pose: {
                minX: tflite!.HEAPF32[offset + 3],
                minY: tflite!.HEAPF32[offset + 4],
                maxX: tflite!.HEAPF32[offset + 5],
                maxY: tflite!.HEAPF32[offset + 6],
            },
            poseWithMargin: {
                minX: tflite!.HEAPF32[offset + 7],
                minY: tflite!.HEAPF32[offset + 8],
                maxX: tflite!.HEAPF32[offset + 9],
                maxY: tflite!.HEAPF32[offset + 10],
            },
            rotatedPose: {
                positions: [
                ]
            },
            poseKeypoints: [
            ],
            landmarkKeypoints: [
            ],
            landmarkKeypoints3D: [
            ],
        }
        for (let j = 0; j < 4; j++) {
            const offset = tflitePoseOutputAddress / 4 + 1 + i * (343) + (11) + (j * 2)
            pose.rotatedPose.positions.push({
                x: tflite!.HEAPF32[offset + 0],
                y: tflite!.HEAPF32[offset + 1],
            })
        }
        for (let j = 0; j < 4; j++) {
            const offset = tflitePoseOutputAddress / 4 + 1 + i * (343) + (11 + 8) + (j * 2)
            pose.poseKeypoints.push({
                x: tflite!.HEAPF32[offset + 0],
                y: tflite!.HEAPF32[offset + 1],
            })
        }
        for (let j = 0; j < 33; j++) {
            const offset = tflitePoseOutputAddress / 4 + 1 + i * (343) + (11 + 8 + 8) + (j * 5)
            pose.landmarkKeypoints.push({
                x: tflite!.HEAPF32[offset + 0],
                y: tflite!.HEAPF32[offset + 1],
                z: tflite!.HEAPF32[offset + 2],
                score: tflite!.HEAPF32[offset + 3],
                visibility: tflite!.HEAPF32[offset + 3],
                presence: tflite!.HEAPF32[offset + 4],
            })
        }
        for (let j = 0; j < 33; j++) {
            const offset = tflitePoseOutputAddress / 4 + 1 + i * (343) + (11 + 8 + 8 + 195) + (j * 3)
            pose.landmarkKeypoints3D.push({
                x: tflite!.HEAPF32[offset + 0],
                y: tflite!.HEAPF32[offset + 1],
                z: tflite!.HEAPF32[offset + 2],
                score: pose.landmarkKeypoints[j].score,
                visibility: pose.landmarkKeypoints[j].visibility,
                presence: pose.landmarkKeypoints[j].presence,
            })
        }
        if (pose.score > 0.1 && pose.landmarkScore > 0.0) {
            tflitePoses.push(pose)
        }
    }

    const poses: Pose[] = tflitePoses.map(x => {
        const pose: Pose = {
            keypoints: [...x.landmarkKeypoints],
            keypoints3D: [...x.landmarkKeypoints3D],
            box: {
                xMin: x.pose.minX,
                yMin: x.pose.minY,
                xMax: x.pose.maxX,
                yMax: x.pose.maxY,
                width: x.pose.maxX - x.pose.minX,
                height: x.pose.maxY - x.pose.maxY
            }
        }

        return pose
    })
    return poses
};

onmessage = async (event) => {
    if (event.data.message === WorkerCommand.INITIALIZE) {
        console.log("Initialize model!.", event);
        config = event.data.config as MediapipeMixConfig;

        if (config.browserType !== BrowserTypes.SAFARI) {
            // SIMD
            const modSimd = require("../resources/wasm/tflite-simd.js");
            const b = Buffer.from(config.wasmSimdBase64!, "base64");
            tflite = await modSimd({ wasmBinary: b });
        } else {
            // Not-SIMD not upportd!
            // const mod = require("../resources/wasm/tflite.js");
            // const b = Buffer.from(config.wasmBase64!, "base64");
            // tflite = await mod({ wasmBinary: b });
            console.error("This module use wasm-simd. Safari is not supported.")
        }

        // (1) Load Hand Model
        // (1-1) load palm detector model
        const palmDetectorModel = Buffer.from(config.palmDetectorModelTFLites[config.handModelKey], "base64")
        tflite!._initPalmDetectorModelBuffer(palmDetectorModel.byteLength);
        const palmDetectorModelBufferOffset = tflite!._getPalmDetectorModelBufferAddress();
        tflite!.HEAPU8.set(new Uint8Array(palmDetectorModel), palmDetectorModelBufferOffset);
        tflite!._loadPalmDetectorModel(palmDetectorModel.byteLength);

        // (1-2) load hand landmark model
        const handLandmarkModel = Buffer.from(config.handLandmarkModelTFLites[config.handModelKey], "base64");
        tflite!._initHandLandmarkModelBuffer(handLandmarkModel.byteLength);
        const handLandmarkModelBufferOffset = tflite!._getHandLandmarkModelBufferAddress();
        tflite!.HEAPU8.set(new Uint8Array(handLandmarkModel), handLandmarkModelBufferOffset);
        tflite!._loadHandLandmarkModel(handLandmarkModel.byteLength);

        // (1-3) configure hand model
        tflite!._initHandInputBuffer(config.maxProcessWidth, config.maxProcessHeight, 4)
        tfliteHandInputAddress = tflite!._getHandInputBufferAddress()
        tfliteHandOutputAddress = tflite!._getHandOutputBufferAddress()
        console.log("[worker] Hand model is loaded successfully.", config);


        // (2) Load Face Model
        // (2-1) load face detector model
        const faceDetectorModel = Buffer.from(config.faceDetectorModelTFLites[config.faceModelKey], "base64")
        tflite!._initFaceDetectorModelBuffer(faceDetectorModel.byteLength);
        const faceDetectorModelBufferOffset = tflite!._getFaceDetectorModelBufferAddress();
        tflite!.HEAPU8.set(new Uint8Array(faceDetectorModel), faceDetectorModelBufferOffset);
        tflite!._loadFaceDetectorModel(faceDetectorModel.byteLength);

        // (2-2) load face landmark model
        const faceLandmarkModel = Buffer.from(config.faceLandmarkModelTFLites[config.faceModelKey], "base64");
        tflite!._initFaceLandmarkModelBuffer(faceLandmarkModel.byteLength);
        const faceLandmarkModelBufferOffset = tflite!._getFaceLandmarkModelBufferAddress();
        tflite!.HEAPU8.set(new Uint8Array(faceLandmarkModel), faceLandmarkModelBufferOffset);
        tflite!._loadFaceLandmarkModel(faceLandmarkModel.byteLength);

        // (2-3) configure face model
        tflite!._initFaceInputBuffer(config.maxProcessWidth, config.maxProcessHeight, 4)
        tfliteFaceInputAddress = tflite!._getFaceInputBufferAddress()
        tfliteFaceOutputAddress = tflite!._getFaceOutputBufferAddress()
        console.log("[worker] Face model is loaded successfully.", config);

        // (3) Load Pose Model
        // (3-1) load pose detector model
        const poseDetectorModel = Buffer.from(config.poseDetectorModelTFLites[config.poseModelKey], "base64")
        tflite!._initPoseDetectorModelBuffer(poseDetectorModel.byteLength);
        const poseDetectorModelBufferOffset = tflite!._getPoseDetectorModelBufferAddress();
        tflite!.HEAPU8.set(new Uint8Array(poseDetectorModel), poseDetectorModelBufferOffset);
        tflite!._loadPoseDetectorModel(poseDetectorModel.byteLength);

        // (3-2) load pose landmark model
        const poseLandmarkModel = Buffer.from(config.poseLandmarkModelTFLites[config.poseModelKey], "base64");
        tflite!._initPoseLandmarkModelBuffer(poseLandmarkModel.byteLength);
        const poseLandmarkModelBufferOffset = tflite!._getPoseLandmarkModelBufferAddress();
        tflite!.HEAPU8.set(new Uint8Array(poseLandmarkModel), poseLandmarkModelBufferOffset);
        tflite!._loadPoseLandmarkModel(poseLandmarkModel.byteLength);

        // (3-3) configure pose model
        tflite!._initPoseInputBuffer(config.maxProcessWidth, config.maxProcessHeight, 4)
        tflitePoseInputAddress = tflite!._getPoseInputBufferAddress()
        tflitePoseOutputAddress = tflite!._getPoseOutputBufferAddress()
        console.log("[worker] Pose model is loaded successfully.", config);

        ctx.postMessage({ message: WorkerResponse.INITIALIZED });
    } else if (event.data.message === WorkerCommand.PREDICT) {
        const params = event.data.params as MediapipeMixOperationParams;
        const data: Uint8ClampedArray = event.data.data;

        const prediction = await predict(config!, params, data);
        ctx.postMessage({
            message: WorkerResponse.PREDICTED,
            prediction: prediction,
        });
    }
};
