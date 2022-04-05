import { WorkerCommand, WorkerResponse, CartoonConfig, CartoonOperatipnParams, BackendTypes } from "./const";
import * as tf from "@tensorflow/tfjs";
import { setWasmPaths } from "@tensorflow/tfjs-backend-wasm";
import { Buffer } from "buffer";
// // @ts-ignore
// import modelJson from "../resources/white-box-cartoonization/model.json"
// // @ts-ignore
// import modelWeight from "../resources/white-box-cartoonization/group1-shard1of1.bin"
const ctx: Worker = self as any; // eslint-disable-line no-restricted-globals

let model: tf.GraphModel | null;

const load_module = async (config: CartoonConfig) => {
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

const predict = async (config: CartoonConfig, params: CartoonOperatipnParams, data: Uint8ClampedArray) => {
    const imageData = new ImageData(data, params.processWidth, params.processHeight);

    let imgArray2: Uint8ClampedArray;
    tf.tidy(() => {
        let tensor = tf.browser.fromPixels(imageData);
        tensor = tf.sub(tensor.expandDims(0).div(127.5), 1);
        let prediction = model!.predict(tensor) as tf.Tensor;

        const alpha = tf.ones([1, params.processHeight, params.processWidth, 1]);
        prediction = tf.concat([prediction, alpha], 3);
        prediction = tf.add(prediction, 1);
        prediction = tf.mul(prediction, 127.5);
        prediction = prediction.flatten();
        prediction = tf.cast(prediction, "int32");
        prediction = tf.squeeze(prediction as tf.Tensor);
        let imgArray = prediction.arraySync() as number[];
        imgArray2 = new Uint8ClampedArray(imgArray.length);
        imgArray2.set(imgArray);
    });
    return imgArray2!;
};

onmessage = async (event) => {
    //  console.log("event", event)
    if (event.data.message === WorkerCommand.INITIALIZE) {
        const config = event.data.config as CartoonConfig;
        await load_module(config);
        tf.ready().then(async () => {
            tf.env().set("WEBGL_CPU_FORWARD", false);

            const modelJson2 = new File([config.modelJson], "model.json", {
                type: "application/json",
            });
            const b = Buffer.from(config.modelWeight.split(",")[1], "base64");
            // const modelJson2 = new File([modelJson], "model.json", {type: "application/json"})
            // const b = Buffer.from(modelWeight.split(',')[1], 'base64')
            const modelWeights = new File([b], "group1-shard1of1.bin");
            model = await tf.loadGraphModel(tf.io.browserFiles([modelJson2, modelWeights]));

            console.log(model.inputs);
            console.log(model.inputNodes);
            console.log(model.outputs);
            console.log(model.outputNodes);
            ctx.postMessage({ message: WorkerResponse.INITIALIZED });
        });
    } else if (event.data.message === WorkerCommand.PREDICT) {
        const config = event.data.config as CartoonConfig;
        const params = event.data.params as CartoonOperatipnParams;
        const data: Uint8ClampedArray = event.data.data;

        const prediction = await predict(config, params, data);
        ctx.postMessage({
            message: WorkerResponse.PREDICTED,
            prediction: prediction,
        });
    }
};
