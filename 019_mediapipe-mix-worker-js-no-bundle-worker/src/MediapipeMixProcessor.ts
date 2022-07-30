import { BrowserTypes, ImageProcessor } from "@dannadori/worker-base";
import { Face } from "@tensorflow-models/face-landmarks-detection";
import { Hand } from "@tensorflow-models/hand-pose-detection";
import { Pose } from "@tensorflow-models/pose-detection";
import { MediapipeMix2Config, MediapipeMix2OperationParams, OperationType, TFLite, TFLiteFaceLandmarkDetection, TFLiteHand, TFLitePoseLandmarkDetection } from "./const";
import { RefinedPoints } from "./facePoints";

export class MediapipeMixProcessor extends ImageProcessor<MediapipeMix2Config, MediapipeMix2OperationParams> {
    tflite: TFLite | null = null;
    tfliteHandInputAddress: number = 0
    tfliteHandOutputAddress: number = 0
    tfliteFaceInputAddress: number = 0
    tfliteFaceOutputAddress: number = 0
    tflitePoseInputAddress: number = 0
    tflitePoseOutputAddress: number = 0

    init = async (config: MediapipeMix2Config) => {
        if (config.browserType !== BrowserTypes.SAFARI) {
            // SIMD
            const modSimd = require("../resources/wasm/tflite-simd.js");
            this.tflite = await modSimd({ wasmBinary: config.wasmBin });
        } else {
            // Not-SIMD not upportd!
            // const mod = require("../resources/wasm/tflite.js");
            // const b = Buffer.from(config.wasmBase64!, "base64");
            // this.tflite = await mod({ wasmBinary: b });
            console.error("This module use wasm-simd. Safari is not supported.")
        }

        // (1) Load Hand Model
        // (1-1) load palm detector model        
        const palmDetectorModelTFLite = config.palmDetectorModelTFLites[config.handModelKey]
        this.tflite!._initPalmDetectorModelBuffer(palmDetectorModelTFLite.byteLength);
        const palmDetectorModelBufferOffset = this.tflite!._getPalmDetectorModelBufferAddress();
        this.tflite!.HEAPU8.set(new Uint8Array(palmDetectorModelTFLite), palmDetectorModelBufferOffset);
        this.tflite!._loadPalmDetectorModel(palmDetectorModelTFLite.byteLength);

        // (1-2) load hand landmark model
        const handLandmarkModelTFLite = config.handLandmarkModelTFLites[config.handModelKey]
        this.tflite!._initHandLandmarkModelBuffer(handLandmarkModelTFLite.byteLength);
        const handLandmarkModelBufferOffset = this.tflite!._getHandLandmarkModelBufferAddress();
        this.tflite!.HEAPU8.set(new Uint8Array(handLandmarkModelTFLite), handLandmarkModelBufferOffset);
        this.tflite!._loadHandLandmarkModel(handLandmarkModelTFLite.byteLength);

        // (1-3) configure hand model
        this.tflite!._initHandInputBuffer(config.maxProcessWidth, config.maxProcessHeight, 4)
        this.tfliteHandInputAddress = this.tflite!._getHandInputBufferAddress()
        this.tfliteHandOutputAddress = this.tflite!._getHandOutputBufferAddress()
        console.log("Hand model is loaded successfully.", config);


        // (2) Load Face Model
        // (2-1) load face detector model
        const faceDetectorModelTFLite = config.faceDetectorModelTFLites[config.faceModelKey]
        this.tflite!._initFaceDetectorModelBuffer(faceDetectorModelTFLite.byteLength);
        const faceDetectorModelBufferOffset = this.tflite!._getFaceDetectorModelBufferAddress();
        this.tflite!.HEAPU8.set(new Uint8Array(faceDetectorModelTFLite), faceDetectorModelBufferOffset);
        this.tflite!._loadFaceDetectorModel(faceDetectorModelTFLite.byteLength);

        // (2-2) load face landmark model
        const faceLandmarkModelTFLite = config.faceLandmarkModelTFLites[config.faceModelKey]
        this.tflite!._initFaceLandmarkModelBuffer(faceLandmarkModelTFLite.byteLength);
        const faceLandmarkModelBufferOffset = this.tflite!._getFaceLandmarkModelBufferAddress();
        this.tflite!.HEAPU8.set(new Uint8Array(faceLandmarkModelTFLite), faceLandmarkModelBufferOffset);
        this.tflite!._loadFaceLandmarkModel(faceLandmarkModelTFLite.byteLength);

        // (2-3) configure face model
        this.tflite!._initFaceInputBuffer(config.maxProcessWidth, config.maxProcessHeight, 4)
        this.tfliteFaceInputAddress = this.tflite!._getFaceInputBufferAddress()
        this.tfliteFaceOutputAddress = this.tflite!._getFaceOutputBufferAddress()
        console.log("Face model is loaded successfully.", config);

        // (3) Load Pose Model
        // (3-1) load pose detector model
        const poseDetectorModelTFLite = config.poseDetectorModelTFLites[config.poseModelKey]
        this.tflite!._initPoseDetectorModelBuffer(poseDetectorModelTFLite.byteLength);
        const poseDetectorModelBufferOffset = this.tflite!._getPoseDetectorModelBufferAddress();
        this.tflite!.HEAPU8.set(new Uint8Array(poseDetectorModelTFLite), poseDetectorModelBufferOffset);
        this.tflite!._loadPoseDetectorModel(poseDetectorModelTFLite.byteLength);

        // (3-2) load pose landmark model
        const poseLandmarkModelTFLite = config.poseLandmarkModelTFLites[config.poseModelKey]
        this.tflite!._initPoseLandmarkModelBuffer(poseLandmarkModelTFLite.byteLength);
        const poseLandmarkModelBufferOffset = this.tflite!._getPoseLandmarkModelBufferAddress();
        this.tflite!.HEAPU8.set(new Uint8Array(poseLandmarkModelTFLite), poseLandmarkModelBufferOffset);
        this.tflite!._loadPoseLandmarkModel(poseLandmarkModelTFLite.byteLength);

        // (3-3) configure pose model
        this.tflite!._initPoseInputBuffer(config.maxProcessWidth, config.maxProcessHeight, 4)
        this.tflitePoseInputAddress = this.tflite!._getPoseInputBufferAddress()
        this.tflitePoseOutputAddress = this.tflite!._getPoseOutputBufferAddress()
        console.log("Pose model is loaded successfully.", config);
    }
    predict = async (config: MediapipeMix2Config, params: MediapipeMix2OperationParams, data: Uint8ClampedArray) => {
        if (params.operationType === OperationType.hand) {
            return this.predictHand(config, params, data)
        }
        if (params.operationType === OperationType.face) {
            return this.predictFace(config, params, data)
        }
        if (params.operationType === OperationType.pose) {
            return this.predictPose(config, params, data)
        }
        return null
    };


    predictHand = async (config: MediapipeMix2Config, params: MediapipeMix2OperationParams, data: Uint8ClampedArray): Promise<Hand[] | null> => {
        const imageData = new ImageData(data, params.handProcessWidth, params.handProcessHeight);
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


    predictFace = async (config: MediapipeMix2Config, params: MediapipeMix2OperationParams, data: Uint8ClampedArray): Promise<Face[] | null> => {
        const imageData = new ImageData(data, params.faceProcessWidth, params.faceProcessHeight);
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

            RefinedPoints.lips.forEach((dst: number, src: number) => {
                face.keypoints[dst].x = x.landmarkLipsKeypoints[src].x;
                face.keypoints[dst].y = x.landmarkLipsKeypoints[src].y;
            })
            RefinedPoints.leftEye.forEach((dst: number, src: number) => {
                face.keypoints[dst].x = x.landmarkLeftEyeKeypoints[src].x;
                face.keypoints[dst].y = x.landmarkLeftEyeKeypoints[src].y;
            })
            RefinedPoints.rightEye.forEach((dst: number, src: number) => {
                face.keypoints[dst].x = x.landmarkRightEyeKeypoints[src].x;
                face.keypoints[dst].y = x.landmarkRightEyeKeypoints[src].y;
            })
            RefinedPoints.leftIris.forEach((dst: number, src: number) => {
                face.keypoints[dst] = x.landmarkLeftIrisKeypoints[src];
            })
            RefinedPoints.rightIris.forEach((dst: number, src: number) => {
                face.keypoints[dst] = x.landmarkRightIrisKeypoints[src];
            })

            return face
        })
        return faces
    };



    predictPose = async (config: MediapipeMix2Config, params: MediapipeMix2OperationParams, data: Uint8ClampedArray): Promise<Pose[] | null> => {
        const imageData = new ImageData(data, params.poseProcessWidth, params.poseProcessHeight);
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
    };

}
