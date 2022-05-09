import { BrowserTypes, getBrowserType, LocalWorker, WorkerManagerBase } from "@dannadori/worker-base";
import { BackendTypes, FingerLookupIndices, HandPoseDetectionConfig, HandPoseDetectionOperationParams, HandPredictionEx, ModelTypes, ModelTypes2, TFLite, TFLiteHand } from "./const";
import { Hand } from "@tensorflow-models/hand-pose-detection";
export { BackendTypes, HandPoseDetectionConfig, HandPoseDetectionOperationParams, Hand, ModelTypes, ModelTypes2, FingerLookupIndices };
// @ts-ignore
import workerJs from "worker-loader?inline=no-fallback!./hand-pose-detection-worker-worker.ts";

/// #if BUILD_TYPE==="mediapipe" || BUILD_TYPE==="tfjs"|| BUILD_TYPE==="" 
import { createDetector, HandDetector, SupportedModels } from "@tensorflow-models/hand-pose-detection";
import { setWasmPaths } from "@tensorflow/tfjs-backend-wasm";
import * as tf from "@tensorflow/tfjs";
import * as hands from "@mediapipe/hands";
/// #endif

/// #if BUILD_TYPE==="full"
// @ts-ignore
import palm_full from "../resources/tflite/palm/palm_detection_full.bin";
// @ts-ignore
import landmark_full from "../resources/tflite/landmark/hand_landmark_full.bin";

/// #elif BUILD_TYPE==="lite"
// @ts-ignore
import palm_lite from "../resources/tflite/palm/palm_detection_lite.bin";
// @ts-ignore
import landmark_lite from "../resources/tflite/landmark/hand_landmark_lite.bin";

/// #elif BUILD_TYPE===""
// @ts-ignore
import palm_lite from "../resources/tflite/palm/palm_detection_lite.bin";
// @ts-ignore
import palm_full from "../resources/tflite/palm/palm_detection_full.bin";
// @ts-ignore
import landmark_lite from "../resources/tflite/landmark/hand_landmark_lite.bin";
// @ts-ignore
import landmark_full from "../resources/tflite/landmark/hand_landmark_full.bin";
/// #endif



// @ts-ignore
import wasm from "../resources/wasm/tflite.wasm";
// @ts-ignore
import wasmSimd from "../resources/wasm/tflite-simd.wasm";

export const generateHandPoseDetectionDefaultConfig = (): HandPoseDetectionConfig => {
    const defaultConf: HandPoseDetectionConfig = {
        browserType: getBrowserType(),
        backendType: BackendTypes.wasm,
        processOnLocal: true,
        wasmPaths: {
            "tfjs-backend-wasm.wasm": "/tfjs-backend-wasm.wasm",
            "tfjs-backend-wasm-simd.wasm": "/tfjs-backend-wasm-simd.wasm",
            "tfjs-backend-wasm-threaded-simd.wasm": "/tfjs-backend-wasm-threaded-simd.wasm",
        },
        pageUrl: window.location.href,
        iouThreshold: 0.3,
        scoreThreshold: 0.75,
        modelType: ModelTypes.mediapipe,
        maxHands: 2,
        modelType2: ModelTypes2.lite,

        wasmBase64: wasm.split(",")[1],
        wasmSimdBase64: wasmSimd.split(",")[1],
        palmModelTFLite: {},
        landmarkModelTFLite: {},
        useSimd: true,
        maxProcessWidth: 1024,
        maxProcessHeight: 1024

    };
    /// #if BUILD_TYPE==="full"
    defaultConf.palmModelTFLite = {
        "full": palm_full.split(",")[1],
    }
    defaultConf.landmarkModelTFLite = {
        "full": landmark_full.split(",")[1],
    }
    defaultConf.modelType2 = ModelTypes2.full
    defaultConf.modelType = ModelTypes.tflite
    defaultConf.processOnLocal = false
    /// #elif BUILD_TYPE==="lite"
    defaultConf.palmModelTFLite = {
        "lite": palm_lite.split(",")[1],
    }
    defaultConf.landmarkModelTFLite = {
        "lite": landmark_lite.split(",")[1],
    }
    defaultConf.modelType2 = ModelTypes2.lite
    defaultConf.modelType = ModelTypes.tflite
    defaultConf.processOnLocal = false
    /// #elif BUILD_TYPE===""
    defaultConf.palmModelTFLite = {
        "lite": palm_lite.split(",")[1],
        "full": palm_full.split(",")[1],
    }
    defaultConf.landmarkModelTFLite = {
        "lite": landmark_lite.split(",")[1],
        "full": landmark_full.split(",")[1],
    }
    defaultConf.modelType2 = ModelTypes2.lite
    defaultConf.modelType = ModelTypes.tflite
    /// #elif BUILD_TYPE==="mediapipe"
    defaultConf.modelType = ModelTypes.mediapipe
    defaultConf.backendType = BackendTypes.wasm
    /// #elif BUILD_TYPE==="tfjs"
    defaultConf.modelType = ModelTypes.tfjs
    defaultConf.backendType = BackendTypes.WebGL
    /// #endif
    return defaultConf;
};

export const generateDefaultHandPoseDetectionParams = () => {
    const defaultParams: HandPoseDetectionOperationParams = {
        processWidth: 300,
        processHeight: 300,
        movingAverageWindow: 10,
        affineResizedFactor: 2,
    };
    return defaultParams;
};
export class LocalHP extends LocalWorker {

    /// #if BUILD_TYPE==="mediapipe" || BUILD_TYPE==="tfjs" || BUILD_TYPE==="" 
    model: HandDetector | null = null;
    /// #endif
    tflite: TFLite | null = null;
    tfliteInputAddress: number = 0
    tfliteOutputAddress: number = 0

    canvas: HTMLCanvasElement = (() => {
        const newCanvas = document.createElement("canvas");
        newCanvas.style.display = "none";
        return newCanvas;
    })();

    /// #if BUILD_TYPE==="mediapipe" || BUILD_TYPE==="tfjs" || BUILD_TYPE==="" 
    load_module = async (config: HandPoseDetectionConfig) => {
        if (config.backendType === BackendTypes.wasm) {
            const dirname = config.pageUrl.substr(0, config.pageUrl.lastIndexOf("/"));
            const wasmPaths: { [key: string]: string } = {};
            Object.keys(config.wasmPaths).forEach((key) => {
                wasmPaths[key] = `${dirname}${config.wasmPaths[key]}`;
            });
            setWasmPaths(wasmPaths);
            console.log("use wasm backend", wasmPaths);
            await tf.setBackend("wasm");
        } else if (config.backendType === BackendTypes.cpu) {
            await tf.setBackend("cpu");
        } else {
            console.log("use webgl backend");
            await tf.setBackend("webgl");
        }
    };
    /// #endif

    init = async (config: HandPoseDetectionConfig) => {
        console.log("init worker")

        /// #if BUILD_TYPE==="mediapipe" || BUILD_TYPE==="tfjs"  || BUILD_TYPE==="" 
        if (config.modelType === ModelTypes.mediapipe) {
            try {
                this.model?.dispose();
            } catch (error) {
                console.log("this error is ignored", error)
            }
            this.model = await createDetector(SupportedModels.MediaPipeHands, {
                runtime: "mediapipe",
                solutionPath: `https://cdn.jsdelivr.net/npm/@mediapipe/hands@${hands.VERSION}`,
                // solutionPath: `https://cdn.jsdelivr.net/npm/@mediapipe/hands`,
                // solutionPath: `http://localhost:8080`,
                maxHands: config.maxHands,
                modelType: config.modelType2 as "full" | "lite",
            });
        } else if (config.modelType === ModelTypes.tfjs) {
            await this.load_module(config);
            await tf.ready();
            await tf.env().set("WEBGL_CPU_FORWARD", false);
            try {
                this.model?.dispose();
            } catch (error) {
                console.log("this error is ignored", error)
            }
            this.model = await createDetector(SupportedModels.MediaPipeHands, {
                runtime: "tfjs",
                maxHands: config.maxHands,
                modelType: config.modelType2 as "full" | "lite",
            });
        }
        /// #endif
        /// #if BUILD_TYPE==="full" || BUILD_TYPE==="lite"  || BUILD_TYPE==="" 
        if (config.modelType === ModelTypes.tflite) {
            // try {
            //     this.model?.dispose();
            // } catch (error) {
            //     console.log("this error is ignored", error)
            // }
            const browserType = getBrowserType();
            if (config.useSimd && browserType !== BrowserTypes.SAFARI) {
                // SIMD
                const modSimd = require("../resources/wasm/tflite-simd.js");
                const b = Buffer.from(config.wasmSimdBase64!, "base64");

                this.tflite = await modSimd({ wasmBinary: b });

            } else {
                // Not-SIMD
                const mod = require("../resources/wasm/tflite.js");
                const b = Buffer.from(config.wasmBase64!, "base64");
                this.tflite = await mod({ wasmBinary: b });
            }
            const palmModel = Buffer.from(config.palmModelTFLite[config.modelType2], "base64");
            this.tflite!._initModelBuffer(palmModel.byteLength);
            const palmModelBufferOffset = this.tflite!._getModelBufferAddress();
            this.tflite!.HEAPU8.set(new Uint8Array(palmModel), palmModelBufferOffset);
            this.tflite!._loadModel(palmModel.byteLength);

            const landmarkModel = Buffer.from(config.landmarkModelTFLite[config.modelType2], "base64");
            this.tflite!._initLandmarkModelBuffer(landmarkModel.byteLength);
            const landmarkModelBufferOffset = this.tflite!._getLandmarkModelBufferAddress();
            this.tflite!.HEAPU8.set(new Uint8Array(landmarkModel), landmarkModelBufferOffset);
            this.tflite!._loadLandmarkModel(landmarkModel.byteLength);

            this.tflite!._initInputBuffer(config.maxProcessWidth, config.maxProcessHeight, 4)
            this.tfliteInputAddress = this.tflite!._getInputBufferAddress()
            this.tfliteOutputAddress = this.tflite!._getOutputBufferAddress()
        }
        /// #endif
    };


    predict = async (config: HandPoseDetectionConfig, params: HandPoseDetectionOperationParams, targetCanvas: HTMLCanvasElement): Promise<Hand[] | null> => {
        /// #if BUILD_TYPE==="mediapipe" || BUILD_TYPE==="tfjs"  || BUILD_TYPE==="" 
        if (config.modelType === ModelTypes.mediapipe || config.modelType === ModelTypes.tfjs) {
            if (!this.model) {
                return null;
            }
            const prediction = await this.model!.estimateHands(targetCanvas);
            return prediction;
        }
        /// #endif
        /// #if BUILD_TYPE==="full" || BUILD_TYPE==="lite"  || BUILD_TYPE==="" 
        if (config.modelType === ModelTypes.tflite) {
            if (!this.tflite) {
                console.log("tflite!!!! predict not initialized")
                return null;
            }
            const imageData = targetCanvas.getContext("2d")!.getImageData(0, 0, targetCanvas.width, targetCanvas.height)
            this.tflite!.HEAPU8.set(imageData.data, this.tfliteInputAddress);
            this.tflite!._exec(params.processWidth, params.processHeight, config.maxHands, params.affineResizedFactor);
            const handNum = this.tflite!.HEAPF32[this.tfliteOutputAddress / 4];
            const tfliteHands: TFLiteHand[] = []

            for (let i = 0; i < handNum; i++) {
                // 12: score and rects
                //  8: ratated hand
                // 14: palm keypoints
                // 63: landmark keypoints
                // -> 12 + 8 + 14 + 63 = 97
                const offset = this.tfliteOutputAddress / 4 + 1 + i * (97)
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
                    let rotatedOffset = (this.tfliteOutputAddress / 4 + 1) + (i * 97) + (12) + (j * 2)
                    hand.rotatedHand.positions.push({
                        x: this.tflite!.HEAPF32[rotatedOffset + 0],
                        y: this.tflite!.HEAPF32[rotatedOffset + 1],
                    })
                }
                for (let j = 0; j < 7; j++) {
                    let palmKeypointOffset = (this.tfliteOutputAddress / 4 + 1) + (i * 97) + (12 + 8) + (j * 2)
                    hand.palmKeypoints.push({
                        x: this.tflite!.HEAPF32[palmKeypointOffset + 0],
                        y: this.tflite!.HEAPF32[palmKeypointOffset + 1],
                    })
                }
                for (let j = 0; j < 21; j++) {
                    let landmarkKeypointOffset = (this.tfliteOutputAddress / 4 + 1) + (i * 97) + (12 + 8 + 14) + (j * 3)
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
                    score: x.landmarkScore
                }
                return hand
            })

            return hands;
        }
        /// #endif
        return null;
    };

}

export class HandPoseDetectionWorkerManager extends WorkerManagerBase {
    private config = generateHandPoseDetectionDefaultConfig();
    localWorker = new LocalHP();
    init = async (config: HandPoseDetectionConfig | null) => {
        this.config = config || generateHandPoseDetectionDefaultConfig();
        await this.initCommon(
            {
                useWorkerForSafari: false,
                processOnLocal: this.config.processOnLocal,
                workerJs: () => {
                    return new workerJs();
                },
            },
            config
        );
        return;
    };
    predict = async (params: HandPoseDetectionOperationParams, targetCanvas: HTMLCanvasElement) => {
        const currentParams = { ...params };

        const resizedCanvas = this.generateTargetCanvas(targetCanvas, currentParams.processWidth, currentParams.processHeight);
        if (!this.worker) {
            // console.log("PREDICT ON LOCAL")
            const prediction = await this.localWorker.predict(this.config, currentParams, resizedCanvas);
            return prediction || [];
            // return this.generatePredictionEx(this.config, params, prediction); // 両手を使う場合、平均化する手が特定できないのでomit.
        }
        // console.log("PREDICT ON WEBWORKER")
        const imageData = resizedCanvas.getContext("2d")!.getImageData(0, 0, resizedCanvas.width, resizedCanvas.height);
        const prediction = (await this.sendToWorker(currentParams, imageData.data)) as Hand[] | null;

        return prediction || [];
        // return this.generatePredictionEx(this.config, params, prediction);
    };

    // handsMV: Hand[][] = [];
    // generatePredictionEx = (config:  HandPoseDetectionConfig, params: HandPoseDetectionOperationParams, prediction: Hand[] | null): HandPredictionEx => {
    //     const predictionEx: HandPredictionEx = {
    //         rowPrediction: prediction,
    //     };
    //     if (!prediction) {
    //         return predictionEx;
    //     }

    //     if (params.movingAverageWindow > 0) {
    //         /// (1)蓄積データ 更新
    //         while (this.handsMV.length > params.movingAverageWindow) {
    //             this.handsMV.shift();
    //         }

    //         if (prediction!.length > 0) {
    //             this.handsMV.push(prediction!);
    //         }

    //         /// (2) キーポイント移動平均算出
    //         /// (2-1) ウィンドウ内の一人目のランドマークを抽出
    //         const keypointsEach = this.facesMV.map((pred) => {
    //             return pred[0];
    //         });
    //         /// (2-2) 足し合わせ
    //         const summedKeypoints = keypointsEach.reduce(
    //             (prev, cur) => {
    //                 (prev.topLeft as [number, number])[0] += (cur.topLeft as [number, number])[0];
    //                 (prev.topLeft as [number, number])[1] += (cur.topLeft as [number, number])[1];
    //                 (prev.bottomRight as [number, number])[0] += (cur.bottomRight as [number, number])[0];
    //                 (prev.bottomRight as [number, number])[1] += (cur.bottomRight as [number, number])[1];
    //                 if (cur.landmarks) {
    //                     const landmarks = cur.landmarks as number[][];
    //                     landmarks.forEach((landmark, index) => {
    //                         (prev.landmarks as number[][])[index][0] += landmark[0];
    //                         (prev.landmarks as number[][])[index][1] += landmark[1];
    //                     });
    //                 }
    //                 return prev;
    //             },
    //             {
    //                 topLeft: [0, 0],
    //                 bottomRight: [0, 0],
    //                 landmarks: [
    //                     [0, 0], // left eye
    //                     [0, 0], // right eye
    //                     [0, 0], // nose tip
    //                     [0, 0], // mouth
    //                     [0, 0], // left tragion
    //                     [0, 0], // right tragion
    //                 ],
    //             } as {
    //                 topLeft: [number, number];
    //                 bottomRight: [number, number];
    //                 landmarks: number[][];
    //             }
    //         );
    //         /// (2-3) 平均化
    //         (summedKeypoints.topLeft as [number, number])[0] /= this.facesMV.length;
    //         (summedKeypoints.topLeft as [number, number])[1] /= this.facesMV.length;
    //         (summedKeypoints.bottomRight as [number, number])[0] /= this.facesMV.length;
    //         (summedKeypoints.bottomRight as [number, number])[1] /= this.facesMV.length;
    //         (summedKeypoints.landmarks as number[][]).forEach((landmarks) => {
    //             landmarks[0] /= this.facesMV.length;
    //             landmarks[1] /= this.facesMV.length;
    //         });
    //         predictionEx.singlePersonMovingAverage = summedKeypoints;
    //     }
    //     return predictionEx;
    // };

    // fitCroppedArea = (prediction: BlazefacePredictionEx, orgWidth: number, orgHeight: number, processedWidth: number, processedHeight: number, outputWidth: number, outputHeight: number, extendRatioTop: number, extendRatioBottom: number, extendRatioLeft: number, extendRatioRight: number) => {
    //     const scaleX = orgWidth / processedWidth;
    //     const scaleY = orgHeight / processedHeight;
    //     const scaledXMin = prediction.singlePersonMovingAverage!.topLeft[0] * scaleX;
    //     const scaledXMax = prediction.singlePersonMovingAverage!.bottomRight[0] * scaleX;
    //     const scaledWidth = scaledXMax - scaledXMin;
    //     const scaledYMin = prediction.singlePersonMovingAverage!.topLeft[1] * scaleY;
    //     const scaledYMax = prediction.singlePersonMovingAverage!.bottomRight[1] * scaleY;
    //     const scaledHeight = scaledYMax - scaledYMin;
    //     const scaledCenterX = (scaledXMax + scaledXMin) / 2;
    //     const scaledCenterY = (scaledYMax + scaledYMin) / 2;
    //     const scaledRadiusX = scaledXMax - scaledCenterX;
    //     const scaledRadiusY = scaledYMax - scaledCenterY;

    //     let extendedXmin = scaledCenterX - scaledRadiusX * (1 + extendRatioLeft);
    //     extendedXmin = extendedXmin < 0 ? 0 : extendedXmin;
    //     let extendedXmax = scaledCenterX + scaledRadiusX * (1 + extendRatioRight);
    //     extendedXmax = extendedXmax > orgWidth ? orgWidth : extendedXmax;
    //     let extendedYmin = scaledCenterY - scaledRadiusY * (1 + extendRatioTop);
    //     extendedYmin = extendedYmin < 0 ? 0 : extendedYmin;
    //     let extendedYmax = scaledCenterY + scaledRadiusY * (1 + extendRatioBottom);
    //     extendedYmax = extendedYmax > orgHeight ? orgHeight : extendedYmax;

    //     const extendedWidth = extendedXmax - extendedXmin;
    //     const extendedHeight = extendedYmax - extendedYmin;
    //     const extendedCenterX = (extendedXmax + extendedXmin) / 2;
    //     const extendedCenterY = (extendedYmax + extendedYmin) / 2;

    //     const outputAspect = outputHeight / outputWidth;

    //     let idealWidth;
    //     let idealHeight;
    //     if (extendedWidth * outputAspect > extendedHeight) {
    //         //高さが足りない
    //         idealWidth = extendedWidth;
    //         idealHeight = extendedWidth * outputAspect;
    //     } else {
    //         //幅が足りない
    //         idealWidth = extendedHeight / outputAspect;
    //         idealHeight = extendedHeight;
    //     }

    //     let xmin;
    //     if (extendedCenterX - idealWidth / 2 < 0) {
    //         xmin = 0;
    //     } else if (extendedCenterX + idealWidth / 2 > orgWidth) {
    //         xmin = orgWidth - idealWidth;
    //     } else {
    //         xmin = extendedCenterX - idealWidth / 2;
    //     }

    //     let ymin;
    //     if (extendedCenterY - idealHeight / 2 < 0) {
    //         ymin = 0;
    //     } else if (extendedCenterY + idealHeight / 2 > orgHeight) {
    //         ymin = orgHeight - idealHeight;
    //     } else {
    //         ymin = extendedCenterY - idealHeight / 2;
    //     }
    //     return { xmin: xmin, ymin: ymin, width: idealWidth, height: idealHeight };
    // };
}
