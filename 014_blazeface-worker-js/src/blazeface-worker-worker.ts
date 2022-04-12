import * as tf from "@tensorflow/tfjs";
import { setWasmPaths } from "@tensorflow/tfjs-backend-wasm";
import * as BlazeFace from "@tensorflow-models/blazeface";
import { BackendTypes, BlazefaceConfig, BlazefaceOperationParams, WorkerCommand, WorkerResponse } from "./const";

const ctx: Worker = self as any; // eslint-disable-line no-restricted-globals

let model: BlazeFace.BlazeFaceModel | null;

const load_module = async (config: BlazefaceConfig) => {
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

const predict = async (config: BlazefaceConfig, params: BlazefaceOperationParams, data: Uint8ClampedArray) => {
    if (!model) {
        return null;
    }
    const imageData = new ImageData(data, params.processWidth, params.processHeight);
    const prediction = await model!.estimateFaces(imageData, undefined, undefined, params.annotateBox);
    return prediction;
};

onmessage = async (event) => {
    //  console.log("event", event)
    if (event.data.message === WorkerCommand.INITIALIZE) {
        const config = event.data.config as BlazefaceConfig;
        await load_module(config);

        await tf.ready();
        await tf.env().set("WEBGL_CPU_FORWARD", false);
        model = await BlazeFace.load({
            iouThreshold: config.iouThreshold,
            scoreThreshold: config.scoreThreshold,
        });
        ctx.postMessage({ message: WorkerResponse.INITIALIZED });
    } else if (event.data.message === WorkerCommand.PREDICT) {
        const config = event.data.config as BlazefaceConfig;
        const params = event.data.params as BlazefaceOperationParams;
        const data: Uint8ClampedArray = event.data.data;

        const prediction = await predict(config, params, data);
        ctx.postMessage({
            message: WorkerResponse.PREDICTED,
            prediction: prediction,
        });
    }
};
