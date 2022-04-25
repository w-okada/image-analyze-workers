import { WorkerCommand, WorkerResponse, U2NetPortraitConfig, U2NetPortraitOperationParams, BackendTypes } from "./const";
import * as tf from "@tensorflow/tfjs";
import { setWasmPaths } from "@tensorflow/tfjs-backend-wasm";

const ctx: Worker = self as any; // eslint-disable-line no-restricted-globals

let model: tf.GraphModel | null;
let config: U2NetPortraitConfig | null = null
const load_module = async (config: U2NetPortraitConfig) => {
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

const predict = async (config: U2NetPortraitConfig, params: U2NetPortraitOperationParams, data: Uint8ClampedArray) => {
    const imageData = new ImageData(data, params.processWidth, params.processHeight);

    // In my environment, memory leak happen. (maybe too complex to dispose tensor while interval...??)
    // to avoid memory leak, use this wait.
    await new Promise<void>((resolve, reject) => {
        setTimeout(() => {
            resolve();
        }, 0);
    });

    let bm: number[][] | null = null;
    tf.tidy(() => {
        let tensor = tf.browser.fromPixels(imageData);

        tensor = tensor.expandDims(0);
        tensor = tf.cast(tensor, "float32");
        tensor = tensor.div(tf.max(tensor));
        tensor = tensor.sub(0.485).div(0.229);

        let prediction = model!.predict(tensor) as tf.Tensor;
        prediction = prediction.onesLike().sub(prediction);
        prediction = prediction.sub(prediction.min()).div(prediction.max().sub(prediction.min()));
        prediction = prediction.squeeze();
        bm = prediction.arraySync() as number[][];
        prediction.dispose();
    });

    return bm!;
};

onmessage = async (event) => {
    //  console.log("event", event)
    if (event.data.message === WorkerCommand.INITIALIZE) {
        config = event.data.config as U2NetPortraitConfig;
        await load_module(config);
        tf.ready().then(async () => {
            tf.env().set("WEBGL_CPU_FORWARD", false);

            const modelJson_p3_1 = new File([config!.modelJson[config!.modelKey]], "model.json", { type: "application/json" });
            const weight_p3_1 = Buffer.from(config!.modelWeight[config!.modelKey].split(",")[1], "base64");
            const modelWeights_p3_1 = new File([weight_p3_1], "group1-shard1of1.bin");
            model = await tf.loadGraphModel(tf.io.browserFiles([modelJson_p3_1, modelWeights_p3_1]));

            console.log(model.inputs);
            console.log(model.inputNodes);
            console.log(model.outputs);
            console.log(model.outputNodes);
            ctx.postMessage({ message: WorkerResponse.INITIALIZED });
        });
    } else if (event.data.message === WorkerCommand.PREDICT) {
        const params: U2NetPortraitOperationParams = event.data.params;
        const data: Uint8ClampedArray = event.data.data;

        const prediction = await predict(config!, params, data);
        ctx.postMessage({ message: WorkerResponse.PREDICTED, prediction: prediction });
    }
};
