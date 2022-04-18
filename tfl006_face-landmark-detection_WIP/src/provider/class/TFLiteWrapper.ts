import { BrowserTypes, getBrowserType } from "@dannadori/000_WorkerBase";
import { Hand, HandposeConfig, HandposeOperationParams, TFLite } from "../../const";

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
        this.tflite!._exec2(params.processWidth, params.processHeight);

        const e = this.tflite!._getOutputBufferAddress()
        // const outImage = new ImageData(new Uint8ClampedArray(this.tflite!.HEAPU8.slice(e, e + params.processWidth * params.processHeight * 4)), params.processWidth, params.processHeight)
        // return outImage
        const handNum = this.tflite!.HEAPF32[e / 4];
        console.log("handnum !!", handNum);
        const hands: Hand[] = []
        for (let i = 0; i < handNum; i++) {
            // 11: score and rects
            //  8: ratated hand
            // 14: palm keypoints
            // 42: landmark keypoints
            // -> 11 + 8 + 14 + 42 = 75
            const offset = e / 4 + 1 + i * (11 + 8 + 14 + 42)
            const hand: Hand = {
                score: this.tflite!.HEAPF32[offset + 0],
                landmarkScore: this.tflite!.HEAPF32[offset + 1],
                rotation: this.tflite!.HEAPF32[offset + 2],
                palm: {
                    minX: this.tflite!.HEAPF32[offset + 3],
                    minY: this.tflite!.HEAPF32[offset + 4],
                    maxX: this.tflite!.HEAPF32[offset + 5],
                    maxY: this.tflite!.HEAPF32[offset + 6],
                },
                hand: {
                    minX: this.tflite!.HEAPF32[offset + 7],
                    minY: this.tflite!.HEAPF32[offset + 8],
                    maxX: this.tflite!.HEAPF32[offset + 9],
                    maxY: this.tflite!.HEAPF32[offset + 10],
                },
                rotatedHand: {
                    positions: [
                        // {
                        //     x: this.tflite!.HEAPF32[offset + 11],
                        //     y: this.tflite!.HEAPF32[offset + 12],
                        // },
                        // {
                        //     x: this.tflite!.HEAPF32[offset + 13],
                        //     y: this.tflite!.HEAPF32[offset + 14],
                        // },
                        // {
                        //     x: this.tflite!.HEAPF32[offset + 15],
                        //     y: this.tflite!.HEAPF32[offset + 16],
                        // },
                        // {
                        //     x: this.tflite!.HEAPF32[offset + 17],
                        //     y: this.tflite!.HEAPF32[offset + 18],
                        // },
                    ]
                },
                palmKeypoints: [
                    // { // 1
                    //     x: this.tflite!.HEAPF32[offset + 19],
                    //     y: this.tflite!.HEAPF32[offset + 20],
                    // },
                    // { // 2
                    //     x: this.tflite!.HEAPF32[offset + 21],
                    //     y: this.tflite!.HEAPF32[offset + 22],
                    // },
                    // { // 3
                    //     x: this.tflite!.HEAPF32[offset + 23],
                    //     y: this.tflite!.HEAPF32[offset + 24],
                    // },
                    // { // 4
                    //     x: this.tflite!.HEAPF32[offset + 25],
                    //     y: this.tflite!.HEAPF32[offset + 26],
                    // },
                    // { // 5
                    //     x: this.tflite!.HEAPF32[offset + 27],
                    //     y: this.tflite!.HEAPF32[offset + 28],
                    // },
                    // { // 6
                    //     x: this.tflite!.HEAPF32[offset + 29],
                    //     y: this.tflite!.HEAPF32[offset + 30],
                    // },
                    // { // 7
                    //     x: this.tflite!.HEAPF32[offset + 31],
                    //     y: this.tflite!.HEAPF32[offset + 32],
                    // },
                ],
                landmarkKeypoints: [
                    // { // 1
                    //     x: this.tflite!.HEAPF32[offset + 33],
                    //     y: this.tflite!.HEAPF32[offset + 34],
                    // },
                    // { // 2
                    //     x: this.tflite!.HEAPF32[offset + 35],
                    //     y: this.tflite!.HEAPF32[offset + 36],
                    // },
                    // { // 3
                    //     x: this.tflite!.HEAPF32[offset + 37],
                    //     y: this.tflite!.HEAPF32[offset + 38],
                    // },
                    // { // 4
                    //     x: this.tflite!.HEAPF32[offset + 39],
                    //     y: this.tflite!.HEAPF32[offset + 40],
                    // },
                    // { // 5
                    //     x: this.tflite!.HEAPF32[offset + 41],
                    //     y: this.tflite!.HEAPF32[offset + 42],
                    // },
                    // { // 6
                    //     x: this.tflite!.HEAPF32[offset + 43],
                    //     y: this.tflite!.HEAPF32[offset + 44],
                    // },
                    // { // 7
                    //     x: this.tflite!.HEAPF32[offset + 45],
                    //     y: this.tflite!.HEAPF32[offset + 46],
                    // },
                    // { // 8
                    //     x: this.tflite!.HEAPF32[offset + 47],
                    //     y: this.tflite!.HEAPF32[offset + 48],
                    // },
                    // { // 9
                    //     x: this.tflite!.HEAPF32[offset + 49],
                    //     y: this.tflite!.HEAPF32[offset + 50],
                    // },
                    // { // 10
                    //     x: this.tflite!.HEAPF32[offset + 51],
                    //     y: this.tflite!.HEAPF32[offset + 52],
                    // },
                    // { // 11
                    //     x: this.tflite!.HEAPF32[offset + 53],
                    //     y: this.tflite!.HEAPF32[offset + 54],
                    // },
                    // { // 12
                    //     x: this.tflite!.HEAPF32[offset + 55],
                    //     y: this.tflite!.HEAPF32[offset + 56],
                    // },
                    // { // 13
                    //     x: this.tflite!.HEAPF32[offset + 57],
                    //     y: this.tflite!.HEAPF32[offset + 58],
                    // },
                    // { // 14
                    //     x: this.tflite!.HEAPF32[offset + 59],
                    //     y: this.tflite!.HEAPF32[offset + 60],
                    // },
                    // { // 15
                    //     x: this.tflite!.HEAPF32[offset + 61],
                    //     y: this.tflite!.HEAPF32[offset + 62],
                    // },
                    // { // 16
                    //     x: this.tflite!.HEAPF32[offset + 63],
                    //     y: this.tflite!.HEAPF32[offset + 64],
                    // },
                    // { // 17
                    //     x: this.tflite!.HEAPF32[offset + 65],
                    //     y: this.tflite!.HEAPF32[offset + 66],
                    // },
                    // { // 18
                    //     x: this.tflite!.HEAPF32[offset + 67],
                    //     y: this.tflite!.HEAPF32[offset + 68],
                    // },
                    // { // 19
                    //     x: this.tflite!.HEAPF32[offset + 69],
                    //     y: this.tflite!.HEAPF32[offset + 70],
                    // },
                    // { // 20
                    //     x: this.tflite!.HEAPF32[offset + 71],
                    //     y: this.tflite!.HEAPF32[offset + 72],
                    // },
                    // { // 21
                    //     x: this.tflite!.HEAPF32[offset + 73],
                    //     y: this.tflite!.HEAPF32[offset + 74],
                    // },
                ],
            }
            for (let j = 0; j < 4; j++) {
                let rotatedOffset = (e / 4 + 1) + (i * 75) + (11) + (j * 2)
                hand.rotatedHand.positions.push({
                    x: this.tflite!.HEAPF32[rotatedOffset + 0],
                    y: this.tflite!.HEAPF32[rotatedOffset + 1],
                })
            }
            for (let j = 0; j < 7; j++) {
                let palmKeypointOffset = (e / 4 + 1) + (i * 75) + (11 + 8) + (j * 2)
                hand.palmKeypoints.push({
                    x: this.tflite!.HEAPF32[palmKeypointOffset + 0],
                    y: this.tflite!.HEAPF32[palmKeypointOffset + 1],
                })
            }
            for (let j = 0; j < 21; j++) {
                let landmarkKeypointOffset = (e / 4 + 1) + (i * 75) + (11 + 8 + 14) + (j * 2)
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
