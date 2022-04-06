import { BackendTypes, GoogleMeetSegmentationConfig, GoogleMeetSegmentationOperationParams, GoogleMeetSegmentationSmoothingType, TFLite, WorkerCommand, WorkerResponse } from "./const";
import * as tf from "@tensorflow/tfjs";
import { setWasmPath, setWasmPaths } from "@tensorflow/tfjs-backend-wasm";
import { BrowserTypes } from "@dannadori/000_WorkerBase";

const ctx: Worker = self as any; // eslint-disable-line no-restricted-globals

let tfjsModel: tf.GraphModel | null;
let tfliteModel: TFLite | null = null;
let ready: boolean = false;

const load_module = async (config: GoogleMeetSegmentationConfig) => {
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

const predict = async (config: GoogleMeetSegmentationConfig, params: GoogleMeetSegmentationOperationParams, data: Uint8ClampedArray) => {
    const imageData = new ImageData(data, params.processWidth, params.processHeight);
    let res: Uint8ClampedArray | null = null;
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
                // prediction = tf.stack([prediction.onesLike(), prediction.onesLike(), prediction.onesLike(), prediction], 2);
                // prediction = tf.stack([prediction, prediction, prediction, prediction], 2);
                console.log("newShape:::", prediction.shape);
                segmentation = prediction.reshape([-1]);
                const seg = segmentation.arraySync() as number[];
                res = new Uint8ClampedArray(seg);
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
                res = new Uint8ClampedArray(tfliteModel!.HEAPU8.slice(outputImageBufferOffset, outputImageBufferOffset + imageData.width * imageData.height * 4));
                // res = res.filter((x, index) => {
                //     return index % 4 === 3;
                // });
            }
        });
    } else {
        const inputImageBufferOffset = tfliteModel!._getInputImageBufferOffset();
        tfliteModel!.HEAPU8.set(imageData.data, inputImageBufferOffset);

        tfliteModel!._exec_with_jbf(imageData.width, imageData.height, params.jbfD, params.jbfSigmaC, params.jbfSigmaS, params.jbfPostProcess, params.interpolation, params.threshold);

        const outputImageBufferOffset = tfliteModel!._getOutputImageBufferOffset();
        res = new Uint8ClampedArray(tfliteModel!.HEAPU8.slice(outputImageBufferOffset, outputImageBufferOffset + imageData.width * imageData.height * 4));
        // res = res.filter((x, index) => {
        //     return index % 4 === 3;
        // });
    }
    // console.log("RES:::", res);
    return res!;
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
        if (config.useSimd && browserType !== BrowserTypes.SAFARI) {
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
        const config: GoogleMeetSegmentationConfig = event.data.config;
        const params: GoogleMeetSegmentationOperationParams = event.data.params;
        const data: Uint8ClampedArray = event.data.data;

        const prediction = await predict(config, params, data);
        ctx.postMessage({ message: WorkerResponse.PREDICTED, prediction: prediction }, [prediction.buffer]);
    }
};
