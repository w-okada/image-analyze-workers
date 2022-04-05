//import * as facemesh from '@tensorflow-models/facemesh'
import * as faceLandmarksDetection from "@tensorflow-models/face-landmarks-detection";

import { BackendTypes, FacemeshConfig, FacemeshOperatipnParams, WorkerCommand, WorkerResponse } from "./const";
import * as tf from "@tensorflow/tfjs";
import { setWasmPaths } from "@tensorflow/tfjs-backend-wasm";
import { AnnotatedPrediction } from "@tensorflow-models/face-landmarks-detection/dist/mediapipe-facemesh";
const ctx: Worker = self as any; // eslint-disable-line no-restricted-globals

//let model: facemesh.FaceMesh | null
let model: faceLandmarksDetection.FaceLandmarksDetector | null;

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

const predict = async (config: FacemeshConfig, params: FacemeshOperatipnParams, data: Uint8ClampedArray): Promise<AnnotatedPrediction[]> => {
    const image = new ImageData(data, params.processWidth, params.processHeight);

    const tensor = tf.browser.fromPixels(image);
    const prediction = await model!.estimateFaces({
        input: tensor,
        predictIrises: params.predictIrises,
    });
    tensor.dispose();
    return prediction!;
};

onmessage = async (event) => {
    //  console.log("event", event)
    if (event.data.message === WorkerCommand.INITIALIZE) {
        console.log("Initialize model!.", event);
        const config = event.data.config as FacemeshConfig;
        await load_module(config);
        tf.ready().then(() => {
            tf.env().set("WEBGL_CPU_FORWARD", false);
            // facemesh.load().then(res => {
            faceLandmarksDetection.load(faceLandmarksDetection.SupportedPackages.mediapipeFacemesh, config).then((res) => {
                console.log("new model:", res);
                model = res;
                ctx.postMessage({ message: WorkerResponse.INITIALIZED });
            });
        });
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
