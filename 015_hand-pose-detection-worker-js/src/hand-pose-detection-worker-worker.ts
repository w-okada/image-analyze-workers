import { createDetector, HandDetector, SupportedModels } from "@tensorflow-models/hand-pose-detection";
import * as tf from "@tensorflow/tfjs";
import { setWasmPaths } from "@tensorflow/tfjs-backend-wasm";
import { BackendTypes, HandPoseDetectionConfig, HandPoseDetectionOperationParams, ModelTypes, WorkerCommand, WorkerResponse } from "./const";
import * as hands from "@mediapipe/hands";
const ctx: Worker = self as any; // eslint-disable-line no-restricted-globals

let model: HandDetector | null;

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
    if (!model) {
        return null;
    }
    const imageData = new ImageData(data, params.processWidth, params.processHeight);
    const prediction = await model!.estimateHands(imageData);
    return prediction;
};

onmessage = async (event) => {
    //  console.log("event", event)
    if (event.data.message === WorkerCommand.INITIALIZE) {
        const config = event.data.config as HandPoseDetectionConfig;
        await load_module(config);

        await tf.ready();
        await tf.env().set("WEBGL_CPU_FORWARD", false);

        if (config.modelType === ModelTypes.mediapipe) {
            model?.dispose();
            model = await createDetector(SupportedModels.MediaPipeHands, {
                runtime: "mediapipe",
                solutionPath: `https://cdn.jsdelivr.net/npm/@mediapipe/hands@${hands.VERSION}`,
                // solutionPath: `http://localhost:8080`,

                maxHands: config.maxHands,
                modelType: config.modelType2 as "full" | "lite",
            });
        } else {
            model?.dispose();
            model = await createDetector(SupportedModels.MediaPipeHands, {
                runtime: "tfjs",
                maxHands: config.maxHands,
                modelType: config.modelType2 as "full" | "lite",
            });
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
