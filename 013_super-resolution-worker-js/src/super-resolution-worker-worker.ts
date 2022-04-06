import { BackendTypes, InterpolationTypes, SuperResolutionConfig, SuperResolutionOperationParams, TFLite, WorkerCommand, WorkerResponse } from "./const";
import { setWasmPaths } from "@tensorflow/tfjs-backend-wasm";
import * as tf from "@tensorflow/tfjs";
import { BrowserTypes } from "@dannadori/000_WorkerBase";
const ctx: Worker = self as any; // eslint-disable-line no-restricted-globals
let tflite: TFLite | null = null;
let tfjsModel: tf.LayersModel | null = null;
let ready: boolean = false;

const load_module = async (config: SuperResolutionConfig) => {
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

const predict = async (config: SuperResolutionConfig, params: SuperResolutionOperationParams, data: Uint8ClampedArray) => {
    if (!tflite) {
        console.log("tflite not ready");
        return null;
    }

    const imageData = new ImageData(data, params.processWidth, params.processHeight);

    if (config.useTFJS && params.interpolation === InterpolationTypes.INTER_ESPCN) {
        tflite!.HEAPU8.set(imageData.data, tflite!._getInputImageBufferOffset());
        tflite!._extractY(params.processWidth, params.processHeight);
        const YBufferOffset = tflite!._getYBufferOffset();
        const Y = tflite!.HEAPU8.slice(YBufferOffset, YBufferOffset + params.processWidth * params.processHeight);
        const resizedWidth = params.processWidth * config.scaleFactor[config.modelKey];
        const resizedHeight = params.processHeight * config.scaleFactor[config.modelKey];
        let bm = [0];
        try {
            tf.tidy(() => {
                let tensor = tf.tensor1d(Y);
                tensor = tensor.reshape([1, params.processHeight, params.processWidth, 1]);
                tensor = tf.cast(tensor, "float32");
                tensor = tensor.div(255.0);
                // console.log(tensor)
                let prediction = tfjsModel!.predict(tensor) as tf.Tensor;
                //console.log(prediction)
                prediction = prediction.reshape([1, params.processHeight, params.processWidth, config.scaleFactor[config.modelKey], config.scaleFactor[config.modelKey], 1]);
                // console.log(prediction)
                const prediction2 = prediction.split(params.processHeight, 1);
                // console.log(prediction2)
                for (let i = 0; i < params.processHeight; i++) {
                    prediction2[i] = prediction2[i].squeeze([1]);
                }
                const prediction3 = tf.concat(prediction2, 2);
                const prediction4 = prediction3.split(params.processWidth, 1);
                for (let i = 0; i < params.processWidth; i++) {
                    prediction4[i] = prediction4[i].squeeze([1]);
                }
                const prediction5 = tf.concat(prediction4, 2);
                // console.log(prediction5)
                bm = prediction5
                    .reshape([resizedWidth * resizedHeight])
                    .mul(255)
                    .cast("int32")
                    .arraySync() as number[];
                // console.log(bm)
            });
        } catch (exception) {
            console.log(exception);
            return null;
        }
        const scaledY = new Uint8ClampedArray(bm);
        const scaledYBufferOffset = tflite!._getScaledYBufferOffset();
        tflite!.HEAPU8.set(scaledY, scaledYBufferOffset);
        tflite!._mergeY(params.processWidth, params.processHeight, resizedWidth, resizedHeight);
        const outputImageBufferOffset = tflite!._getOutputImageBufferOffset();
        return tflite!.HEAPU8.slice(outputImageBufferOffset, outputImageBufferOffset + resizedWidth * resizedHeight * 4);
    } else {
        tflite!.HEAPU8.set(imageData.data, tflite!._getInputImageBufferOffset());
        tflite!._exec(params.processWidth, params.processHeight, params.interpolation);
        const outputImageBufferOffset = tflite!._getOutputImageBufferOffset();
        const resizedWidth = params.processWidth * config.scaleFactor[config.modelKey];
        const resizedHeight = params.processHeight * config.scaleFactor[config.modelKey];
        return tflite!.HEAPU8.slice(outputImageBufferOffset, outputImageBufferOffset + resizedWidth * resizedHeight * 4);
    }
};

onmessage = async (event) => {
    if (event.data.message === WorkerCommand.INITIALIZE) {
        ready = false;
        const config = event.data.config as SuperResolutionConfig;
        tfjsModel = null;
        tflite = null;
        if (config.useTFJS) {
            /// (x) Tensorflow JS
            await load_module(config);
            await tf.ready();
            tf.env().set("WEBGL_CPU_FORWARD", false);

            const modelJson = new File([config.modelJson[config.modelKey]], "model.json", { type: "application/json" });
            const weight = Buffer.from(config.modelWeight[config.modelKey].split(",")[1], "base64");
            const modelWeights = new File([weight], "group1-shard1of1.bin");
            tfjsModel = await tf.loadLayersModel(tf.io.browserFiles([modelJson, modelWeights]));
        }

        /// (x) TensorflowLite (always loaded for interpolutions.)
        const browserType = config.browserType;
        if (config.useSimd && browserType !== BrowserTypes.SAFARI) {
            const modSimd = require("../resources/wasm/tflite-simd.js");
            const b = Buffer.from(config.wasmSimdBase64!, "base64");
            tflite = await modSimd({ wasmBinary: b });
        } else {
            const mod = require("../resources/wasm/tflite.js");
            const b = Buffer.from(config.wasmBase64!, "base64");
            tflite = await mod({ wasmBinary: b });
        }
        const modelBufferOffset = tflite!._getModelBufferMemoryOffset();
        const tfliteModel = Buffer.from(config.modelTFLite[config.modelKey], "base64");
        tflite!.HEAPU8.set(new Uint8Array(tfliteModel), modelBufferOffset);
        tflite!._loadModel(tfliteModel.byteLength);
        ready = true;
        ctx.postMessage({ message: WorkerResponse.INITIALIZED });
    } else if (event.data.message === WorkerCommand.PREDICT) {
        const config: SuperResolutionConfig = event.data.config;
        const params: SuperResolutionOperationParams = event.data.params;
        const data: Uint8ClampedArray = event.data.data;
        if (ready === false) {
            console.log("NOTREADY!!", WorkerResponse.NOT_READY);
            ctx.postMessage({ message: WorkerResponse.NOT_READY });
        } else {
            console.log("READY!!");
            const prediction = await predict(config, params, data);
            ctx.postMessage({ message: WorkerResponse.PREDICTED, prediction: prediction }, [prediction!.buffer]);
        }
    }
};

module.exports = [ctx];
