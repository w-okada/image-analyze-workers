import { GoogleMeetSegmentationConfig, GoogleMeetSegmentationOperationParams, GoogleMeetSegmentationSmoothingType, TFLite, WorkerCommand, WorkerResponse } from "./const";
import * as tf from "@tensorflow/tfjs";
import { BrowserType } from "./BrowserUtil";
import { setWasmPath } from "@tensorflow/tfjs-backend-wasm";
import { drawArrayToCanvas, imageToGrayScaleArray, padSymmetricImage } from "./utils";
import { browser } from "@tensorflow/tfjs";

const ctx: Worker = self as any; // eslint-disable-line no-restricted-globals

let tfjsModel: tf.GraphModel | null;
let tfliteModel: TFLite | null = null;
let ready: boolean = false;

const load_module = async (config: GoogleMeetSegmentationConfig) => {
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

const predict = async (imageData: ImageData, config: GoogleMeetSegmentationConfig, params: GoogleMeetSegmentationOperationParams) => {
    let res: ImageData | null = null;
    if (config.useTFJS) {
        tf.tidy(() => {
            let tensor = tf.browser.fromPixels(imageData);
            const tensorWidth = tfjsModel!.inputs[0].shape![2];
            const tensorHeight = tfjsModel!.inputs[0].shape![1];
            tensor = tf.image.resizeBilinear(tensor, [tensorHeight, tensorWidth]);
            tensor = tensor.expandDims(0);
            tensor = tf.cast(tensor, "float32");
            tensor = tensor.div(255.0);
            let prediction = tfjsModel!.predict(tensor) as tf.Tensor;
            prediction = prediction.softmax();
            prediction = prediction.squeeze();
            let segmentation: tf.Tensor<tf.Rank>;
            if (prediction.shape.length === 2) {
                segmentation = prediction;
                const seg = segmentation.arraySync() as number[];
                res = new ImageData(new Uint8ClampedArray(seg), tensorWidth, tensorHeight);
            } else {
                let [predTensor0, predTensor1] = tf.split(prediction, 2, 2) as tf.Tensor<tf.Rank>[];
                predTensor0 = predTensor0.squeeze().flatten();
                predTensor1 = predTensor1.squeeze().flatten();
                const seg0 = predTensor0.arraySync() as number[];
                const seg1 = predTensor1.arraySync() as number[];
                const jbfGuideImageBufferOffset = tfliteModel!._getJbfGuideImageBufferOffset();
                const jbfInputImageBufferOffset = tfliteModel!._getJbfInputImageBufferOffset();
                tfliteModel!.HEAPF32.set(new Float32Array(seg0), jbfGuideImageBufferOffset / 4);
                tfliteModel!.HEAPF32.set(new Float32Array(seg1), jbfInputImageBufferOffset / 4);
                tfliteModel!._jbf(tensorWidth, tensorHeight, imageData.width, imageData.height, params.jbfD, params.jbfSigmaC, params.jbfSigmaS, params.jbfPostProcess, params.interpolation, params.threshold);

                const outputImageBufferOffset = tfliteModel!._getOutputImageBufferOffset();
                res = new ImageData(new Uint8ClampedArray(tfliteModel!.HEAPU8.slice(outputImageBufferOffset, outputImageBufferOffset + imageData.width * imageData.height * 4)), imageData.width, imageData.height);
            }
        });
    } else {
        const inputImageBufferOffset = tfliteModel!._getInputImageBufferOffset();
        tfliteModel!.HEAPU8.set(imageData.data, inputImageBufferOffset);

        tfliteModel!._exec_with_jbf(imageData.width, imageData.height, params.jbfD, params.jbfSigmaC, params.jbfSigmaS, params.jbfPostProcess, params.interpolation, params.threshold);

        const outputImageBufferOffset = tfliteModel!._getOutputImageBufferOffset();
        res = new ImageData(new Uint8ClampedArray(tfliteModel!.HEAPU8.slice(outputImageBufferOffset, outputImageBufferOffset + imageData.width * imageData.height * 4)), imageData.width, imageData.height);
    }
    // console.log("RES:::", res);
    return res;
};

onmessage = async (event) => {
    if (event.data.message === WorkerCommand.INITIALIZE) {
        ready = false;
        const config = event.data.config as GoogleMeetSegmentationConfig;
        tfjsModel = null;
        tfliteModel = null;

        if (config.useTFJS) {
            /// (x) Tensorflow JS
            await load_module(config);
            await tf.ready();
            tf.env().set("WEBGL_CPU_FORWARD", false);

            const modelJson = new File([config.modelJsons[config.modelKey]], "model.json", { type: "application/json" });
            const weight = Buffer.from(config.modelWeights[config.modelKey].split(",")[1], "base64");
            const modelWeights = new File([weight], "group1-shard1of1.bin");
            tfjsModel = await tf.loadGraphModel(tf.io.browserFiles([modelJson, modelWeights]));
        }

        /// (x) TensorflowLite (always loaded for interpolutions.)
        const browserType = config.browserType;
        if (config.useSimd && browserType !== BrowserType.SAFARI) {
            const modSimd = require("../resources/wasm/tflite-simd.js");
            const b = Buffer.from(config.wasmSimdBase64!, "base64");
            tfliteModel = await modSimd({ wasmBinary: b });
        } else {
            const mod = require("../resources/wasm/tflite.js");
            const b = Buffer.from(config.wasmBase64!, "base64");
            tfliteModel = await mod({ wasmBinary: b });
        }
        const modelBufferOffset = tfliteModel!._getModelBufferMemoryOffset();
        const tfliteModelData = Buffer.from(config.modelTFLites[config.modelKey], "base64");
        tfliteModel!.HEAPU8.set(new Uint8Array(tfliteModelData), modelBufferOffset);
        tfliteModel!._loadModel(tfliteModelData.byteLength);
        ready = true;
        ctx.postMessage({ message: WorkerResponse.INITIALIZED });
    } else if (event.data.message === WorkerCommand.PREDICT) {
        const uid: number = event.data.uid;
        const config: GoogleMeetSegmentationConfig = event.data.config;
        const params: GoogleMeetSegmentationOperationParams = event.data.params;
        const imageData = event.data.imageData as ImageData;
        if (ready === false) {
            console.log("NOTREADY!!", WorkerResponse.NOT_READY);
            ctx.postMessage({ message: WorkerResponse.NOT_READY, uid: uid });
        } else {
            const resImageData = await predict(imageData, config, params);
            if (resImageData) {
                ctx.postMessage({ message: WorkerResponse.PREDICTED, uid: uid, imageData: resImageData }, [resImageData.data.buffer]);
            } else {
                ctx.postMessage({ message: WorkerResponse.PREDICTED, uid: uid, imageData: null });
            }
        }
    }
};
