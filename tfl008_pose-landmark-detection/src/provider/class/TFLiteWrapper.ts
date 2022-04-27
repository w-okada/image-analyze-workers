import { BrowserTypes, getBrowserType } from "@dannadori/000_WorkerBase";
import { TFLite, TFLitePoseLandmarkDetection, PoseLandmarkDetectionConfig, PoseLandmarkDetectionOperationParams } from "../../const";

export class TFLiteWrapper {
    tflite: TFLite | null = null;
    imageInputAddress: number = 0
    tempImage: ImageData | null = null
    getTemporaryImage = () => {
        return this.tempImage;
    }

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

        /// load detector model
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

    exec = (config: PoseLandmarkDetectionConfig, params: PoseLandmarkDetectionOperationParams, targetCanvas: HTMLCanvasElement) => {
        const tmpCanvas = document.createElement("canvas")
        tmpCanvas.width = params.processWidth
        tmpCanvas.height = params.processHeight
        tmpCanvas.getContext("2d")!.drawImage(targetCanvas, 0, 0, tmpCanvas.width, tmpCanvas.height)
        const imageData = tmpCanvas.getContext("2d")!.getImageData(0, 0, tmpCanvas.width, tmpCanvas.height)


        this.tflite!.HEAPU8.set(imageData.data, this.imageInputAddress);
        // this.tflite!._copySrc2Dst(this.width, this.height, 4);
        this.tflite!._exec(params.processWidth, params.processHeight, 1, 4);

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
        const poseNum = this.tflite!.HEAPF32[e / 4];
        const poses: TFLitePoseLandmarkDetection[] = []
        for (let i = 0; i < poseNum; i++) {
            //   11: score and rects
            //    8: ratated pose (4x2D)
            //    8: pose keypoints(6x2D)
            //  195: landmark keypoints(468x3D)
            // -> 11 + 8 + 12 + 195 = 226
            const offset = e / 4 + 1 + i * (226)
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
            }
            for (let j = 0; j < 4; j++) {
                let offset = (e / 4 + 1) + (i * 226) + (11) + (j * 2)
                pose.rotatedPose.positions.push({
                    x: this.tflite!.HEAPF32[offset + 0],
                    y: this.tflite!.HEAPF32[offset + 1],
                })
            }
            for (let j = 0; j < 4; j++) {
                let offset = (e / 4 + 1) + (i * 226) + (11 + 8) + (j * 2)
                pose.poseKeypoints.push({
                    x: this.tflite!.HEAPF32[offset + 0],
                    y: this.tflite!.HEAPF32[offset + 1],
                })
            }
            for (let j = 0; j < 39; j++) {
                let offset = (e / 4 + 1) + (i * 226) + (11 + 8 + 8) + (j * 5)
                pose.landmarkKeypoints.push({
                    x: this.tflite!.HEAPF32[offset + 0],
                    y: this.tflite!.HEAPF32[offset + 1],
                    z: this.tflite!.HEAPF32[offset + 2],
                    visibility: this.tflite!.HEAPF32[offset + 3],
                    presence: this.tflite!.HEAPF32[offset + 4],
                })
            }
            poses.push(pose)
        }
        return poses

    }

}
