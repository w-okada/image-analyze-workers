import { BrowserTypes, getBrowserType, LocalWorker, WorkerManagerBase } from "@dannadori/worker-base";
import { NUM_KEYPOINTS, RefinedPoints, TRIANGULATION } from "./facePoints"
import { FacePredictionEx, FingerLookupIndices, HandPredictionEx, MediapipeMixConfig, MediapipeMixOperationParams, OperationType, PartsLookupIndices, PosePredictionEx, TFLite, TFLiteFaceLandmarkDetection, TFLiteHand, TFLitePoseLandmarkDetection } from "./const";
import { Pose } from "@tensorflow-models/pose-detection";
// import { Face, Keypoint } from "@tensorflow-models/face-landmarks-detection";
// import { Hand } from "@tensorflow-models/hand-pose-detection";
// import { BoundingBox } from "@tensorflow-models/face-landmarks-detection/dist/shared/calculators/interfaces/shape_interfaces";

import { Hand } from "@tensorflow-models/hand-pose-detection/dist/types";
import { Face, Keypoint } from "@tensorflow-models/face-landmarks-detection/dist/types";
import { BoundingBox } from "@tensorflow-models/face-landmarks-detection/dist/shared/calculators/interfaces/shape_interfaces";


export { OperationType, MediapipeMixConfig, MediapipeMixOperationParams, HandPredictionEx, FacePredictionEx, PosePredictionEx, PartsLookupIndices, TRIANGULATION, NUM_KEYPOINTS, FingerLookupIndices }

// @ts-ignore
import palmDetectorTFLite from "../resources/tflite/detector/palm_detection_lite.bin";
// @ts-ignore
import handLandmarkLiteTFLite from "../resources/tflite/landmark/hand_landmark_lite.bin";
// @ts-ignore
import faceDetectorTFLite from "../resources/tflite/detector/face_detection_short_range.bin";
// @ts-ignore
import faceLandmarkLiteTFLite from "../resources/tflite/landmark/model_float16_quant.bin";
// @ts-ignore
import poseDetectorTFLite from "../resources/tflite/detector/pose_detection.bin";
// @ts-ignore
import poseLandmarkLiteTFLite from "../resources/tflite/landmark/pose_landmark_lite.bin";

// @ts-ignore
import workerJs from "worker-loader?inline=no-fallback!./mediapipe-mix-worker-worker.ts";

// @ts-ignore
import wasmSimd from "../resources/wasm/tflite-simd.wasm";

export const generateMediapipeMixDefaultConfig = (): MediapipeMixConfig => {
    const defaultConf: MediapipeMixConfig = {
        browserType: getBrowserType(),
        processOnLocal: true,
        pageUrl: window.location.href,
        wasmSimdBase64: wasmSimd.split(",")[1],

        palmDetectorModelTFLites: {
            "lite": palmDetectorTFLite.split(",")[1],
        },
        handLandmarkModelTFLites: {
            "lite": handLandmarkLiteTFLite.split(",")[1],
        },
        handModelKey: "lite",
        faceDetectorModelTFLites: {
            "lite": faceDetectorTFLite.split(",")[1],
        },
        faceLandmarkModelTFLites: {
            "lite": faceLandmarkLiteTFLite.split(",")[1],
        },
        faceModelKey: "lite",
        poseDetectorModelTFLites: {
            "lite": poseDetectorTFLite.split(",")[1],
        },
        poseLandmarkModelTFLites: {
            "lite": poseLandmarkLiteTFLite.split(",")[1],
        },
        poseModelKey: "lite",

        maxProcessWidth: 1024,
        maxProcessHeight: 1024,
    };
    return defaultConf;
};

export const generateDefaultMediapipeMixParams = () => {
    const defaultParams: MediapipeMixOperationParams = {
        operationType: OperationType.face,
        handProcessWidth: 512,
        handProcessHeight: 512,
        handMaxHands: 2,
        handAffineResizedFactor: 2,
        faceProcessWidth: 512,
        faceProcessHeight: 512,
        faceMaxFaces: 1,
        faceMovingAverageWindow: 5,
        poseProcessWidth: 512,
        poseProcessHeight: 512,
        poseMaxPoses: 1,
        poseMovingAverageWindow: 5,
        poseAffineResizedFactor: 2,
        poseCropExt: 1.3,
        poseCalculateMode: 0
    };
    return defaultParams;
};

export class LocalMM extends LocalWorker {
    tflite: TFLite | null = null;
    tfliteHandInputAddress: number = 0
    tfliteHandOutputAddress: number = 0
    tfliteFaceInputAddress: number = 0
    tfliteFaceOutputAddress: number = 0
    tflitePoseInputAddress: number = 0
    tflitePoseOutputAddress: number = 0

    init = async (config: MediapipeMixConfig) => {
        const browserType = getBrowserType();
        if (browserType !== BrowserTypes.SAFARI) {
            // SIMD
            const modSimd = require("../resources/wasm/tflite-simd.js");
            const b = Buffer.from(config.wasmSimdBase64!, "base64");
            this.tflite = await modSimd({ wasmBinary: b });
        } else {
            // Not-SIMD not upportd!
            // const mod = require("../resources/wasm/tflite.js");
            // const b = Buffer.from(config.wasmBase64!, "base64");
            // this.tflite = await mod({ wasmBinary: b });
            console.error("This module use wasm-simd. Safari is not supported.")
        }

        // (1) Load Hand Model
        // (1-1) load palm detector model
        const palmDetectorModel = Buffer.from(config.palmDetectorModelTFLites[config.handModelKey], "base64")
        this.tflite!._initPalmDetectorModelBuffer(palmDetectorModel.byteLength);
        const palmDetectorModelBufferOffset = this.tflite!._getPalmDetectorModelBufferAddress();
        this.tflite!.HEAPU8.set(new Uint8Array(palmDetectorModel), palmDetectorModelBufferOffset);
        this.tflite!._loadPalmDetectorModel(palmDetectorModel.byteLength);

        // (1-2) load hand landmark model
        const handLandmarkModel = Buffer.from(config.handLandmarkModelTFLites[config.handModelKey], "base64");
        this.tflite!._initHandLandmarkModelBuffer(handLandmarkModel.byteLength);
        const handLandmarkModelBufferOffset = this.tflite!._getHandLandmarkModelBufferAddress();
        this.tflite!.HEAPU8.set(new Uint8Array(handLandmarkModel), handLandmarkModelBufferOffset);
        this.tflite!._loadHandLandmarkModel(handLandmarkModel.byteLength);

        // (1-3) configure hand model
        this.tflite!._initHandInputBuffer(config.maxProcessWidth, config.maxProcessHeight, 4)
        this.tfliteHandInputAddress = this.tflite!._getHandInputBufferAddress()
        this.tfliteHandOutputAddress = this.tflite!._getHandOutputBufferAddress()
        console.log("Hand model is loaded successfully.", config);


        // (2) Load Face Model
        // (2-1) load face detector model
        const faceDetectorModel = Buffer.from(config.faceDetectorModelTFLites[config.faceModelKey], "base64")
        this.tflite!._initFaceDetectorModelBuffer(faceDetectorModel.byteLength);
        const faceDetectorModelBufferOffset = this.tflite!._getFaceDetectorModelBufferAddress();
        this.tflite!.HEAPU8.set(new Uint8Array(faceDetectorModel), faceDetectorModelBufferOffset);
        this.tflite!._loadFaceDetectorModel(faceDetectorModel.byteLength);

        // (2-2) load face landmark model
        const faceLandmarkModel = Buffer.from(config.faceLandmarkModelTFLites[config.faceModelKey], "base64");
        this.tflite!._initFaceLandmarkModelBuffer(faceLandmarkModel.byteLength);
        const faceLandmarkModelBufferOffset = this.tflite!._getFaceLandmarkModelBufferAddress();
        this.tflite!.HEAPU8.set(new Uint8Array(faceLandmarkModel), faceLandmarkModelBufferOffset);
        this.tflite!._loadFaceLandmarkModel(faceLandmarkModel.byteLength);

        // (2-3) configure face model
        this.tflite!._initFaceInputBuffer(config.maxProcessWidth, config.maxProcessHeight, 4)
        this.tfliteFaceInputAddress = this.tflite!._getFaceInputBufferAddress()
        this.tfliteFaceOutputAddress = this.tflite!._getFaceOutputBufferAddress()
        console.log("Face model is loaded successfully.", config);

        // (3) Load Pose Model
        // (3-1) load pose detector model
        const poseDetectorModel = Buffer.from(config.poseDetectorModelTFLites[config.poseModelKey], "base64")
        this.tflite!._initPoseDetectorModelBuffer(poseDetectorModel.byteLength);
        const poseDetectorModelBufferOffset = this.tflite!._getPoseDetectorModelBufferAddress();
        this.tflite!.HEAPU8.set(new Uint8Array(poseDetectorModel), poseDetectorModelBufferOffset);
        this.tflite!._loadPoseDetectorModel(poseDetectorModel.byteLength);

        // (3-2) load pose landmark model
        const poseLandmarkModel = Buffer.from(config.poseLandmarkModelTFLites[config.poseModelKey], "base64");
        this.tflite!._initPoseLandmarkModelBuffer(poseLandmarkModel.byteLength);
        const poseLandmarkModelBufferOffset = this.tflite!._getPoseLandmarkModelBufferAddress();
        this.tflite!.HEAPU8.set(new Uint8Array(poseLandmarkModel), poseLandmarkModelBufferOffset);
        this.tflite!._loadPoseLandmarkModel(poseLandmarkModel.byteLength);

        // (3-3) configure pose model
        this.tflite!._initPoseInputBuffer(config.maxProcessWidth, config.maxProcessHeight, 4)
        this.tflitePoseInputAddress = this.tflite!._getPoseInputBufferAddress()
        this.tflitePoseOutputAddress = this.tflite!._getPoseOutputBufferAddress()
        console.log("Pose model is loaded successfully.", config);
    };

    predict = async (config: MediapipeMixConfig, params: MediapipeMixOperationParams, targetCanvas: HTMLCanvasElement) => {
        if (!this.tflite) {
            console.log("tflite is null")
            return null
        }
        if (params.operationType === OperationType.hand) {
            return this.predictHand(config, params, targetCanvas)
        }
        if (params.operationType === OperationType.face) {
            return this.predictFace(config, params, targetCanvas)
        }
        if (params.operationType === OperationType.pose) {
            return this.predictPose(config, params, targetCanvas)
        }

        return null
    }


    predictHand = async (config: MediapipeMixConfig, params: MediapipeMixOperationParams, targetCanvas: HTMLCanvasElement) => {
        const imageData = targetCanvas.getContext("2d")!.getImageData(0, 0, targetCanvas.width, targetCanvas.height)
        this.tflite!.HEAPU8.set(imageData.data, this.tfliteHandInputAddress);
        this.tflite!._execHand(params.handProcessWidth, params.handProcessHeight, params.handMaxHands, params.handAffineResizedFactor);
        const handNum = this.tflite!.HEAPF32[this.tfliteHandOutputAddress / 4];
        const tfliteHands: TFLiteHand[] = []

        for (let i = 0; i < handNum; i++) {
            // 12: score and rects
            //  8: ratated hand
            // 14: palm keypoints
            // 63: landmark keypoints
            // -> 12 + 8 + 14 + 63 = 97
            const offset = this.tfliteHandOutputAddress / 4 + 1 + i * (97)
            const hand: TFLiteHand = {
                score: this.tflite!.HEAPF32[offset + 0],
                landmarkScore: this.tflite!.HEAPF32[offset + 1],
                handedness: this.tflite!.HEAPF32[offset + 2],
                rotation: this.tflite!.HEAPF32[offset + 3],
                palm: {
                    minX: this.tflite!.HEAPF32[offset + 4],
                    minY: this.tflite!.HEAPF32[offset + 5],
                    maxX: this.tflite!.HEAPF32[offset + 6],
                    maxY: this.tflite!.HEAPF32[offset + 7],
                },
                hand: {
                    minX: this.tflite!.HEAPF32[offset + 8],
                    minY: this.tflite!.HEAPF32[offset + 9],
                    maxX: this.tflite!.HEAPF32[offset + 10],
                    maxY: this.tflite!.HEAPF32[offset + 11],
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
                let rotatedOffset = (this.tfliteHandOutputAddress / 4 + 1) + (i * 97) + (12) + (j * 2)
                hand.rotatedHand.positions.push({
                    x: this.tflite!.HEAPF32[rotatedOffset + 0],
                    y: this.tflite!.HEAPF32[rotatedOffset + 1],
                })
            }
            for (let j = 0; j < 7; j++) {
                let palmKeypointOffset = (this.tfliteHandOutputAddress / 4 + 1) + (i * 97) + (12 + 8) + (j * 2)
                hand.palmKeypoints.push({
                    x: this.tflite!.HEAPF32[palmKeypointOffset + 0],
                    y: this.tflite!.HEAPF32[palmKeypointOffset + 1],
                })
            }
            for (let j = 0; j < 21; j++) {
                let landmarkKeypointOffset = (this.tfliteHandOutputAddress / 4 + 1) + (i * 97) + (12 + 8 + 14) + (j * 3)
                hand.landmarkKeypoints.push({
                    x: this.tflite!.HEAPF32[landmarkKeypointOffset + 0],
                    y: this.tflite!.HEAPF32[landmarkKeypointOffset + 1],
                    z: this.tflite!.HEAPF32[landmarkKeypointOffset + 2],
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

    predictFace = async (config: MediapipeMixConfig, params: MediapipeMixOperationParams, targetCanvas: HTMLCanvasElement) => {
        const imageData = targetCanvas.getContext("2d")!.getImageData(0, 0, targetCanvas.width, targetCanvas.height)
        this.tflite!.HEAPU8.set(imageData.data, this.tfliteFaceInputAddress);
        this.tflite!._execFace(params.faceProcessWidth, params.faceProcessHeight, params.faceMaxFaces);
        const faceNum = this.tflite!.HEAPF32[this.tfliteFaceOutputAddress / 4];
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
            const offset = this.tfliteFaceOutputAddress / 4 + 1 + i * (1899)
            const face: TFLiteFaceLandmarkDetection = {
                score: this.tflite!.HEAPF32[offset + 0],
                landmarkScore: this.tflite!.HEAPF32[offset + 1],
                rotation: this.tflite!.HEAPF32[offset + 2],
                face: {
                    minX: this.tflite!.HEAPF32[offset + 3],
                    minY: this.tflite!.HEAPF32[offset + 4],
                    maxX: this.tflite!.HEAPF32[offset + 5],
                    maxY: this.tflite!.HEAPF32[offset + 6],
                },
                faceWithMargin: {
                    minX: this.tflite!.HEAPF32[offset + 7],
                    minY: this.tflite!.HEAPF32[offset + 8],
                    maxX: this.tflite!.HEAPF32[offset + 9],
                    maxY: this.tflite!.HEAPF32[offset + 10],
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
                let offset = (this.tfliteFaceOutputAddress / 4 + 1) + (i * 1899) + (11) + (j * 2)
                face.rotatedFace.positions.push({
                    x: this.tflite!.HEAPF32[offset + 0],
                    y: this.tflite!.HEAPF32[offset + 1],
                })
            }
            for (let j = 0; j < 6; j++) {
                let offset = (this.tfliteFaceOutputAddress / 4 + 1) + (i * 1899) + (11 + 8) + (j * 2)
                face.faceKeypoints.push({
                    x: this.tflite!.HEAPF32[offset + 0],
                    y: this.tflite!.HEAPF32[offset + 1],
                })
            }
            for (let j = 0; j < 468; j++) {
                let offset = (this.tfliteFaceOutputAddress / 4 + 1) + (i * 1899) + (11 + 8 + 12) + (j * 3)
                face.landmarkKeypoints.push({
                    x: this.tflite!.HEAPF32[offset + 0],
                    y: this.tflite!.HEAPF32[offset + 1],
                    z: this.tflite!.HEAPF32[offset + 2],
                })
            }
            for (let j = 0; j < 80; j++) {
                let offset = (this.tfliteFaceOutputAddress / 4 + 1) + (i * 1899) + (11 + 8 + 12 + 1404) + (j * 2)
                face.landmarkLipsKeypoints.push({
                    x: this.tflite!.HEAPF32[offset + 0],
                    y: this.tflite!.HEAPF32[offset + 1],
                })
            }
            for (let j = 0; j < 71; j++) {
                let offset = (this.tfliteFaceOutputAddress / 4 + 1) + (i * 1899) + (11 + 8 + 12 + 1404 + 160) + (j * 2)
                face.landmarkLeftEyeKeypoints.push({
                    x: this.tflite!.HEAPF32[offset + 0],
                    y: this.tflite!.HEAPF32[offset + 1],
                })
            }
            for (let j = 0; j < 71; j++) {
                let offset = (this.tfliteFaceOutputAddress / 4 + 1) + (i * 1899) + (11 + 8 + 12 + 1404 + 160 + 142) + (j * 2)
                face.landmarkRightEyeKeypoints.push({
                    x: this.tflite!.HEAPF32[offset + 0],
                    y: this.tflite!.HEAPF32[offset + 1],
                })
            }
            for (let j = 0; j < 5; j++) {
                let offset = (this.tfliteFaceOutputAddress / 4 + 1) + (i * 1899) + (11 + 8 + 12 + 1404 + 160 + 142 + 142) + (j * 2)
                face.landmarkLeftIrisKeypoints.push({
                    x: this.tflite!.HEAPF32[offset + 0],
                    y: this.tflite!.HEAPF32[offset + 1],
                })
            }
            for (let j = 0; j < 5; j++) {
                let offset = (this.tfliteFaceOutputAddress / 4 + 1) + (i * 1899) + (11 + 8 + 12 + 1404 + 160 + 142 + 142 + 10) + (j * 2)
                face.landmarkRightIrisKeypoints.push({
                    x: this.tflite!.HEAPF32[offset + 0],
                    y: this.tflite!.HEAPF32[offset + 1],
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

    predictPose = async (_config: MediapipeMixConfig, params: MediapipeMixOperationParams, targetCanvas: HTMLCanvasElement) => {
        const imageData = targetCanvas.getContext("2d")!.getImageData(0, 0, targetCanvas.width, targetCanvas.height)
        this.tflite!.HEAPU8.set(imageData.data, this.tflitePoseInputAddress);
        this.tflite!._set_pose_calculate_mode(params.poseCalculateMode) // for debug
        this.tflite!._execPose(params.poseProcessWidth, params.poseProcessHeight, params.poseMaxPoses, params.poseAffineResizedFactor, params.poseCropExt);
        const poseNum = this.tflite!.HEAPF32[this.tflitePoseOutputAddress / 4];
        const tflitePoses: TFLitePoseLandmarkDetection[] = []
        for (let i = 0; i < poseNum; i++) {
            //   11: score and rects
            //    8: ratated pose (4x2D)
            //    8: pose keypoints(6x2D)
            //  195: landmark keypoints(39x5D)
            //  117: landmark keypoints(39x3D)
            // -> 11 + 8 + 12 + 195 + 117 = 343
            const offset = this.tflitePoseOutputAddress / 4 + 1 + i * (343)
            const pose: TFLitePoseLandmarkDetection = {
                score: this.tflite!.HEAPF32[offset + 0],
                landmarkScore: this.tflite!.HEAPF32[offset + 1],
                rotation: this.tflite!.HEAPF32[offset + 2],
                pose: {
                    minX: this.tflite!.HEAPF32[offset + 3],
                    minY: this.tflite!.HEAPF32[offset + 4],
                    maxX: this.tflite!.HEAPF32[offset + 5],
                    maxY: this.tflite!.HEAPF32[offset + 6],
                },
                poseWithMargin: {
                    minX: this.tflite!.HEAPF32[offset + 7],
                    minY: this.tflite!.HEAPF32[offset + 8],
                    maxX: this.tflite!.HEAPF32[offset + 9],
                    maxY: this.tflite!.HEAPF32[offset + 10],
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
                const offset = this.tflitePoseOutputAddress / 4 + 1 + i * (343) + (11) + (j * 2)
                pose.rotatedPose.positions.push({
                    x: this.tflite!.HEAPF32[offset + 0],
                    y: this.tflite!.HEAPF32[offset + 1],
                })
            }
            for (let j = 0; j < 4; j++) {
                const offset = this.tflitePoseOutputAddress / 4 + 1 + i * (343) + (11 + 8) + (j * 2)
                pose.poseKeypoints.push({
                    x: this.tflite!.HEAPF32[offset + 0],
                    y: this.tflite!.HEAPF32[offset + 1],
                })
            }
            for (let j = 0; j < 33; j++) {
                const offset = this.tflitePoseOutputAddress / 4 + 1 + i * (343) + (11 + 8 + 8) + (j * 5)
                pose.landmarkKeypoints.push({
                    x: this.tflite!.HEAPF32[offset + 0],
                    y: this.tflite!.HEAPF32[offset + 1],
                    z: this.tflite!.HEAPF32[offset + 2],
                    score: this.tflite!.HEAPF32[offset + 3],
                    visibility: this.tflite!.HEAPF32[offset + 3],
                    presence: this.tflite!.HEAPF32[offset + 4],
                })
            }
            for (let j = 0; j < 33; j++) {
                const offset = this.tflitePoseOutputAddress / 4 + 1 + i * (343) + (11 + 8 + 8 + 195) + (j * 3)
                pose.landmarkKeypoints3D.push({
                    x: this.tflite!.HEAPF32[offset + 0],
                    y: this.tflite!.HEAPF32[offset + 1],
                    z: this.tflite!.HEAPF32[offset + 2],
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
    }
}

export class MediapipeMixWorkerManager extends WorkerManagerBase {
    private config = generateMediapipeMixDefaultConfig();
    localWorker = new LocalMM();

    init = async (config: MediapipeMixConfig | null) => {
        this.config = config || generateMediapipeMixDefaultConfig();
        await this.initCommon(
            {
                useWorkerForSafari: true,
                processOnLocal: this.config.processOnLocal,
                workerJs: () => {
                    return new workerJs();
                },
            },
            config
        );
        console.log("tflite worker initilizied. at manager")

        return;
    };

    predict = async (params: MediapipeMixOperationParams, targetCanvas: HTMLCanvasElement | HTMLVideoElement) => {
        const currentParams = { ...params };

        // (1) generate resized canvas
        const createResizedCanvas = (currentParams: MediapipeMixOperationParams, targetCanvas: HTMLCanvasElement | HTMLVideoElement) => {
            if (params.operationType === OperationType.hand) {
                return this.generateTargetCanvas(targetCanvas, currentParams.handProcessWidth, currentParams.handProcessHeight);
            } else if (params.operationType === OperationType.face) {
                return this.generateTargetCanvas(targetCanvas, currentParams.faceProcessWidth, currentParams.faceProcessHeight);
            } else {
                return this.generateTargetCanvas(targetCanvas, currentParams.poseProcessWidth, currentParams.poseProcessHeight);
            }
        }
        const resizedCanvas = createResizedCanvas(currentParams, targetCanvas)

        // (2) predict on local
        if (!this.worker) {
            const prediction = await this.localWorker.predict(this.config, currentParams, resizedCanvas);
            if (currentParams.operationType === OperationType.hand) {
                return this.generateHandPredictionEx(this.config, currentParams, prediction as Hand[] | null)
            } else if (currentParams.operationType === OperationType.face) {
                return this.generateFacePredictionEx(this.config, currentParams, prediction as Face[] | null)
            } else {
                return this.generatePosePredictionEx(this.config, currentParams, prediction as Pose[] | null)
            }
        }

        // (3) predicton on webworker
        const imageData = resizedCanvas.getContext("2d")!.getImageData(0, 0, resizedCanvas.width, resizedCanvas.height);
        const prediction = (await this.sendToWorker(currentParams, imageData.data));
        if (currentParams.operationType === OperationType.hand) {
            return this.generateHandPredictionEx(this.config, currentParams, prediction as Hand[] | null)
        } else if (currentParams.operationType === OperationType.face) {
            return this.generateFacePredictionEx(this.config, currentParams, prediction as Face[] | null)
        } else {
            return this.generatePosePredictionEx(this.config, currentParams, prediction as Pose[] | null)
        }
    };

    /////////////////////////////////////////
    // Generate Hand Result
    /////////////////////////////////////////
    generateHandPredictionEx = (config: MediapipeMixConfig, params: MediapipeMixOperationParams, prediction: Hand[] | null): HandPredictionEx => {
        const hands = prediction
        const predictionEx: HandPredictionEx = {
            operationType: OperationType.hand,
            rowPrediction: hands,
        };
        return predictionEx
    }


    /////////////////////////////////////////
    // Generate Face Result
    /////////////////////////////////////////
    facesMV: Face[][] = [];
    generateFacePredictionEx = (config: MediapipeMixConfig, params: MediapipeMixOperationParams, prediction: Face[] | null): FacePredictionEx => {
        const faces = prediction
        const predictionEx: FacePredictionEx = {
            operationType: OperationType.face,
            rowPrediction: faces,
        };
        if (params.faceMovingAverageWindow > 0) {
            /// (1)蓄積データ 更新
            if (faces) {
                while (this.facesMV.length > params.faceMovingAverageWindow) {
                    this.facesMV.shift();
                    // console.log("datanum", this.annotatedPredictionsMV.length);
                }
            }
            if (faces && faces[0] && faces[0].keypoints) {
                this.facesMV.push(faces);
            }

            /// (2) キーポイント移動平均算出
            /// (2-1) ウィンドウ内の一人目のランドマークを抽出
            const keypointsEach = this.facesMV.map((pred) => {
                return pred[0].keypoints;
            });
            /// (2-2) 足し合わせ
            const summedKeypoints = keypointsEach.reduce((prev, cur) => {
                for (let i = 0; i < cur.length; i++) {
                    if (prev[i]) {
                        prev[i].x = prev[i].x + cur[i].x;
                        prev[i].y = prev[i].y + cur[i].y;
                        prev[i].z = (prev[i].z || 0) + (cur[i].z || 0);
                    } else {
                        prev.push({
                            x: cur[i].x,
                            y: cur[i].y,
                            z: (cur[i].z || 0),
                            score: cur[i].score || undefined,
                            name: cur[i].name || undefined
                        });
                    }
                }
                return prev;
            }, [] as Keypoint[]);
            /// (2-3) 平均化
            for (let i = 0; i < summedKeypoints.length; i++) {
                summedKeypoints[i].x = summedKeypoints[i].x / this.facesMV.length;
                summedKeypoints[i].y = summedKeypoints[i].y / this.facesMV.length;
                summedKeypoints[i].z = (summedKeypoints[i].z || 0) / this.facesMV.length;
            }
            /// (2-4) 追加
            predictionEx.singlePersonKeypointsMovingAverage = summedKeypoints;

            /// (3) ボックス移動平均算出
            /// (3-1) ウィンドウ内の一人目のランドマークを抽出
            const boundingBoxEach = this.facesMV.map((pred) => {
                return pred[0].box;
            });
            /// (2-2) 足し合わせ
            const summedBoundingBox = boundingBoxEach.reduce((prev, cur) => {
                if (prev.width) {
                    prev.width = prev.width + cur.width;
                    prev.xMax = prev.xMax + cur.xMax;
                    prev.xMin = prev.xMin + cur.xMin;
                    prev.height = prev.height + cur.height;
                    prev.yMax = prev.yMax + cur.yMax;
                    prev.yMin = prev.yMin + cur.yMin;
                } else {
                    return {
                        width: cur.width,
                        xMax: cur.xMax,
                        xMin: cur.xMin,
                        height: cur.height,
                        yMax: cur.yMax,
                        yMin: cur.yMin,
                    };
                }
                return prev;
            }, {} as BoundingBox);
            /// (2-3) 平均化
            console.log();
            summedBoundingBox.width /= this.facesMV.length;
            summedBoundingBox.xMax /= this.facesMV.length;
            summedBoundingBox.xMin /= this.facesMV.length;
            summedBoundingBox.height /= this.facesMV.length;
            summedBoundingBox.yMax /= this.facesMV.length;
            summedBoundingBox.yMin /= this.facesMV.length;
            /// (2-4) 追加
            predictionEx.singlePersonBoxMovingAverage = summedBoundingBox;
        }
        return predictionEx;
    }


    /////////////////////////////////////////
    // Generate Pose Result
    /////////////////////////////////////////
    posesMV: Pose[][] = [];
    generatePosePredictionEx = (config: MediapipeMixConfig, params: MediapipeMixOperationParams, prediction: Pose[] | null): PosePredictionEx => {
        const poses = prediction
        const predictionEx: PosePredictionEx = {
            operationType: OperationType.pose,
            rowPrediction: poses,
        };
        if (params.poseMovingAverageWindow > 0) {
            /// (1)蓄積データ 更新
            if (poses) {
                while (this.posesMV.length > params.poseMovingAverageWindow) {
                    this.posesMV.shift();
                }
            }
            if (poses && poses[0] && poses[0].keypoints) {
                this.posesMV.push(poses);
            }

            /// (2) キーポイント移動平均算出
            /// (2-1) ウィンドウ内の一人目のランドマークを抽出
            const keypointsEach = this.posesMV.map((pred) => {
                return pred[0].keypoints;
            });
            /// (2-2) 足し合わせ
            const summedKeypoints = keypointsEach.reduce((prev, cur) => {
                for (let i = 0; i < cur.length; i++) {
                    if (prev[i]) {
                        prev[i].x = prev[i].x + cur[i].x;
                        prev[i].y = prev[i].y + cur[i].y;
                        prev[i].z = (prev[i].z || 0) + (cur[i].z || 0);
                    } else {
                        prev.push({
                            x: cur[i].x,
                            y: cur[i].y,
                            z: (cur[i].z || 0),
                            score: cur[i].score || undefined,
                            name: cur[i].name || undefined
                        });
                    }
                }
                return prev;
            }, [] as Keypoint[]);
            /// (2-3) 平均化
            for (let i = 0; i < summedKeypoints.length; i++) {
                summedKeypoints[i].x = summedKeypoints[i].x / this.posesMV.length;
                summedKeypoints[i].y = summedKeypoints[i].y / this.posesMV.length;
                summedKeypoints[i].z = (summedKeypoints[i].z || 0) / this.posesMV.length;
            }
            /// (2-4) 追加
            predictionEx.singlePersonKeypointsMovingAverage = summedKeypoints;


            /// (3) キーポイント3D移動平均算出
            /// (3-1) ウィンドウ内の一人目のランドマークを抽出
            const keypoints3DEach = this.posesMV.map((pred) => {
                return pred[0].keypoints3D!;
            });
            /// (2-2) 足し合わせ
            const summedKeypoints3D = keypoints3DEach.reduce((prev, cur) => {
                for (let i = 0; i < cur.length; i++) {
                    if (prev[i]) {
                        prev[i].x = prev[i].x + cur[i].x;
                        prev[i].y = prev[i].y + cur[i].y;
                        prev[i].z = (prev[i].z || 0) + (cur[i].z || 0);
                    } else {
                        prev.push({
                            x: cur[i].x,
                            y: cur[i].y,
                            z: (cur[i].z || 0),
                            score: cur[i].score || undefined,
                            name: cur[i].name || undefined
                        });
                    }
                }
                return prev;
            }, [] as Keypoint[]);
            /// (2-3) 平均化
            for (let i = 0; i < summedKeypoints3D.length; i++) {
                summedKeypoints3D[i].x = summedKeypoints3D[i].x / this.posesMV.length;
                summedKeypoints3D[i].y = summedKeypoints3D[i].y / this.posesMV.length;
                summedKeypoints3D[i].z = (summedKeypoints3D[i].z || 0) / this.posesMV.length;
            }
            /// (2-4) 追加
            predictionEx.singlePersonKeypoints3DMovingAverage = summedKeypoints3D;




            /// (3) ボックス移動平均算出
            /// (3-1) ウィンドウ内の一人目のランドマークを抽出
            const boundingBoxEach = this.posesMV.map((pred) => {
                return pred[0].box!;
            });
            /// (2-2) 足し合わせ
            const summedBoundingBox = boundingBoxEach.reduce((prev, cur) => {
                if (prev.width) {
                    prev.width = prev.width + cur.width;
                    prev.xMax = prev.xMax + cur.xMax;
                    prev.xMin = prev.xMin + cur.xMin;
                    prev.height = prev.height + cur.height;
                    prev.yMax = prev.yMax + cur.yMax;
                    prev.yMin = prev.yMin + cur.yMin;
                } else {
                    return {
                        width: cur.width,
                        xMax: cur.xMax,
                        xMin: cur.xMin,
                        height: cur.height,
                        yMax: cur.yMax,
                        yMin: cur.yMin,
                    };
                }
                return prev;
            }, {} as BoundingBox);
            /// (2-3) 平均化
            console.log();
            summedBoundingBox.width /= this.posesMV.length;
            summedBoundingBox.xMax /= this.posesMV.length;
            summedBoundingBox.xMin /= this.posesMV.length;
            summedBoundingBox.height /= this.posesMV.length;
            summedBoundingBox.yMax /= this.posesMV.length;
            summedBoundingBox.yMin /= this.posesMV.length;
            /// (2-4) 追加
            predictionEx.singlePersonBoxMovingAverage = summedBoundingBox;
        }

        return predictionEx;
    }


    /////////////////////////////////////////
    // Face Crop Utility
    /////////////////////////////////////////

    fitCroppedArea = (prediction: FacePredictionEx, orgWidth: number, orgHeight: number, processedWidth: number, processedHeight: number, outputWidth: number, outputHeight: number, extendRatioTop: number, extendRatioBottom: number, extendRatioLeft: number, extendRatioRight: number) => {
        if (!prediction.singlePersonBoxMovingAverage) {
            return { xmin: 0, ymin: 0, width: 0, height: 0 };
        }
        const scaleX = orgWidth / processedWidth;
        const scaleY = orgHeight / processedHeight;
        const scaledXMin = prediction.singlePersonBoxMovingAverage!.xMin * scaleX;
        const scaledXMax = prediction.singlePersonBoxMovingAverage!.xMax * scaleX;
        const scaledWidth = scaledXMax - scaledXMin;
        const scaledYMin = prediction.singlePersonBoxMovingAverage!.yMin * scaleY;
        const scaledYMax = prediction.singlePersonBoxMovingAverage!.yMax * scaleY;
        const scaledHeight = scaledYMax - scaledYMin;
        const scaledCenterX = (scaledXMax + scaledXMin) / 2;
        const scaledCenterY = (scaledYMax + scaledYMin) / 2;
        const scaledRadiusX = scaledXMax - scaledCenterX;
        const scaledRadiusY = scaledYMax - scaledCenterY;

        let extendedXmin = scaledCenterX - scaledRadiusX * (1 + extendRatioLeft);
        extendedXmin = extendedXmin < 0 ? 0 : extendedXmin;
        let extendedXmax = scaledCenterX + scaledRadiusX * (1 + extendRatioRight);
        extendedXmax = extendedXmax > orgWidth ? orgWidth : extendedXmax;
        let extendedYmin = scaledCenterY - scaledRadiusY * (1 + extendRatioTop);
        extendedYmin = extendedYmin < 0 ? 0 : extendedYmin;
        let extendedYmax = scaledCenterY + scaledRadiusY * (1 + extendRatioBottom);
        extendedYmax = extendedYmax > orgHeight ? orgHeight : extendedYmax;

        const extendedWidth = extendedXmax - extendedXmin;
        const extendedHeight = extendedYmax - extendedYmin;
        const extendedCenterX = (extendedXmax + extendedXmin) / 2;
        const extendedCenterY = (extendedYmax + extendedYmin) / 2;

        const outputAspect = outputHeight / outputWidth;

        let idealWidth;
        let idealHeight;
        if (extendedWidth * outputAspect > extendedHeight) {
            //高さが足りない
            idealWidth = extendedWidth;
            idealHeight = extendedWidth * outputAspect;
        } else {
            //幅が足りない
            idealWidth = extendedHeight / outputAspect;
            idealHeight = extendedHeight;
        }

        let xmin;
        if (extendedCenterX - idealWidth / 2 < 0) {
            xmin = 0;
        } else if (extendedCenterX + idealWidth / 2 > orgWidth) {
            xmin = orgWidth - idealWidth;
        } else {
            xmin = extendedCenterX - idealWidth / 2;
        }

        let ymin;
        if (extendedCenterY - idealHeight / 2 < 0) {
            ymin = 0;
        } else if (extendedCenterY + idealHeight / 2 > orgHeight) {
            ymin = orgHeight - idealHeight;
        } else {
            ymin = extendedCenterY - idealHeight / 2;
        }
        return { xmin: xmin, ymin: ymin, width: idealWidth, height: idealHeight };
    };


}
