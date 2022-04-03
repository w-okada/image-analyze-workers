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

const predict = async (config: FacemeshConfig, params: FacemeshOperatipnParams, image: ImageBitmap): Promise<AnnotatedPrediction[]> => {
    console.log("Worker BACKEND:", tf.getBackend());

    // ImageData作成
    const processWidth = params.processWidth <= 0 || params.processHeight <= 0 ? image.width : params.processWidth;
    const processHeight = params.processWidth <= 0 || params.processHeight <= 0 ? image.height : params.processHeight;

    //console.log("process image size:", processWidth, processHeight)
    const offscreen = new OffscreenCanvas(processWidth, processHeight);
    const ctx = offscreen.getContext("2d")!;
    ctx.drawImage(image, 0, 0, processWidth, processHeight);
    const newImg = ctx.getImageData(0, 0, processWidth, processHeight);

    const tensor = tf.browser.fromPixels(newImg);
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
        const image: ImageBitmap = event.data.data;

        const prediction = await predict(config, params, image);
        ctx.postMessage({
            message: WorkerResponse.PREDICTED,
            prediction: prediction,
        });
    }
};
