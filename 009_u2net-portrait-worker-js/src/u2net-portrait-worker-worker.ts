import { WorkerCommand, WorkerResponse, U2NetPortraitConfig, U2NetPortraitOperationParams } from "./const";
import * as tf from "@tensorflow/tfjs";
import { BrowserType } from "./BrowserUtil";
import { setWasmPath } from "@tensorflow/tfjs-backend-wasm";
const ctx: Worker = self as any; // eslint-disable-line no-restricted-globals

let model: tf.GraphModel | null;

const load_module = async (config: U2NetPortraitConfig) => {
    const dirname = config.pageUrl.substr(0, config.pageUrl.lastIndexOf("/"));
    const wasmPath = `${dirname}${config.wasmPath}`;
    console.log(`use wasm backend ${wasmPath}`);
    setWasmPath(wasmPath);

    if (config.useTFWasmBackend || config.browserType === BrowserType.SAFARI) {
        require("@tensorflow/tfjs-backend-wasm");
        await tf.setBackend("wasm");
    } else {
        console.log("use webgl backend");
        require("@tensorflow/tfjs-backend-webgl");
        await tf.setBackend("webgl");
    }
};

const predict = async (imageData: ImageData, config: U2NetPortraitConfig, params: U2NetPortraitOperationParams) => {
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
    });
    return bm!;
};

onmessage = async (event) => {
    //  console.log("event", event)
    if (event.data.message === WorkerCommand.INITIALIZE) {
        const config = event.data.config as U2NetPortraitConfig;
        await load_module(config);
        tf.ready().then(async () => {
            tf.env().set("WEBGL_CPU_FORWARD", false);

            const modelJson_p3_1 = new File([config.modelJson[config.modelKey]], "model.json", { type: "application/json" });
            const weight_p3_1 = Buffer.from(config.modelWeight[config.modelKey].split(",")[1], "base64");
            const modelWeights_p3_1 = new File([weight_p3_1], "group1-shard1of1.bin");
            model = await tf.loadGraphModel(tf.io.browserFiles([modelJson_p3_1, modelWeights_p3_1]));

            console.log(model.inputs);
            console.log(model.inputNodes);
            console.log(model.outputs);
            console.log(model.outputNodes);
            ctx.postMessage({ message: WorkerResponse.INITIALIZED });
        });
    } else if (event.data.message === WorkerCommand.PREDICT) {
        //    console.log("requested predict bodypix.")
        const image: ImageData = event.data.image;
        const config: U2NetPortraitConfig = event.data.config;
        const params: U2NetPortraitOperationParams = event.data.params;
        const uid: number = event.data.uid;

        console.log("current backend[worker thread]:", tf.getBackend());
        const prediction = await predict(image, config, params);
        ctx.postMessage({ message: WorkerResponse.PREDICTED, uid: uid, prediction: prediction });
    }
};
