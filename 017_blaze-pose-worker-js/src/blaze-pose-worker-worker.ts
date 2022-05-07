import { BrowserTypes } from "@dannadori/worker-base";
import { Pose } from "@tensorflow-models/pose-detection";
import { BackendTypes, BlazePoseConfig, BlazePoseOperationParams, ModelTypes, TFLite, TFLitePoseLandmarkDetection, WorkerCommand, WorkerResponse } from "./const";

const ctx: Worker = self as any; // eslint-disable-line no-restricted-globals


/// #if BUILD_TYPE==="mediapipe" || BUILD_TYPE==="tfjs"|| BUILD_TYPE==="" 
import { createDetector, SupportedModels, PoseDetector } from "@tensorflow-models/pose-detection";
import * as tf from "@tensorflow/tfjs";
import { setWasmPaths } from "@tensorflow/tfjs-backend-wasm";
/// #endif

/// #if BUILD_TYPE==="mediapipe" || BUILD_TYPE==="tfjs" || BUILD_TYPE==="" 
let model: PoseDetector | null = null;
/// #endif
let tflite: TFLite | null = null;
let tfliteInputAddress: number = 0
let tfliteOutputAddress: number = 0

let config: BlazePoseConfig | null = null;

/// #if BUILD_TYPE==="mediapipe" || BUILD_TYPE==="tfjs" || BUILD_TYPE==="" 
const load_module = async (config: BlazePoseConfig) => {
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
        console.log("use cpu backend");
        await tf.setBackend("cpu");
    } else {
        console.log("use webgl backend");
        await tf.setBackend("webgl");
    }
};
/// #endif

const predict = async (config: BlazePoseConfig, params: BlazePoseOperationParams, data: Uint8ClampedArray): Promise<Pose[] | null> => {
    const newImg = new ImageData(data, params.processWidth, params.processHeight);

    /// #if BUILD_TYPE==="mediapipe" || BUILD_TYPE==="tfjs"  || BUILD_TYPE===""  
    if (config.modelType === ModelTypes.mediapipe || config.modelType === ModelTypes.tfjs) {
        if (!model) {
            return null
        }
        const prediction = await model.estimatePoses(newImg, { flipHorizontal: false });
        return prediction;
    }
    /// #endif
    /// #if BUILD_TYPE==="lite" || BUILD_TYPE==="full"  || BUILD_TYPE==="heavy"|| BUILD_TYPE==="" 
    if (config.modelType === ModelTypes.tflite) {
        const imageData = newImg
        tflite!.HEAPU8.set(imageData.data, tfliteInputAddress);
        tflite!._exec(params.processWidth, params.processHeight, config.model.maxPoses, params.affineResizedFactor, params.cropExt);
        const poseNum = tflite!.HEAPF32[tfliteOutputAddress / 4];
        const tflitePoses: TFLitePoseLandmarkDetection[] = []
        for (let i = 0; i < poseNum; i++) {
            //   11: score and rects
            //    8: ratated pose (4x2D)
            //    8: pose keypoints(6x2D)
            //  195: landmark keypoints(39x5D)
            //  117: landmark keypoints(39x3D)
            // -> 11 + 8 + 12 + 195 + 117 = 343
            const offset = tfliteOutputAddress / 4 + 1 + i * (343)
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
                const offset = tfliteOutputAddress / 4 + 1 + i * (343) + (11) + (j * 2)
                pose.rotatedPose.positions.push({
                    x: tflite!.HEAPF32[offset + 0],
                    y: tflite!.HEAPF32[offset + 1],
                })
            }
            for (let j = 0; j < 4; j++) {
                const offset = tfliteOutputAddress / 4 + 1 + i * (343) + (11 + 8) + (j * 2)
                pose.poseKeypoints.push({
                    x: tflite!.HEAPF32[offset + 0],
                    y: tflite!.HEAPF32[offset + 1],
                })
            }
            for (let j = 0; j < 33; j++) {
                const offset = tfliteOutputAddress / 4 + 1 + i * (343) + (11 + 8 + 8) + (j * 5)
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
                const offset = tfliteOutputAddress / 4 + 1 + i * (343) + (11 + 8 + 8 + 195) + (j * 3)
                pose.landmarkKeypoints3D.push({
                    x: tflite!.HEAPF32[offset + 0],
                    y: tflite!.HEAPF32[offset + 1],
                    z: tflite!.HEAPF32[offset + 2],
                    score: pose.landmarkKeypoints[j].score,
                    visibility: pose.landmarkKeypoints[j].visibility,
                    presence: pose.landmarkKeypoints[j].presence,
                })
            }
            if (pose.score > 0.5 && pose.landmarkScore > 0.5) {
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
    /// #endif
    return null;
};

onmessage = async (event) => {
    if (event.data.message === WorkerCommand.INITIALIZE) {
        console.log("Initialize model!.", event);
        config = event.data.config as BlazePoseConfig;

        /// #if BUILD_TYPE==="mediapipe" || BUILD_TYPE==="tfjs"  || BUILD_TYPE===""         
        await load_module(config);
        await tf.ready();
        tf.env().set("WEBGL_CPU_FORWARD", false);
        try {
            model?.dispose();
        } catch (error) {
            console.log("this error is ignored", error)
        }
        model = null;
        if (config.modelType === (ModelTypes.mediapipe)) {
            // Maybe this module is not work.....(20220408)
            model = await createDetector(SupportedModels.BlazePose, {
                runtime: "mediapipe",
                solutionPath: `https://cdn.jsdelivr.net/npm/@mediapipe/pose`,
                modelType: config.landmarkModelKey
            });
            ctx.postMessage({ message: WorkerResponse.INITIALIZED });
        } else if (config.modelType === (ModelTypes.tfjs)) {

            model = await createDetector(SupportedModels.BlazePose, {
                runtime: "tfjs",
                modelType: config.landmarkModelKey
            });
            ctx.postMessage({ message: WorkerResponse.INITIALIZED });
        }
        /// #endif
        /// #if BUILD_TYPE==="lite" || BUILD_TYPE==="full"  || BUILD_TYPE==="heavy"|| BUILD_TYPE==="" 
        if (config.modelType === ModelTypes.tflite) {
            // const browserType = getBrowserType();
            const browserType = config.browserType
            if (config.useSimd && browserType !== BrowserTypes.SAFARI) {
                // SIMD
                const modSimd = require("../resources/wasm/tflite-simd.js");
                const b = Buffer.from(config.wasmSimdBase64!, "base64");

                tflite = await modSimd({ wasmBinary: b });
            } else {
                // Not-SIMD
                const mod = require("../resources/wasm/tflite.js");
                const b = Buffer.from(config.wasmBase64!, "base64");
                tflite = await mod({ wasmBinary: b });
            }

            const detectorModel = Buffer.from(config.detectorModelTFLite[config.detectorModelKey], "base64");
            tflite!._initDetectorModelBuffer(detectorModel.byteLength);
            const detectorModelBufferOffset = tflite!._getDetectorModelBufferAddress();
            tflite!.HEAPU8.set(new Uint8Array(detectorModel), detectorModelBufferOffset);
            tflite!._loadDetectorModel(detectorModel.byteLength);

            const landmarkModel = Buffer.from(config.landmarkModelTFLite[config.landmarkModelKey], "base64");
            tflite!._initLandmarkModelBuffer(landmarkModel.byteLength);
            const landmarkModelBufferOffset = tflite!._getLandmarkModelBufferAddress();
            tflite!.HEAPU8.set(new Uint8Array(landmarkModel), landmarkModelBufferOffset);
            tflite!._loadLandmarkModel(landmarkModel.byteLength);

            tflite!._initInputBuffer(config.maxProcessWidth, config.maxProcessHeight, 4)
            tfliteInputAddress = tflite!._getInputBufferAddress()
            tfliteOutputAddress = tflite!._getOutputBufferAddress()
            console.log("tflite worker initilizied")
            ctx.postMessage({ message: WorkerResponse.INITIALIZED });
        }
        /// #endif
    } else if (event.data.message === WorkerCommand.PREDICT) {
        const params = event.data.params as BlazePoseOperationParams;
        const data: Uint8ClampedArray = event.data.data;

        const prediction = await predict(config!, params, data);
        ctx.postMessage({
            message: WorkerResponse.PREDICTED,
            prediction: prediction,
        });
    }
};
