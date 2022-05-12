import { BrowserTypes, getBrowserType } from "@dannadori/000_WorkerBase";
import { TFLite, TFLitePoseLandmarkDetection, PoseLandmarkDetectionConfig, PoseLandmarkDetectionOperationParams, TFLiteHand } from "../../const";

export class TFLiteWrapper {
    tflite: TFLite | null = null;
    poseImageInputAddress: number = 0
    poseTempImage: ImageData | null = null
    getPoseTemporaryImage = () => {
        return this.poseTempImage;
    }
    handImageInputAddress: number = 0
    handTempImage: ImageData | null = null


    init = async (config: PoseLandmarkDetectionConfig) => {
        const browserType = getBrowserType();
        if (config.useSimd && browserType !== BrowserTypes.SAFARI) {
            const modSimd = require("../../../resources/wasm/tflite-simd.js");
            const b = Buffer.from(config.wasmSimdBase64!, "base64");
            this.tflite = await modSimd({ wasmBinary: b });
        } else {
            const mod = require("../../../resources/wasm/tflite.js");
            const b = Buffer.from(config.wasmBase64!, "base64");
            this.tflite = await mod({ wasmBinary: b });
        }
        // (1) Hand Pose
        /// load palm model
        const tflitePalmDetectorModel = Buffer.from(config.palmDetectorModelTFLites[config.handModelKey], "base64");
        this.tflite!._initPalmDetectorModelBuffer(tflitePalmDetectorModel.byteLength);
        const palmDetectorModelBufferOffset = this.tflite!._getPalmDetectorModelBufferAddress();
        this.tflite!.HEAPU8.set(new Uint8Array(tflitePalmDetectorModel), palmDetectorModelBufferOffset);
        this.tflite!._loadPalmDetectorModel(tflitePalmDetectorModel.byteLength);

        // load landmark model
        const tfliteLandmarkModel = Buffer.from(config.handLandmarkModelTFLites[config.handModelKey], "base64");
        this.tflite!._initHandLandmarkModelBuffer(tfliteLandmarkModel.byteLength);
        const landmarkModelBufferOffset = this.tflite!._getHandLandmarkModelBufferAddress();
        this.tflite!.HEAPU8.set(new Uint8Array(tfliteLandmarkModel), landmarkModelBufferOffset);
        this.tflite!._loadHandLandmarkModel(tfliteLandmarkModel.byteLength);


        this.tflite!._initHandInputBuffer(config.maxProcessWidth, config.maxProcessHeight, 4)
        this.handImageInputAddress = this.tflite!._getHandInputBufferAddress()

        // (3) Load Pose
        //// (3-1) load pose detector model
        const tflitePoseDetectorModel = Buffer.from(config.poseDetectorModelTFLites[config.poseModelKey], "base64");
        this.tflite!._initPoseDetectorModelBuffer(tflitePoseDetectorModel.byteLength);
        const poseModelBufferOffset = this.tflite!._getPoseDetectorModelBufferAddress();
        this.tflite!.HEAPU8.set(new Uint8Array(tflitePoseDetectorModel), poseModelBufferOffset);
        this.tflite!._loadPoseDetectorModel(tflitePoseDetectorModel.byteLength);

        //// (3-2) load pose landmark model
        const tflitePoseLandmarkModel = Buffer.from(config.poseLandmarkModelTFLites[config.poseModelKey], "base64");
        this.tflite!._initPoseLandmarkModelBuffer(tflitePoseLandmarkModel.byteLength);
        const poseLandmarkModelBufferOffset = this.tflite!._getPoseLandmarkModelBufferAddress();
        this.tflite!.HEAPU8.set(new Uint8Array(tflitePoseLandmarkModel), poseLandmarkModelBufferOffset);
        this.tflite!._loadPoseLandmarkModel(tflitePoseLandmarkModel.byteLength);

        // (3-3) configure pose
        this.tflite!._initPoseInputBuffer(config.maxProcessWidth, config.maxProcessHeight, 4)
        this.poseImageInputAddress = this.tflite!._getPoseInputBufferAddress()
        this.tflite!._set_pose_calculate_mode(1)

    };

    execPose = (config: PoseLandmarkDetectionConfig, params: PoseLandmarkDetectionOperationParams, targetCanvas: HTMLCanvasElement) => {
        const tmpCanvas = document.createElement("canvas")
        tmpCanvas.width = params.processWidth
        tmpCanvas.height = params.processHeight
        tmpCanvas.getContext("2d")!.drawImage(targetCanvas, 0, 0, tmpCanvas.width, tmpCanvas.height)
        const imageData = tmpCanvas.getContext("2d")!.getImageData(0, 0, tmpCanvas.width, tmpCanvas.height)


        this.tflite!.HEAPU8.set(imageData.data, this.poseImageInputAddress);
        // this.tflite!._copySrc2Dst(this.width, this.height, 4);
        this.tflite!._execPose(params.processWidth, params.processHeight, 1, 4, 1.8);

        ////////////////////////
        // for debug
        /////////////////////////
        const tempoaryAddress = this.tflite!._getPoseTemporaryBufferAddress()
        const tmpRes = new Uint8ClampedArray(this.tflite!.HEAPU8.slice(tempoaryAddress, tempoaryAddress + params.processWidth * params.processWidth * 4));
        // console.log("tempRES", tmpRes)
        // console.log("params width", params.processWidth, params.processWidth)
        try {
            this.poseTempImage = new ImageData(tmpRes, params.processWidth, params.processHeight);
            // this.tempImage = new ImageData(tmpRes, 840, 840);
        } catch (err) {
            console.log(err)
        }

        const e = this.tflite!._getPoseOutputBufferAddress()
        // const outImage = new ImageData(new Uint8ClampedArray(this.tflite!.HEAPU8.slice(e, e + params.processWidth * params.processHeight * 4)), params.processWidth, params.processHeight)
        // return outImage
        const poseNum = this.tflite!.HEAPF32[e / 4];
        const poses: TFLitePoseLandmarkDetection[] = []
        for (let i = 0; i < poseNum; i++) {
            //   11: score and rects
            //    8: ratated pose (4x2D)
            //    8: pose keypoints(6x2D)
            //  195: landmark keypoints(39x3D)
            //  117: landmark keypoints(39x3D)
            // -> 11 + 8 + 12 + 195 + 117 = 343
            const offset = e / 4 + 1 + i * (343)
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
                let offset = (e / 4 + 1) + (i * 343) + (11) + (j * 2)
                pose.rotatedPose.positions.push({
                    x: this.tflite!.HEAPF32[offset + 0],
                    y: this.tflite!.HEAPF32[offset + 1],
                })
            }
            for (let j = 0; j < 4; j++) {
                let offset = (e / 4 + 1) + (i * 343) + (11 + 8) + (j * 2)
                pose.poseKeypoints.push({
                    x: this.tflite!.HEAPF32[offset + 0],
                    y: this.tflite!.HEAPF32[offset + 1],
                })
            }
            for (let j = 0; j < 39; j++) {
                let offset = (e / 4 + 1) + (i * 343) + (11 + 8 + 8) + (j * 5)
                pose.landmarkKeypoints.push({
                    x: this.tflite!.HEAPF32[offset + 0],
                    y: this.tflite!.HEAPF32[offset + 1],
                    z: this.tflite!.HEAPF32[offset + 2],
                    visibility: this.tflite!.HEAPF32[offset + 3],
                    presence: this.tflite!.HEAPF32[offset + 4],
                })
            }
            for (let j = 0; j < 39; j++) {
                let offset = (e / 4 + 1) + (i * 343) + (11 + 8 + 8 + 195) + (j * 3)
                pose.landmarkKeypoints3D.push({
                    x: this.tflite!.HEAPF32[offset + 0],
                    y: this.tflite!.HEAPF32[offset + 1],
                    z: this.tflite!.HEAPF32[offset + 2],
                })
            }

            poses.push(pose)
        }
        console.log(poses)
        return poses

    }



    execHand = (config: PoseLandmarkDetectionConfig, params: PoseLandmarkDetectionOperationParams, targetCanvas: HTMLCanvasElement) => {
        const tmpCanvas = document.createElement("canvas")
        tmpCanvas.width = params.processWidth
        tmpCanvas.height = params.processHeight
        tmpCanvas.getContext("2d")!.drawImage(targetCanvas, 0, 0, tmpCanvas.width, tmpCanvas.height)
        const imageData = tmpCanvas.getContext("2d")!.getImageData(0, 0, tmpCanvas.width, tmpCanvas.height)


        this.tflite!.HEAPU8.set(imageData.data, this.handImageInputAddress);
        // this.tflite!._copySrc2Dst(this.width, this.height, 4);
        this.tflite!._execHand(params.processWidth, params.processHeight, 4, 2);

        ////////////////////////
        // for debug
        /////////////////////////
        const tempoaryAddress = this.tflite!._getHandTemporaryBufferAddress()
        const tmpRes = new Uint8ClampedArray(this.tflite!.HEAPU8.slice(tempoaryAddress, tempoaryAddress + params.processWidth * params.processWidth * 4));
        console.log("tempRES", tmpRes)
        console.log("params width", params.processWidth, params.processWidth)
        try {
            this.handTempImage = new ImageData(tmpRes, params.processWidth, params.processHeight);
            // this.tempImage = new ImageData(tmpRes, 840, 840);
        } catch (err) {
            console.log(err)
        }

        const e = this.tflite!._getHandOutputBufferAddress()
        // const outImage = new ImageData(new Uint8ClampedArray(this.tflite!.HEAPU8.slice(e, e + params.processWidth * params.processHeight * 4)), params.processWidth, params.processHeight)
        // return outImage
        const handNum = this.tflite!.HEAPF32[e / 4];
        const hands: TFLiteHand[] = []
        for (let i = 0; i < handNum; i++) {
            // 12: score and rects
            //  8: ratated hand
            // 14: palm keypoints
            // 63: landmark keypoints
            // -> 12 + 8 + 14 + 63 = 97
            const offset = e / 4 + 1 + i * (97)
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
                    positions: [
                    ]
                },
                palmKeypoints: [
                ],
                landmarkKeypoints: [
                ],
            }
            for (let j = 0; j < 4; j++) {
                let rotatedOffset = (e / 4 + 1) + (i * 97) + (12) + (j * 2)
                hand.rotatedHand.positions.push({
                    x: this.tflite!.HEAPF32[rotatedOffset + 0],
                    y: this.tflite!.HEAPF32[rotatedOffset + 1],
                })
            }
            for (let j = 0; j < 7; j++) {
                let palmKeypointOffset = (e / 4 + 1) + (i * 97) + (12 + 8) + (j * 2)
                hand.palmKeypoints.push({
                    x: this.tflite!.HEAPF32[palmKeypointOffset + 0],
                    y: this.tflite!.HEAPF32[palmKeypointOffset + 1],
                })
            }
            for (let j = 0; j < 21; j++) {
                let landmarkKeypointOffset = (e / 4 + 1) + (i * 97) + (12 + 8 + 14) + (j * 3)
                hand.landmarkKeypoints.push({
                    x: this.tflite!.HEAPF32[landmarkKeypointOffset + 0],
                    y: this.tflite!.HEAPF32[landmarkKeypointOffset + 1],
                    z: this.tflite!.HEAPF32[landmarkKeypointOffset + 2],
                })
            }
            hands.push(hand)
        }
        console.log(hands);
        return hands

    }

}
