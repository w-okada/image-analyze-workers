import { WorkerCommand, WorkerResponse, BisenetV2CelebAMaskConfig, BisenetV2CelebAMaskOperatipnParams } from "./const";
import * as tf from "@tensorflow/tfjs";
import { BrowserType } from "./BrowserUtil";
import { setWasmPath } from "@tensorflow/tfjs-backend-wasm";
import { Buffer } from "buffer";

const ctx: Worker = self as any; // eslint-disable-line no-restricted-globals

let model: tf.GraphModel | null;

const load_module = async (config: BisenetV2CelebAMaskConfig) => {
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

// Case.1 Use ImageBitmap (for Chrome default)
const predict = async (image: ImageBitmap, config: BisenetV2CelebAMaskConfig, params: BisenetV2CelebAMaskOperatipnParams) => {
    const off = new OffscreenCanvas(params.processWidth, params.processHeight);
    const ctx = off.getContext("2d")!;
    ctx.drawImage(image, 0, 0, off.width, off.height);
    const imageData = ctx.getImageData(0, 0, off.width, off.height);

    let bm: number[][] | null = null;
    tf.tidy(() => {
        let tensor = tf.browser.fromPixels(imageData);
        tensor = tf.sub(tensor.expandDims(0).div(127.5), 1);
        //        tensor = tensor.expandDims(0).div(255)
        let prediction = model!.predict(tensor) as tf.Tensor;
        bm = prediction.arraySync() as number[][];
    });
    return bm;
};

// Case.2 Use ImageBitmap (for Safari or special intent)
const predictWithData = async (data: Uint8ClampedArray, config: BisenetV2CelebAMaskConfig, params: BisenetV2CelebAMaskOperatipnParams) => {
    const imageData = new ImageData(data, params.processWidth, params.processHeight);

    let bm: number[][] | null = null;
    tf.tidy(() => {
        let tensor = tf.browser.fromPixels(imageData);
        tensor = tf.sub(tensor.expandDims(0).div(127.5), 1);
        let prediction = model!.predict(tensor) as tf.Tensor;
        bm = prediction.arraySync() as number[][];
    });
    return bm;
};

onmessage = async (event) => {
    //  console.log("event", event)
    if (event.data.message === WorkerCommand.INITIALIZE) {
        const config = event.data.config as BisenetV2CelebAMaskConfig;
        await load_module(config);
        tf.ready().then(async () => {
            tf.env().set("WEBGL_CPU_FORWARD", false);

            const modelJson2 = new File([config.modelJson], "model.json", { type: "application/json" });
            const b1 = Buffer.from(config.modelWeight1.split(",")[1], "base64");
            const modelWeights1 = new File([b1], "group1-shard1of3.bin");
            const b2 = Buffer.from(config.modelWeight2.split(",")[1], "base64");
            const modelWeights2 = new File([b2], "group1-shard2of3.bin");
            const b3 = Buffer.from(config.modelWeight3.split(",")[1], "base64");
            const modelWeights3 = new File([b3], "group1-shard3of3.bin");
            model = await tf.loadGraphModel(tf.io.browserFiles([modelJson2, modelWeights1, modelWeights2, modelWeights3]));

            console.log(model.inputs);
            console.log(model.inputNodes);
            console.log(model.outputs);
            console.log(model.outputNodes);
            ctx.postMessage({ message: WorkerResponse.INITIALIZED });
        });
    } else if (event.data.message === WorkerCommand.PREDICT) {
        //    console.log("requested predict bodypix.")
        const image: ImageBitmap = event.data.image;
        const data = event.data.data;
        const config: BisenetV2CelebAMaskConfig = event.data.config;
        const params: BisenetV2CelebAMaskOperatipnParams = event.data.params;
        const uid: number = event.data.uid;

        // console.log("current backend[worker thread]:",tf.getBackend())
        if (data) {
            // Case.2
            console.log("Browser SAFARI");
            const prediction = await predictWithData(data, config, params);
            ctx.postMessage({ message: WorkerResponse.PREDICTED, uid: uid, prediction: prediction });
        } else {
            // Case.1
            const prediction = await predict(image, config, params);
            ctx.postMessage({ message: WorkerResponse.PREDICTED, uid: uid, prediction: prediction });
        }
    }
};
