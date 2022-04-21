import { createDetector, Hand, HandDetector, SupportedModels } from "@tensorflow-models/hand-pose-detection";
import * as tf from "@tensorflow/tfjs";
import { setWasmPaths } from "@tensorflow/tfjs-backend-wasm";
import { BackendTypes, HandPoseDetectionConfig, HandPoseDetectionOperationParams, ModelTypes, TFLite, TFLiteHand, WorkerCommand, WorkerResponse } from "./const";
import * as hands from "@mediapipe/hands";
import { BrowserTypes, getBrowserType } from "@dannadori/000_WorkerBase";
const ctx: Worker = self as any; // eslint-disable-line no-restricted-globals

let model: HandDetector | null;
let tflite: TFLite | null = null;
let tfliteInputAddress: number = 0
let tfliteOutputAddress: number = 0

const load_module = async (config: HandPoseDetectionConfig) => {
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

const predict = async (config: HandPoseDetectionConfig, params: HandPoseDetectionOperationParams, data: Uint8ClampedArray) => {
    if (config.modelType === ModelTypes.mediapipe || config.modelType === ModelTypes.tfjs) {
        if (!model) {
            return null;
        }
        const imageData = new ImageData(data, params.processWidth, params.processHeight);
        const prediction = await model!.estimateHands(imageData);
        return prediction;
    } else {
        if (!tflite) {
            console.log("tflite!!!! predict not initialized")
            return null;
        }
        tflite!.HEAPU8.set(data, tfliteInputAddress);
        tflite!._exec(params.processWidth, params.processHeight, config.maxHands);
        const handNum = tflite!.HEAPF32[tfliteOutputAddress / 4];
        const tfliteHands: TFLiteHand[] = []

        for (let i = 0; i < handNum; i++) {
            // 12: score and rects
            //  8: ratated hand
            // 14: palm keypoints
            // 63: landmark keypoints
            // -> 12 + 8 + 14 + 63 = 97
            const offset = tfliteOutputAddress / 4 + 1 + i * (97)
            const hand: TFLiteHand = {
                score: tflite!.HEAPF32[offset + 0],
                landmarkScore: tflite!.HEAPF32[offset + 1],
                handedness: tflite!.HEAPF32[offset + 2],
                rotation: tflite!.HEAPF32[offset + 3],
                palm: {
                    minX: tflite!.HEAPF32[offset + 4],
                    minY: tflite!.HEAPF32[offset + 5],
                    maxX: tflite!.HEAPF32[offset + 6],
                    maxY: tflite!.HEAPF32[offset + 7],
                },
                hand: {
                    minX: tflite!.HEAPF32[offset + 8],
                    minY: tflite!.HEAPF32[offset + 9],
                    maxX: tflite!.HEAPF32[offset + 10],
                    maxY: tflite!.HEAPF32[offset + 11],
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
                let rotatedOffset = (tfliteOutputAddress / 4 + 1) + (i * 97) + (12) + (j * 2)
                hand.rotatedHand.positions.push({
                    x: tflite!.HEAPF32[rotatedOffset + 0],
                    y: tflite!.HEAPF32[rotatedOffset + 1],
                })
            }
            for (let j = 0; j < 7; j++) {
                let palmKeypointOffset = (tfliteOutputAddress / 4 + 1) + (i * 97) + (12 + 8) + (j * 2)
                hand.palmKeypoints.push({
                    x: tflite!.HEAPF32[palmKeypointOffset + 0],
                    y: tflite!.HEAPF32[palmKeypointOffset + 1],
                })
            }
            for (let j = 0; j < 21; j++) {
                let landmarkKeypointOffset = (tfliteOutputAddress / 4 + 1) + (i * 97) + (12 + 8 + 14) + (j * 3)
                hand.landmarkKeypoints.push({
                    x: tflite!.HEAPF32[landmarkKeypointOffset + 0],
                    y: tflite!.HEAPF32[landmarkKeypointOffset + 1],
                    z: tflite!.HEAPF32[landmarkKeypointOffset + 2],
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
};

onmessage = async (event) => {
    //  console.log("event", event)
    if (event.data.message === WorkerCommand.INITIALIZE) {
        const config = event.data.config as HandPoseDetectionConfig;
        await load_module(config);

        await tf.ready();
        await tf.env().set("WEBGL_CPU_FORWARD", false);

        if (config.modelType === ModelTypes.mediapipe) {
            try {
                model?.dispose();
            } catch (error) {
                console.log("this error is ignored", error)
            }
            model = await createDetector(SupportedModels.MediaPipeHands, {
                runtime: "mediapipe",
                solutionPath: `https://cdn.jsdelivr.net/npm/@mediapipe/hands@${hands.VERSION}`,
                // solutionPath: `http://localhost:8080`,

                maxHands: config.maxHands,
                modelType: config.modelType2 as "full" | "lite",
            });
        } else if (config.modelType === ModelTypes.tfjs) {
            try {
                model?.dispose();
            } catch (error) {
                console.log("this error is ignored", error)
            }

            model = await createDetector(SupportedModels.MediaPipeHands, {
                runtime: "tfjs",
                maxHands: config.maxHands,
                modelType: config.modelType2 as "full" | "lite",
            });
        } else {
            try {
                model?.dispose();
            } catch (error) {
                console.log("this error is ignored", error)
            }
            if (config.useSimd && config.browserType !== BrowserTypes.SAFARI) {
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
            const palmModel = Buffer.from(config.palmModelTFLite[config.modelType2], "base64");
            tflite!._initModelBuffer(palmModel.byteLength);
            const palmModelBufferOffset = tflite!._getModelBufferAddress();
            tflite!.HEAPU8.set(new Uint8Array(palmModel), palmModelBufferOffset);
            tflite!._loadModel(palmModel.byteLength);

            const landmarkModel = Buffer.from(config.landmarkModelTFLite[config.modelType2], "base64");
            tflite!._initLandmarkModelBuffer(landmarkModel.byteLength);
            const landmarkModelBufferOffset = tflite!._getLandmarkModelBufferAddress();
            tflite!.HEAPU8.set(new Uint8Array(landmarkModel), landmarkModelBufferOffset);
            tflite!._loadLandmarkModel(landmarkModel.byteLength);

            tflite!._initInputBuffer(config.maxProcessWidth, config.maxProcessHeight, 4)
            tfliteInputAddress = tflite!._getInputBufferAddress()
            tfliteOutputAddress = tflite!._getOutputBufferAddress()
        }

        ctx.postMessage({ message: WorkerResponse.INITIALIZED });
    } else if (event.data.message === WorkerCommand.PREDICT) {
        const config = event.data.config as HandPoseDetectionConfig;
        const params = event.data.params as HandPoseDetectionOperationParams;
        const data: Uint8ClampedArray = event.data.data;

        const prediction = await predict(config, params, data);
        ctx.postMessage({
            message: WorkerResponse.PREDICTED,
            prediction: prediction,
        });
    }
};
