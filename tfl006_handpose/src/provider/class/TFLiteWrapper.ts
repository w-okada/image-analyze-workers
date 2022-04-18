import { BrowserTypes, getBrowserType } from "@dannadori/000_WorkerBase";
import { TFLiteHand, HandposeConfig, HandposeOperationParams, TFLite } from "../../const";

export class TFLiteWrapper {
    tflite: TFLite | null = null;
    imageInputAddress: number = 0

    init = async (config: HandposeConfig) => {
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
        this.tflite!._initModelBuffer(tfliteModel.byteLength);
        const modelBufferOffset = this.tflite!._getModelBufferAddress();
        this.tflite!.HEAPU8.set(new Uint8Array(tfliteModel), modelBufferOffset);
        this.tflite!._loadModel(tfliteModel.byteLength);

        // load landmark model
        const tfliteLandmarkModel = Buffer.from(config.landmarkModelTFLites[config.modelKey], "base64");
        this.tflite!._initLandmarkModelBuffer(tfliteLandmarkModel.byteLength);
        const landmarkModelBufferOffset = this.tflite!._getLandmarkModelBufferAddress();
        this.tflite!.HEAPU8.set(new Uint8Array(tfliteLandmarkModel), landmarkModelBufferOffset);
        this.tflite!._loadLandmarkModel(tfliteLandmarkModel.byteLength);


        this.tflite!._initInputBuffer(config.maxProcessWidth, config.maxProcessHeight, 4)
        this.imageInputAddress = this.tflite!._getInputBufferAddress()
    };

    exec = (config: HandposeConfig, params: HandposeOperationParams, targetCanvas: HTMLCanvasElement) => {
        const tmpCanvas = document.createElement("canvas")
        tmpCanvas.width = params.processWidth
        tmpCanvas.height = params.processHeight
        tmpCanvas.getContext("2d")!.drawImage(targetCanvas, 0, 0, tmpCanvas.width, tmpCanvas.height)
        const imageData = tmpCanvas.getContext("2d")!.getImageData(0, 0, tmpCanvas.width, tmpCanvas.height)


        this.tflite!.HEAPU8.set(imageData.data, this.imageInputAddress);
        // this.tflite!._copySrc2Dst(this.width, this.height, 4);
        this.tflite!._exec(params.processWidth, params.processHeight, 4);

        const e = this.tflite!._getOutputBufferAddress()
        // const outImage = new ImageData(new Uint8ClampedArray(this.tflite!.HEAPU8.slice(e, e + params.processWidth * params.processHeight * 4)), params.processWidth, params.processHeight)
        // return outImage
        const handNum = this.tflite!.HEAPF32[e / 4];
        const hands: TFLiteHand[] = []
        for (let i = 0; i < handNum; i++) {
            // 12: score and rects
            //  8: ratated hand
            // 14: palm keypoints
            // 42: landmark keypoints
            // -> 12 + 8 + 14 + 42 = 76
            const offset = e / 4 + 1 + i * (12 + 8 + 14 + 42)
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
                let rotatedOffset = (e / 4 + 1) + (i * 76) + (12) + (j * 2)
                hand.rotatedHand.positions.push({
                    x: this.tflite!.HEAPF32[rotatedOffset + 0],
                    y: this.tflite!.HEAPF32[rotatedOffset + 1],
                })
            }
            for (let j = 0; j < 7; j++) {
                let palmKeypointOffset = (e / 4 + 1) + (i * 76) + (12 + 8) + (j * 2)
                hand.palmKeypoints.push({
                    x: this.tflite!.HEAPF32[palmKeypointOffset + 0],
                    y: this.tflite!.HEAPF32[palmKeypointOffset + 1],
                })
            }
            for (let j = 0; j < 21; j++) {
                let landmarkKeypointOffset = (e / 4 + 1) + (i * 76) + (12 + 8 + 14) + (j * 2)
                hand.landmarkKeypoints.push({
                    x: this.tflite!.HEAPF32[landmarkKeypointOffset + 0],
                    y: this.tflite!.HEAPF32[landmarkKeypointOffset + 1],
                })
            }
            hands.push(hand)
        }
        return hands

    }

}
