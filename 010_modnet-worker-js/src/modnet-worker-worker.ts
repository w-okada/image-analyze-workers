import { BackendTypes, MODNetConfig, MODNetOperationParams, WorkerCommand, WorkerResponse } from "./const";
import * as tf from "@tensorflow/tfjs";
import { setWasmPaths } from "@tensorflow/tfjs-backend-wasm";
const ctx: Worker = self as any; // eslint-disable-line no-restricted-globals

let model: tf.GraphModel | null;

const load_module = async (config: MODNetConfig) => {
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

// Case.2 Use ImageBitmap (for Safari or special intent)
const predictWithData = async (config: MODNetConfig, params: MODNetOperationParams, data: Uint8ClampedArray) => {
    // In my environment, memory leak happen. (maybe too complex to dispose tensor while interval...??)
    // to avoid memory leak, use this wait.
    await new Promise<void>((resolve, reject) => {
        setTimeout(() => {
            resolve();
        }, 0);
    });

    const imageData = new ImageData(data, params.processWidth, params.processHeight);

    let bm: number[][] | null = null;
    tf.tidy(() => {
        let tensor = tf.browser.fromPixels(imageData);
        tensor = tensor.expandDims(0);
        tensor = tf.cast(tensor, "float32");
        tensor = tensor.div(tf.max(tensor));
        tensor = tensor.sub(0.485).div(0.229);
        let prediction = model!.predict(tensor) as tf.Tensor;
        bm = prediction.reshape([params.processWidth, params.processHeight]).arraySync() as number[][];
    });
    return bm!;
};

onmessage = async (event) => {
    //  console.log("event", event)
    if (event.data.message === WorkerCommand.INITIALIZE) {
        const config = event.data.config as MODNetConfig;
        await load_module(config);
        tf.ready().then(async () => {
            tf.env().set("WEBGL_CPU_FORWARD", false);

            const modelJson_p3_1 = new File([config.modelJsons[config.modelKey]], "model.json", { type: "application/json" });
            const weight_p3_1 = Buffer.from(config.modelWeights[config.modelKey].split(",")[1], "base64");
            const modelWeights_p3_1 = new File([weight_p3_1], "group1-shard1of1.bin");
            model = await tf.loadGraphModel(tf.io.browserFiles([modelJson_p3_1, modelWeights_p3_1]));

            console.log(model!.inputs);
            console.log(model!.inputNodes);
            console.log(model!.outputs);
            console.log(model!.outputNodes);
            ctx.postMessage({ message: WorkerResponse.INITIALIZED });
        });
    } else if (event.data.message === WorkerCommand.PREDICT) {
        //    console.log("requested predict bodypix.")
        const config: MODNetConfig = event.data.config;
        const params: MODNetOperationParams = event.data.params;
        const data: Uint8ClampedArray = event.data.data;

        const prediction = await predictWithData(config, params, data);
        ctx.postMessage({ message: WorkerResponse.PREDICTED, prediction: prediction });
    }
};
