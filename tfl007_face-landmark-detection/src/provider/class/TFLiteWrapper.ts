import { BrowserTypes, getBrowserType } from "@dannadori/000_WorkerBase";
import { TFLite, TFLiteFaceLandmarkDetection, FaceLandmarkDetectionConfig, FaceLandmarkDetectionOperationParams } from "../../const";

export class TFLiteWrapper {
    tflite: TFLite | null = null;
    imageInputAddress: number = 0
    tempImage: ImageData | null = null
    getTemporaryImage = () => {
        return this.tempImage;
    }

    init = async (config: FaceLandmarkDetectionConfig) => {
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

        /// load palm model
        const tfliteModel = Buffer.from(config.modelTFLites[config.modelKey], "base64");
        this.tflite!._initDetectorModelBuffer(tfliteModel.byteLength);
        const modelBufferOffset = this.tflite!._getDetectorModelBufferAddress();
        this.tflite!.HEAPU8.set(new Uint8Array(tfliteModel), modelBufferOffset);
        this.tflite!._loadDetectorModel(tfliteModel.byteLength);

        // load landmark model
        const tfliteLandmarkModel = Buffer.from(config.landmarkModelTFLites[config.modelKey], "base64");
        this.tflite!._initLandmarkModelBuffer(tfliteLandmarkModel.byteLength);
        const landmarkModelBufferOffset = this.tflite!._getLandmarkModelBufferAddress();
        this.tflite!.HEAPU8.set(new Uint8Array(tfliteLandmarkModel), landmarkModelBufferOffset);
        this.tflite!._loadLandmarkModel(tfliteLandmarkModel.byteLength);


        this.tflite!._initInputBuffer(config.maxProcessWidth, config.maxProcessHeight, 4)
        this.imageInputAddress = this.tflite!._getInputBufferAddress()
    };

    exec = (config: FaceLandmarkDetectionConfig, params: FaceLandmarkDetectionOperationParams, targetCanvas: HTMLCanvasElement) => {
        const tmpCanvas = document.createElement("canvas")
        tmpCanvas.width = params.processWidth
        tmpCanvas.height = params.processHeight
        tmpCanvas.getContext("2d")!.drawImage(targetCanvas, 0, 0, tmpCanvas.width, tmpCanvas.height)
        const imageData = tmpCanvas.getContext("2d")!.getImageData(0, 0, tmpCanvas.width, tmpCanvas.height)


        this.tflite!.HEAPU8.set(imageData.data, this.imageInputAddress);
        // this.tflite!._copySrc2Dst(this.width, this.height, 4);
        this.tflite!._exec(params.processWidth, params.processHeight, 4);

        ////////////////////////
        // for debug
        /////////////////////////
        const tempoaryAddress = this.tflite!._getTemporaryBufferAddress()
        const tmpRes = new Uint8ClampedArray(this.tflite!.HEAPU8.slice(tempoaryAddress, tempoaryAddress + params.processWidth * params.processWidth * 4));
        // console.log("tempRES", tmpRes)
        // console.log("params width", params.processWidth, params.processWidth)
        try {
            this.tempImage = new ImageData(tmpRes, params.processWidth, params.processHeight);
            // this.tempImage = new ImageData(tmpRes, 840, 840);
        } catch (err) {
            console.log(err)
        }

        const e = this.tflite!._getOutputBufferAddress()
        // const outImage = new ImageData(new Uint8ClampedArray(this.tflite!.HEAPU8.slice(e, e + params.processWidth * params.processHeight * 4)), params.processWidth, params.processHeight)
        // return outImage
        const handNum = this.tflite!.HEAPF32[e / 4];
        const hands: TFLiteFaceLandmarkDetection[] = []
        for (let i = 0; i < handNum; i++) {
            //   11: score and rects
            //    8: ratated hand (4x2D)
            //   12: palm keypoints(6x2D)
            // 1404: landmark keypoints(468x3D)
            //  160: landmark Lip keypoints(80x2D)
            //  142: landmark left eye keypoints(71x2D)
            //  142: landmark right eye keypoints(71x2D)
            //   10: landmark left iris keypoint(5x2D)
            //   10: landmark right iris keypoint(5x2D)
            // -> 11 + 8 + 12 + 1404 + 160 + 142 + 142 + 10 + 10 = 1899
            const offset = e / 4 + 1 + i * (1899)
            const hand: TFLiteFaceLandmarkDetection = {
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
                let offset = (e / 4 + 1) + (i * 1899) + (11) + (j * 2)
                hand.rotatedFace.positions.push({
                    x: this.tflite!.HEAPF32[offset + 0],
                    y: this.tflite!.HEAPF32[offset + 1],
                })
            }
            for (let j = 0; j < 6; j++) {
                let offset = (e / 4 + 1) + (i * 1899) + (11 + 8) + (j * 2)
                hand.faceKeypoints.push({
                    x: this.tflite!.HEAPF32[offset + 0],
                    y: this.tflite!.HEAPF32[offset + 1],
                })
            }
            for (let j = 0; j < 468; j++) {
                let offset = (e / 4 + 1) + (i * 1899) + (11 + 8 + 12) + (j * 3)
                hand.landmarkKeypoints.push({
                    x: this.tflite!.HEAPF32[offset + 0],
                    y: this.tflite!.HEAPF32[offset + 1],
                    z: this.tflite!.HEAPF32[offset + 2],
                })
            }
            for (let j = 0; j < 80; j++) {
                let offset = (e / 4 + 1) + (i * 1899) + (11 + 8 + 12 + 1404) + (j * 2)
                hand.landmarkLipsKeypoints.push({
                    x: this.tflite!.HEAPF32[offset + 0],
                    y: this.tflite!.HEAPF32[offset + 1],
                })
            }
            for (let j = 0; j < 71; j++) {
                let offset = (e / 4 + 1) + (i * 1899) + (11 + 8 + 12 + 1404 + 160) + (j * 2)
                hand.landmarkLeftEyeKeypoints.push({
                    x: this.tflite!.HEAPF32[offset + 0],
                    y: this.tflite!.HEAPF32[offset + 1],
                })
            }
            for (let j = 0; j < 71; j++) {
                let offset = (e / 4 + 1) + (i * 1899) + (11 + 8 + 12 + 1404 + 160 + 142) + (j * 2)
                hand.landmarkRightEyeKeypoints.push({
                    x: this.tflite!.HEAPF32[offset + 0],
                    y: this.tflite!.HEAPF32[offset + 1],
                })
            }
            for (let j = 0; j < 5; j++) {
                let offset = (e / 4 + 1) + (i * 1899) + (11 + 8 + 12 + 1404 + 160 + 142 + 142) + (j * 2)
                hand.landmarkLeftIrisKeypoints.push({
                    x: this.tflite!.HEAPF32[offset + 0],
                    y: this.tflite!.HEAPF32[offset + 1],
                })
            }
            for (let j = 0; j < 5; j++) {
                let offset = (e / 4 + 1) + (i * 1899) + (11 + 8 + 12 + 1404 + 160 + 142 + 142 + 10) + (j * 2)
                hand.landmarkRightIrisKeypoints.push({
                    x: this.tflite!.HEAPF32[offset + 0],
                    y: this.tflite!.HEAPF32[offset + 1],
                })
            }
            hands.push(hand)
        }
        return hands

    }

}
