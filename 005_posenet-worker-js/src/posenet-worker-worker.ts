import { BackendTypes, WorkerCommand, WorkerResponse } from "./const";
import { PoseNetConfig, PoseNetFunctionTypes, PoseNetOperationParams } from "./const";
import * as poseNet from "@tensorflow-models/posenet";
import * as tf from "@tensorflow/tfjs";
import { setWasmPath, setWasmPaths } from "@tensorflow/tfjs-backend-wasm";
const ctx: Worker = self as any; // eslint-disable-line no-restricted-globals

let model: poseNet.PoseNet | null;
let config: PoseNetConfig | null = null
const load_module = async (config: PoseNetConfig) => {
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

const predict = async (config: PoseNetConfig, params: PoseNetOperationParams, data: Uint8ClampedArray) => {
    const newImg = new ImageData(new Uint8ClampedArray(data), params.processWidth, params.processHeight);
    if (params.type === PoseNetFunctionTypes.SinglePerson) {
        const prediction = await model!.estimateSinglePose(newImg, params.singlePersonParams!);
        return [prediction];
    } else if (params.type === PoseNetFunctionTypes.MultiPerson) {
        const prediction = await model!.estimateMultiplePoses(newImg, params.multiPersonParams!);
        return prediction;
    } else {
        // multi に倒す
        const prediction = await model!.estimateMultiplePoses(newImg, params.multiPersonParams!);
        return prediction;
    }
};

onmessage = async (event) => {
    if (event.data.message === WorkerCommand.INITIALIZE) {
        console.log("Initialize model!.", event);
        config = event.data.config as PoseNetConfig
        await load_module(config);
        await tf.ready();
        tf.env().set("WEBGL_CPU_FORWARD", false);
        model = await poseNet.load(event.data.config.model);
        ctx.postMessage({ message: WorkerResponse.INITIALIZED });
    } else if (event.data.message === WorkerCommand.PREDICT) {
        const params: PoseNetOperationParams = event.data.params;
        const data: Uint8ClampedArray = event.data.data;

        const prediction = await predict(config!, params, data);
        ctx.postMessage({ message: WorkerResponse.PREDICTED, prediction: prediction });
    }
};
