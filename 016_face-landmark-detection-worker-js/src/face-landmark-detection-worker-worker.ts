//import * as facemesh from '@tensorflow-models/facemesh'
import * as faceLandmarksDetection from "@tensorflow-models/face-landmarks-detection";

import * as tf from "@tensorflow/tfjs";
import { setWasmPaths } from "@tensorflow/tfjs-backend-wasm";
import * as faceMesh from "@mediapipe/face_mesh";
import { BackendTypes, FaceLandmarkDetectionConfig, FaceLandmarkDetectionOperationParams, ModelTypes, WorkerCommand, WorkerResponse } from "./const";
import { Face } from "@tensorflow-models/face-landmarks-detection";
const ctx: Worker = self as any; // eslint-disable-line no-restricted-globals

//let model: facemesh.FaceMesh | null
let model: faceLandmarksDetection.FaceLandmarksDetector | null = null;

const load_module = async (config: FaceLandmarkDetectionConfig) => {
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

const predict = async (config: FaceLandmarkDetectionConfig, params: FaceLandmarkDetectionOperationParams, data: Uint8ClampedArray): Promise<Face[]> => {
    const newImg = new ImageData(data, params.processWidth, params.processHeight);

    if (config.modelType === ModelTypes.mediapipe || config.modelType === ModelTypes.tfjs) {
        const prediction = await model!.estimateFaces(newImg, { flipHorizontal: false });
        return prediction;
    } else {
        console.log("model not initialized!");
        return [];
    }
};

onmessage = async (event) => {
    if (event.data.message === WorkerCommand.INITIALIZE) {
        console.log("Initialize model!.", event);
        const config = event.data.config as FaceLandmarkDetectionConfig;
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
            model = await faceLandmarksDetection.createDetector(faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh, {
                runtime: "mediapipe",
                refineLandmarks: config.model.refineLandmarks,
                maxFaces: config.model.maxFaces,
                solutionPath: `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@${faceMesh.VERSION}`,
            });
            ctx.postMessage({ message: WorkerResponse.INITIALIZED });
        } else if (config.modelType === (ModelTypes.tfjs)) {
            model = await faceLandmarksDetection.createDetector(faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh, {
                runtime: "tfjs",
                refineLandmarks: config.model.refineLandmarks,
                maxFaces: config.model.maxFaces,
            });
            ctx.postMessage({ message: WorkerResponse.INITIALIZED });
        }
    } else if (event.data.message === WorkerCommand.PREDICT) {
        const config = event.data.config as FaceLandmarkDetectionConfig;
        const params = event.data.params as FaceLandmarkDetectionOperationParams;
        const data: Uint8ClampedArray = event.data.data;

        const prediction = await predict(config, params, data);
        ctx.postMessage({
            message: WorkerResponse.PREDICTED,
            prediction: prediction,
        });
    }
};
