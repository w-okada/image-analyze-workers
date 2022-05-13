import { BrowserTypes, getBrowserType, LocalWorker, WorkerManagerBase } from "@dannadori/worker-base";
import { Keypoint, Pose } from "@tensorflow-models/pose-detection";
// @ts-ignore
import workerJs from "worker-loader?inline=no-fallback!./blaze-pose-worker-worker.ts";

/// #if BUILD_TYPE==="mediapipe" || BUILD_TYPE==="tfjs"|| BUILD_TYPE==="" 
import { createDetector, SupportedModels, PoseDetector } from "@tensorflow-models/pose-detection";
import * as tf from "@tensorflow/tfjs";
import { setWasmPaths } from "@tensorflow/tfjs-backend-wasm";
/// #endif

/// #if BUILD_TYPE==="lite"
// @ts-ignore
import detectorTFLite from "../resources/tflite/detector/pose_detection.bin";
// @ts-ignore
import landmarkLiteTFLite from "../resources/tflite/landmark/pose_landmark_lite.bin";

/// #elif BUILD_TYPE==="full"
// @ts-ignore
import detectorTFLite from "../resources/tflite/detector/pose_detection.bin";
// @ts-ignore
import landmarkFullTFLite from "../resources/tflite/landmark/pose_landmark_full.bin";

/// #elif BUILD_TYPE==="heavy"
// @ts-ignore
import detectorTFLite from "../resources/tflite/detector/pose_detection.bin";
// @ts-ignore
import landmarkHeavyTFLite from "../resources/tflite/landmark/pose_landmark_heavy.bin";


/// #elif BUILD_TYPE===""
// @ts-ignore
import detectorTFLite from "../resources/tflite/detector/pose_detection.bin";
// @ts-ignore
import landmarkLiteTFLite from "../resources/tflite/landmark/pose_landmark_lite.bin";
// @ts-ignore
import landmarkFullTFLite from "../resources/tflite/landmark/pose_landmark_heavy.bin";
// @ts-ignore
import landmarkHeavyTFLite from "../resources/tflite/landmark/pose_landmark_heavy.bin";
/// #endif

// @ts-ignore
import wasm from "../resources/wasm/tflite.wasm";
// @ts-ignore
import wasmSimd from "../resources/wasm/tflite-simd.wasm";
import { BackendTypes, LandmarkTypes, ModelTypes, BlazePoseConfig, BlazePoseOperationParams, TFLite, TFLitePoseLandmarkDetection, DetectorTypes, PartsLookupIndices, PosePredictionEx } from "./const";
import { BoundingBox } from "@tensorflow-models/pose-detection/dist/shared/calculators/interfaces/shape_interfaces";

export { BlazePoseConfig, BlazePoseOperationParams, Pose, Keypoint, BoundingBox, BackendTypes, DetectorTypes, LandmarkTypes, ModelTypes, PartsLookupIndices, PosePredictionEx }

export const generateBlazePoseDefaultConfig = (): BlazePoseConfig => {
    const defaultConf: BlazePoseConfig = {
        browserType: getBrowserType(),
        backendType: BackendTypes.WebGL,
        model: {
            detectionConfidence: 0.9,
            maxPoses: 1,
        },
        processOnLocal: true,
        wasmPaths: {
            "tfjs-backend-wasm.wasm": "/tfjs-backend-wasm.wasm",
            "tfjs-backend-wasm-simd.wasm": "/tfjs-backend-wasm-simd.wasm",
            "tfjs-backend-wasm-threaded-simd.wasm": "/tfjs-backend-wasm-threaded-simd.wasm",
        },
        pageUrl: window.location.href,
        modelType: ModelTypes.mediapipe,

        wasmBase64: wasm.split(",")[1],
        wasmSimdBase64: wasmSimd.split(",")[1],

        detectorModelTFLite: {},
        landmarkModelTFLite: {},
        useSimd: true,
        maxProcessWidth: 1024,
        maxProcessHeight: 1024,
        landmarkModelKey: LandmarkTypes.lite,
        detectorModelKey: DetectorTypes.lite
    };
    /// #if BUILD_TYPE==="lite"
    defaultConf.detectorModelTFLite = {
        "lite": detectorTFLite.split(",")[1],
    }
    defaultConf.landmarkModelTFLite = {
        "lite": landmarkLiteTFLite.split(",")[1],
    }
    defaultConf.landmarkModelKey = LandmarkTypes.lite
    defaultConf.modelType = ModelTypes.tflite
    defaultConf.processOnLocal = false
    /// #elif BUILD_TYPE==="full"
    defaultConf.detectorModelTFLite = {
        "lite": detectorTFLite.split(",")[1],
    }
    defaultConf.landmarkModelTFLite = {
        "full": landmarkFullTFLite.split(",")[1],
    }
    defaultConf.landmarkModelKey = LandmarkTypes.full
    defaultConf.modelType = ModelTypes.tflite
    defaultConf.processOnLocal = false
    /// #elif BUILD_TYPE==="heavy"
    defaultConf.detectorModelTFLite = {
        "lite": detectorTFLite.split(",")[1],
    }
    defaultConf.landmarkModelTFLite = {
        "heavy": landmarkHeavyTFLite.split(",")[1],
    }
    defaultConf.landmarkModelKey = LandmarkTypes.heavy
    defaultConf.modelType = ModelTypes.tflite
    defaultConf.processOnLocal = false
    /// #elif BUILD_TYPE===""
    defaultConf.detectorModelTFLite = {
        "lite": detectorTFLite.split(",")[1],
    }
    defaultConf.landmarkModelTFLite = {
        "lite": landmarkLiteTFLite.split(",")[1],
        "full": landmarkFullTFLite.split(",")[1],
        "heavy": landmarkHeavyTFLite.split(",")[1],
    }
    defaultConf.landmarkModelKey = LandmarkTypes.lite
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

export const generateDefaultBlazePoseParams = () => {
    const defaultParams: BlazePoseOperationParams = {
        processWidth: 300,
        processHeight: 300,
        movingAverageWindow: 10,
        affineResizedFactor: 2,
        cropExt: 1.3,
        calculate_mode: 0
    };
    return defaultParams;
};

export class LocalBP extends LocalWorker {
    /// #if BUILD_TYPE==="mediapipe" || BUILD_TYPE==="tfjs" || BUILD_TYPE==="" 
    model: PoseDetector | null = null;
    /// #endif

    tflite: TFLite | null = null;
    tfliteInputAddress: number = 0
    tfliteOutputAddress: number = 0

    /// #if BUILD_TYPE==="mediapipe" || BUILD_TYPE==="tfjs" || BUILD_TYPE==="" 
    load_module = async (config: BlazePoseConfig) => {
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

    init = async (config: BlazePoseConfig) => {
        /// #if BUILD_TYPE==="mediapipe" || BUILD_TYPE==="tfjs"  || BUILD_TYPE==="" 
        await this.load_module(config);
        await tf.ready();

        try {
            this.model?.dispose();
        } catch (error) {
            console.log("this error is ignored", error)
        }
        this.model = null;
        if (config.modelType === ModelTypes.mediapipe) {
            this.model = await createDetector(SupportedModels.BlazePose, {
                runtime: "mediapipe",
                solutionPath: `https://cdn.jsdelivr.net/npm/@mediapipe/pose`,
                modelType: config.landmarkModelKey
            });

        } else if (config.modelType === ModelTypes.tfjs) {
            this.model = await createDetector(SupportedModels.BlazePose, {
                runtime: "tfjs",
                modelType: config.landmarkModelKey
            });
        }
        /// #endif
        /// #if BUILD_TYPE==="lite" || BUILD_TYPE==="full"  || BUILD_TYPE==="heavy"|| BUILD_TYPE==="" 
        if (config.modelType === ModelTypes.tflite) {
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

            const detectorModel = Buffer.from(config.detectorModelTFLite[config.detectorModelKey], "base64");
            this.tflite!._initDetectorModelBuffer(detectorModel.byteLength);
            const detectorModelBufferOffset = this.tflite!._getDetectorModelBufferAddress();
            this.tflite!.HEAPU8.set(new Uint8Array(detectorModel), detectorModelBufferOffset);
            this.tflite!._loadDetectorModel(detectorModel.byteLength);

            const landmarkModel = Buffer.from(config.landmarkModelTFLite[config.landmarkModelKey], "base64");
            this.tflite!._initLandmarkModelBuffer(landmarkModel.byteLength);
            const landmarkModelBufferOffset = this.tflite!._getLandmarkModelBufferAddress();
            this.tflite!.HEAPU8.set(new Uint8Array(landmarkModel), landmarkModelBufferOffset);
            this.tflite!._loadLandmarkModel(landmarkModel.byteLength);

            this.tflite!._initInputBuffer(config.maxProcessWidth, config.maxProcessHeight, 4)
            this.tfliteInputAddress = this.tflite!._getInputBufferAddress()
            this.tfliteOutputAddress = this.tflite!._getOutputBufferAddress()
        }
        /// #endif
        console.log("blazepose loaded locally", config);
    };

    predict = async (config: BlazePoseConfig, params: BlazePoseOperationParams, targetCanvas: HTMLCanvasElement): Promise<Pose[] | null> => {
        const ctx = targetCanvas.getContext("2d")!;
        const newImg = ctx.getImageData(0, 0, targetCanvas.width, targetCanvas.height);
        /// #if BUILD_TYPE==="mediapipe" || BUILD_TYPE==="tfjs"  || BUILD_TYPE==="" 
        if (config.modelType === ModelTypes.mediapipe || config.modelType === ModelTypes.tfjs) {
            if (!this.model) {
                return null
            }

            const prediction = await this.model.estimatePoses(newImg, { flipHorizontal: false });
            return prediction;
        }
        /// #endif
        /// #if BUILD_TYPE==="lite" || BUILD_TYPE==="full"  || BUILD_TYPE==="heavy"|| BUILD_TYPE==="" 
        if (config.modelType === ModelTypes.tflite) {

            const imageData = targetCanvas.getContext("2d")!.getImageData(0, 0, targetCanvas.width, targetCanvas.height)
            this.tflite!.HEAPU8.set(imageData.data, this.tfliteInputAddress);
            this.tflite!._set_calculate_mode(params.calculate_mode) // for debug
            this.tflite!._exec(params.processWidth, params.processHeight, config.model.maxPoses, params.affineResizedFactor, params.cropExt);
            const poseNum = this.tflite!.HEAPF32[this.tfliteOutputAddress / 4];
            const tflitePoses: TFLitePoseLandmarkDetection[] = []
            for (let i = 0; i < poseNum; i++) {
                //   11: score and rects
                //    8: ratated pose (4x2D)
                //    8: pose keypoints(6x2D)
                //  195: landmark keypoints(39x5D)
                //  117: landmark keypoints(39x3D)
                // -> 11 + 8 + 12 + 195 + 117 = 343
                const offset = this.tfliteOutputAddress / 4 + 1 + i * (343)
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
                    const offset = this.tfliteOutputAddress / 4 + 1 + i * (343) + (11) + (j * 2)
                    pose.rotatedPose.positions.push({
                        x: this.tflite!.HEAPF32[offset + 0],
                        y: this.tflite!.HEAPF32[offset + 1],
                    })
                }
                for (let j = 0; j < 4; j++) {
                    const offset = this.tfliteOutputAddress / 4 + 1 + i * (343) + (11 + 8) + (j * 2)
                    pose.poseKeypoints.push({
                        x: this.tflite!.HEAPF32[offset + 0],
                        y: this.tflite!.HEAPF32[offset + 1],
                    })
                }
                for (let j = 0; j < 33; j++) {
                    const offset = this.tfliteOutputAddress / 4 + 1 + i * (343) + (11 + 8 + 8) + (j * 5)
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
                    const offset = this.tfliteOutputAddress / 4 + 1 + i * (343) + (11 + 8 + 8 + 195) + (j * 3)
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
                    },
                    // score: x.score, // not accurate
                    score: x.landmarkScore
                }

                return pose
            })
            return poses
        }
        /// #endif
        return null;
    };
}

export class BlazePoseWorkerManager extends WorkerManagerBase {
    private config = generateBlazePoseDefaultConfig();
    localWorker = new LocalBP();

    init = async (config: BlazePoseConfig | null) => {
        this.config = config || generateBlazePoseDefaultConfig();
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

    predict = async (params: BlazePoseOperationParams, targetCanvas: HTMLCanvasElement | HTMLVideoElement): Promise<PosePredictionEx> => {
        const currentParams = { ...params };
        const resizedCanvas = this.generateTargetCanvas(targetCanvas, currentParams.processWidth, currentParams.processHeight);
        if (!this.worker) {

            const prediction = await this.localWorker.predict(this.config, currentParams, resizedCanvas);
            // return prediction || [];
            return this.generatePredictionEx(this.config, currentParams, prediction)
        }

        const imageData = resizedCanvas.getContext("2d")!.getImageData(0, 0, resizedCanvas.width, resizedCanvas.height);
        const prediction = (await this.sendToWorker(currentParams, imageData.data)) as Pose[] | null;
        // return prediction || [];
        return this.generatePredictionEx(this.config, currentParams, prediction)
    };

    posesMV: Pose[][] = [];

    generatePredictionEx = (config: BlazePoseConfig, params: BlazePoseOperationParams, prediction: Pose[] | null): PosePredictionEx => {
        const poses = prediction
        const predictionEx: PosePredictionEx = {
            rowPrediction: poses,
        };
        if (params.movingAverageWindow > 0) {
            /// (1)蓄積データ 更新
            if (poses) {
                while (this.posesMV.length > params.movingAverageWindow) {
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

}
