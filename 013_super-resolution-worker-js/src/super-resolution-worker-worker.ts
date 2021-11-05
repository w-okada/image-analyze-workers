import { BrowserType } from "./BrowserUtil";
import { InterpolationTypes, SuperResolutionConfig, SuperResolutionOperationParams, TFLite, WorkerCommand, WorkerResponse } from "./const";
import { setWasmPath } from "@tensorflow/tfjs-backend-wasm";
import * as tf from "@tensorflow/tfjs";
const ctx: Worker = self as any; // eslint-disable-line no-restricted-globals
let tflite: TFLite | null = null;
let tfjsModel: tf.LayersModel | null = null;
let ready: boolean = false;

const load_module = async (config: SuperResolutionConfig) => {
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

const predict = async (imageData: ImageData, config: SuperResolutionConfig, params: SuperResolutionOperationParams) => {
    if (!tflite) {
        console.log("tflite not ready");
        return null;
    }

    if (config.useTFJS && params.interpolation === InterpolationTypes.INTER_ESPCN) {
        tflite!.HEAPU8.set(imageData.data, tflite!._getInputImageBufferOffset());
        tflite!._extractY(params.inputWidth, params.inputHeight);
        const YBufferOffset = tflite!._getYBufferOffset();
        const Y = tflite!.HEAPU8.slice(YBufferOffset, YBufferOffset + params.inputWidth * params.inputHeight);
        const resizedWidth = params.inputWidth * config.scaleFactor[config.modelKey];
        const resizedHeight = params.inputHeight * config.scaleFactor[config.modelKey];
        let bm = [0];
        try {
            tf.tidy(() => {
                let tensor = tf.tensor1d(Y);
                tensor = tensor.reshape([1, params.inputHeight, params.inputWidth, 1]);
                tensor = tf.cast(tensor, "float32");
                tensor = tensor.div(255.0);
                // console.log(tensor)
                let prediction = tfjsModel!.predict(tensor) as tf.Tensor;
                //console.log(prediction)
                prediction = prediction.reshape([1, params.inputHeight, params.inputWidth, config.scaleFactor[config.modelKey], config.scaleFactor[config.modelKey], 1]);
                // console.log(prediction)
                const prediction2 = prediction.split(params.inputHeight, 1);
                // console.log(prediction2)
                for (let i = 0; i < params.inputHeight; i++) {
                    prediction2[i] = prediction2[i].squeeze([1]);
                }
                const prediction3 = tf.concat(prediction2, 2);
                const prediction4 = prediction3.split(params.inputWidth, 1);
                for (let i = 0; i < params.inputWidth; i++) {
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
        tflite!._mergeY(params.inputWidth, params.inputHeight, resizedWidth, resizedHeight);
        const outputImageBufferOffset = tflite!._getOutputImageBufferOffset();
        return tflite!.HEAPU8.slice(outputImageBufferOffset, outputImageBufferOffset + resizedWidth * resizedHeight * 4);
    } else {
        tflite!.HEAPU8.set(imageData.data, tflite!._getInputImageBufferOffset());
        tflite!._exec(params.inputWidth, params.inputHeight, params.interpolation);
        const outputImageBufferOffset = tflite!._getOutputImageBufferOffset();
        const resizedWidth = params.inputWidth * config.scaleFactor[config.modelKey];
        const resizedHeight = params.inputHeight * config.scaleFactor[config.modelKey];
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
        if (config.useSimd && browserType !== BrowserType.SAFARI) {
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
        const uid: number = event.data.uid;
        const config: SuperResolutionConfig = event.data.config;
        const params: SuperResolutionOperationParams = event.data.params;
        const imageData = event.data.imageData as ImageData;
        if (ready === false) {
            console.log("NOTREADY!!", WorkerResponse.NOT_READY);
            ctx.postMessage({ message: WorkerResponse.NOT_READY, uid: uid });
        } else {
            console.log("READY!!");
            const prediction = await predict(imageData, config, params);
            ctx.postMessage({ message: WorkerResponse.PREDICTED, uid: uid, prediction: prediction });
        }
    }
};

module.exports = [ctx];
