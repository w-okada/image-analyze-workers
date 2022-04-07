//import * as facemesh from '@tensorflow-models/facemesh'
import * as faceLandmarksDetection from "@tensorflow-models/face-landmarks-detection";

import { BackendTypes, FacemeshConfig, FacemeshOperatipnParams, ModelTypes, WorkerCommand, WorkerResponse } from "./const";
import * as tf from "@tensorflow/tfjs";
import { setWasmPaths } from "@tensorflow/tfjs-backend-wasm";
import { AnnotatedPrediction } from "@tensorflow-models/face-landmarks-detection/dist/mediapipe-facemesh";
import * as faceLandmarksDetectionCurrent from "@tensorflow-models/face-landmarks-detection-current";
import * as faceMesh from "@mediapipe/face_mesh";
const ctx: Worker = self as any; // eslint-disable-line no-restricted-globals

//let model: facemesh.FaceMesh | null
let model: faceLandmarksDetection.FaceLandmarksDetector | null = null;
let model2: faceLandmarksDetectionCurrent.FaceLandmarksDetector | null = null;

const load_module = async (config: FacemeshConfig) => {
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

const predict = async (config: FacemeshConfig, params: FacemeshOperatipnParams, data: Uint8ClampedArray): Promise<AnnotatedPrediction[] | faceLandmarksDetectionCurrent.Face[]> => {
    const newImg = new ImageData(data, params.processWidth, params.processHeight);

    if (model) {
        await tf.ready();
        let tensor = tf.browser.fromPixels(newImg);
        const prediction = await model!.estimateFaces({
            input: tensor,
            predictIrises: params.predictIrises,
        });
        tensor.dispose();
        return prediction;
    } else if (model2) {
        const prediction = await model2.estimateFaces(newImg, { flipHorizontal: false });
        return prediction;
    } else {
        return [];
    }
};

onmessage = async (event) => {
    //  console.log("event", event)
    if (event.data.message === WorkerCommand.INITIALIZE) {
        console.log("Initialize model!.", event);
        const config = event.data.config as FacemeshConfig;
        await load_module(config);
        await tf.ready();
        tf.env().set("WEBGL_CPU_FORWARD", false);

        if (config.modelType === ModelTypes.old) {
            model = await faceLandmarksDetection.load(faceLandmarksDetection.SupportedPackages.mediapipeFacemesh, config);
            ctx.postMessage({ message: WorkerResponse.INITIALIZED });
            model2?.dispose();
            model2 = null;
        } else if (config.modelType === ModelTypes.mediapipe) {
            // Maybe this module is not work.....(20220408)
            model = null;
            const prevModel2 = model2;
            try {
                model2 = await faceLandmarksDetectionCurrent.createDetector(faceLandmarksDetectionCurrent.SupportedModels.MediaPipeFaceMesh, {
                    runtime: "mediapipe",
                    refineLandmarks: config.model.refineLandmarks,
                    maxFaces: config.model.maxFaces,
                    solutionPath: `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@${faceMesh.VERSION}`,
                });
            } catch (error) {
                console.log("error", error);
            }
            ctx.postMessage({ message: WorkerResponse.INITIALIZED });
            prevModel2?.dispose();
        } else {
            model = null;
            const prevModel2 = model2;
            model2 = await faceLandmarksDetectionCurrent.createDetector(faceLandmarksDetectionCurrent.SupportedModels.MediaPipeFaceMesh, {
                runtime: "tfjs",
                refineLandmarks: config.model.refineLandmarks,
                maxFaces: config.model.maxFaces,
            });
            ctx.postMessage({ message: WorkerResponse.INITIALIZED });
            prevModel2?.dispose();
        }
    } else if (event.data.message === WorkerCommand.PREDICT) {
        const config = event.data.config as FacemeshConfig;
        const params = event.data.params as FacemeshOperatipnParams;
        const data: Uint8ClampedArray = event.data.data;

        const prediction = await predict(config, params, data);
        ctx.postMessage({
            message: WorkerResponse.PREDICTED,
            prediction: prediction,
        });
    }
};
