import * as handpose from "@tensorflow-models/handpose";
import { HandPoseConfig, HandPoseOperatipnParams, HandPoseFunctionType, WorkerCommand, WorkerResponse, BackendTypes } from "./const";
import * as tf from "@tensorflow/tfjs";
import { setWasmPath, setWasmPaths } from "@tensorflow/tfjs-backend-wasm";

const ctx: Worker = self as any; // eslint-disable-line no-restricted-globals

let model: handpose.HandPose | null;

const load_module = async (config: HandPoseConfig) => {
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

const predict = async (config: HandPoseConfig, params: HandPoseOperatipnParams, data: Uint8ClampedArray) => {
    // console.log("Worker BACKEND:", tf.getBackend());
    try {
        const imageData = new ImageData(data, params.processWidth, params.processHeight);
        const prediction = await model!.estimateHands(imageData);
        return prediction;
    } catch (error) {
        console.log("error1", data);
        console.log("error2", params);
        console.log("error3", config);
        throw error;
    }
};

onmessage = async (event) => {
    //  console.log("event", event)
    if (event.data.message === WorkerCommand.INITIALIZE) {
        await load_module(event.data.config as HandPoseConfig);

        tf.ready().then(() => {
            tf.env().set("WEBGL_CPU_FORWARD", false);
            handpose.load().then((res) => {
                console.log("reloaded model...:", res);
                model = res;
                ctx.postMessage({ message: WorkerResponse.INITIALIZED });
            });
        });
    } else if (event.data.message === WorkerCommand.PREDICT) {
        const config = event.data.config as HandPoseConfig;
        const params = event.data.params as HandPoseOperatipnParams;
        const data: Uint8ClampedArray = event.data.data;

        const prediction = await predict(config, params, data);
        ctx.postMessage({
            message: WorkerResponse.PREDICTED,
            prediction: prediction,
        });
    }
};
