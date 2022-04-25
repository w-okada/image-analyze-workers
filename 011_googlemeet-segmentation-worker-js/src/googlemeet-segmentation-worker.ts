import * as tf from "@tensorflow/tfjs";
import { BackendTypes, GoogleMeetSegmentationConfig, GoogleMeetSegmentationFunctionType, GoogleMeetSegmentationOperationParams, GoogleMeetSegmentationSmoothingType, InterpolationTypes, PostProcessTypes, TFLite, WorkerCommand, WorkerResponse } from "./const";
import { setWasmPath, setWasmPaths } from "@tensorflow/tfjs-backend-wasm";
import { BrowserTypes, getBrowserType, LocalWorker, WorkerManagerBase } from "@dannadori/000_WorkerBase";
export { GoogleMeetSegmentationSmoothingType, BackendTypes, PostProcessTypes, InterpolationTypes } from "./const";

// @ts-ignore
import workerJs from "worker-loader?inline=no-fallback!./googlemeet-segmentation-worker-worker.ts";

// @ts-ignore
import modelJson_96x160 from "../resources/tensorflowjs/96x160_32/model.json";
// @ts-ignore
import modelWeight_96x160 from "../resources/tensorflowjs/96x160_32/group1-shard1of1.bin";
// @ts-ignore
import modelJson_128x128 from "../resources/tensorflowjs/128x128_32/model.json";
// @ts-ignore
import modelWeight_128x128 from "../resources/tensorflowjs/128x128_32/group1-shard1of1.bin";
// @ts-ignore
import modelJson_144x256 from "../resources/tensorflowjs/144x256_32/model.json";
// @ts-ignore
import modelWeight_144x256 from "../resources/tensorflowjs/144x256_32/group1-shard1of1.bin";
// @ts-ignore
import modelJson_256x256 from "../resources/tensorflowjs/256x256_32/model.json";
// @ts-ignore
import modelWeight_256x256 from "../resources/tensorflowjs/256x256_32/group1-shard1of1.bin";

// @ts-ignore
import tflite_96x160 from "../resources/tflite_models/96x160/segm_lite_v681.tflite.bin";
// @ts-ignore
import tflite_128x128 from "../resources/tflite_models/128x128/segm_lite_v509.tflite.bin";
// @ts-ignore
import tflite_144x256 from "../resources/tflite_models/144x256/segm_full_v679.tflite.bin";
// @ts-ignore
import tflite_256x256 from "../resources/tflite_models/256x256/segm_full_v1215.f16.tflite.bin";

// @ts-ignore
import wasm from "../resources/wasm/tflite.wasm";
// @ts-ignore
import wasmSimd from "../resources/wasm/tflite-simd.wasm";

export const generateGoogleMeetSegmentationDefaultConfig = (): GoogleMeetSegmentationConfig => {
    const defaultConf: GoogleMeetSegmentationConfig = {
        browserType: getBrowserType(),
        processOnLocal: false,
        backendType: BackendTypes.WebGL,
        wasmPaths: {
            "tfjs-backend-wasm.wasm": "/tfjs-backend-wasm.wasm",
            "tfjs-backend-wasm-simd.wasm": "/tfjs-backend-wasm-simd.wasm",
            "tfjs-backend-wasm-threaded-simd.wasm": "/tfjs-backend-wasm-threaded-simd.wasm",
        },
        pageUrl: window.location.href,
        modelJsons: {
            "160x96": modelJson_96x160,
            "128x128": modelJson_128x128,
            "256x144": modelJson_144x256,
            "256x256": modelJson_256x256,
        },
        modelWeights: {
            "160x96": modelWeight_96x160,
            "128x128": modelWeight_128x128,
            "256x144": modelWeight_144x256,
            "256x256": modelWeight_256x256,
        },
        modelTFLites: {
            "160x96": tflite_96x160.split(",")[1],
            "128x128": tflite_128x128.split(",")[1],
            "256x144": tflite_144x256.split(",")[1],
            "256x256": tflite_256x256.split(",")[1],
        },
        modelInputs: {
            "160x96": [160, 96],
            "128x128": [128, 128],
            "256x144": [256, 144],
            "256x256": [256, 256],
        },
        modelKey: "160x96",
        wasmBase64: wasm.split(",")[1],
        wasmSimdBase64: wasmSimd.split(",")[1],
        useSimd: false,
        useTFJS: true,
    };
    return defaultConf;
};

export const generateDefaultGoogleMeetSegmentationParams = (): GoogleMeetSegmentationOperationParams => {
    const defaultParams: GoogleMeetSegmentationOperationParams = {
        type: GoogleMeetSegmentationFunctionType.Segmentation,
        processSizeKey: "256x256",
        jbfD: 0,
        jbfSigmaC: 2,
        jbfSigmaS: 2,
        jbfPostProcess: PostProcessTypes.softmax_jbf,
        threshold: 0.5,
        interpolation: InterpolationTypes.lanczos,
        processWidth: 128,
        processHeight: 128,
    };
    return defaultParams;
};

export class LocalGM extends LocalWorker {
    tfjsModel: tf.GraphModel | null = null;
    tfliteModel: TFLite | null = null;

    canvas = document.createElement("canvas");
    ready = false;

    load_module = async (config: GoogleMeetSegmentationConfig) => {
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

    init = async (config: GoogleMeetSegmentationConfig) => {
        this.ready = false;

        this.tfjsModel = null;
        this.tfliteModel = null;

        // TensorflowJS
        if (config.useTFJS) {
            await this.load_module(config);
            await tf.ready();
            await tf.env().set("WEBGL_CPU_FORWARD", false);
            const modelJson = new File([config.modelJsons[config.modelKey]], "model.json", { type: "application/json" });
            const weight = Buffer.from(config.modelWeights[config.modelKey].split(",")[1], "base64");
            const modelWeights = new File([weight], "group1-shard1of1.bin");
            this.tfjsModel = await tf.loadGraphModel(tf.io.browserFiles([modelJson, modelWeights]));
        }

        /// (x) TensorflowLite (always loaded for interpolutions.)
        const browserType = getBrowserType();
        if (config.useSimd && browserType !== BrowserTypes.SAFARI) {
            // SIMD
            const modSimd = require("../resources/wasm/tflite-simd.js");
            const b = Buffer.from(config.wasmSimdBase64!, "base64");
            this.tfliteModel = await modSimd({ wasmBinary: b });
        } else {
            // Not-SIMD
            const mod = require("../resources/wasm/tflite.js");
            const b = Buffer.from(config.wasmBase64!, "base64");
            this.tfliteModel = await mod({ wasmBinary: b });
        }
        const modelBufferOffset = this.tfliteModel!._getModelBufferMemoryOffset();
        const tfliteModel = Buffer.from(config.modelTFLites[config.modelKey], "base64");
        this.tfliteModel!.HEAPU8.set(new Uint8Array(tfliteModel), modelBufferOffset);
        this.tfliteModel!._loadModel(tfliteModel.byteLength);

        this.ready = true;
    };

    predict = async (config: GoogleMeetSegmentationConfig, params: GoogleMeetSegmentationOperationParams, targetCanvas: HTMLCanvasElement) => {
        if (!this.tfliteModel && !this.tfjsModel) {
            return null;
        }
        if (!this.ready) {
            return null;
        }

        let res: Uint8ClampedArray | null = null;
        if (config.useTFJS) {
            tf.tidy(() => {
                let tensor = tf.browser.fromPixels(targetCanvas);
                const tensorWidth = this.tfjsModel!.inputs[0].shape![2];
                const tensorHeight = this.tfjsModel!.inputs[0].shape![1];
                tensor = tf.image.resizeBilinear(tensor, [tensorHeight, tensorWidth]);
                tensor = tensor.expandDims(0);
                tensor = tf.cast(tensor, "float32");
                tensor = tensor.div(255.0);
                let prediction = this.tfjsModel!.predict(tensor) as tf.Tensor;
                prediction = prediction.softmax();
                prediction = prediction.squeeze();
                let segmentation: tf.Tensor<tf.Rank>;
                if (prediction.shape.length === 2) {
                    segmentation = prediction.reshape([-1]);
                    const seg = segmentation.arraySync() as number[];
                    res = new Uint8ClampedArray(seg);
                } else {
                    let [predTensor0, predTensor1] = tf.split(prediction, 2, 2) as tf.Tensor<tf.Rank>[];
                    predTensor0 = predTensor0.squeeze().flatten();
                    predTensor1 = predTensor1.squeeze().flatten();
                    const seg0 = predTensor0.arraySync() as number[];
                    const seg1 = predTensor1.arraySync() as number[];
                    const jbfGuideImageBufferOffset = this.tfliteModel!._getJbfGuideImageBufferOffset();
                    const jbfInputImageBufferOffset = this.tfliteModel!._getJbfInputImageBufferOffset();
                    this.tfliteModel!.HEAPF32.set(new Float32Array(seg0), jbfGuideImageBufferOffset / 4);
                    this.tfliteModel!.HEAPF32.set(new Float32Array(seg1), jbfInputImageBufferOffset / 4);
                    this.tfliteModel!._jbf(tensorWidth, tensorHeight, targetCanvas.width, targetCanvas.height, params.jbfD, params.jbfSigmaC, params.jbfSigmaS, params.jbfPostProcess, params.interpolation, params.threshold);

                    const outputImageBufferOffset = this.tfliteModel!._getOutputImageBufferOffset();
                    res = new Uint8ClampedArray(this.tfliteModel!.HEAPU8.slice(outputImageBufferOffset, outputImageBufferOffset + targetCanvas.width * targetCanvas.height * 4));
                }
            });
        } else {
            const imageData = targetCanvas.getContext("2d")!.getImageData(0, 0, targetCanvas.width, targetCanvas.height);
            const inputImageBufferOffset = this.tfliteModel!._getInputImageBufferOffset();
            this.tfliteModel!.HEAPU8.set(imageData.data, inputImageBufferOffset);

            this.tfliteModel!._exec_with_jbf(imageData.width, imageData.height, params.jbfD, params.jbfSigmaC, params.jbfSigmaS, params.jbfPostProcess, params.interpolation, params.threshold);

            const outputImageBufferOffset = this.tfliteModel!._getOutputImageBufferOffset();
            res = new Uint8ClampedArray(this.tfliteModel!.HEAPU8.slice(outputImageBufferOffset, outputImageBufferOffset + imageData.width * imageData.height * 4));
        }
        // console.log("RES:::", res);
        return res;
    };
}

export class GoogleMeetSegmentationWorkerManager extends WorkerManagerBase {
    private config = generateGoogleMeetSegmentationDefaultConfig();
    localWorker = new LocalGM();

    init = async (config: GoogleMeetSegmentationConfig | null) => {
        this.config = config || generateGoogleMeetSegmentationDefaultConfig();
        await this.initCommon(
            {
                useWorkerForSafari: false,
                processOnLocal: this.config.processOnLocal,
                workerJs: () => {
                    return new workerJs();
                },
            },
            config
        );
        return;
    };

    predict = async (params = generateDefaultGoogleMeetSegmentationParams(), targetCanvas: HTMLCanvasElement) => {
        const currentParams = { ...params };
        const resizedCanvas = this.generateTargetCanvas(targetCanvas, currentParams.processWidth, currentParams.processHeight);
        if (!this.worker) {
            const prediction = await this.localWorker.predict(this.config, currentParams, resizedCanvas);
            return prediction;
        }
        const imageData = resizedCanvas.getContext("2d")!.getImageData(0, 0, resizedCanvas.width, resizedCanvas.height);
        const prediction = (await this.sendToWorker(currentParams, imageData.data)) as Uint8ClampedArray;
        return prediction;
    };
}

//// Utility for Demo

export const createForegroundImage = (srcCanvas: HTMLCanvasElement, prediction: number[][]) => {
    const tmpCanvas = document.createElement("canvas");
    tmpCanvas.width = prediction[0].length;
    tmpCanvas.height = prediction.length;
    const imageData = tmpCanvas.getContext("2d")!.getImageData(0, 0, tmpCanvas.width, tmpCanvas.height);
    const data = imageData.data;

    for (let rowIndex = 0; rowIndex < tmpCanvas.height; rowIndex++) {
        for (let colIndex = 0; colIndex < tmpCanvas.width; colIndex++) {
            const seg_offset = rowIndex * tmpCanvas.width + colIndex;
            const pix_offset = (rowIndex * tmpCanvas.width + colIndex) * 4;
            if (prediction[rowIndex][colIndex] > 0.5) {
                data[pix_offset + 0] = 70;
                data[pix_offset + 1] = 30;
                data[pix_offset + 2] = 30;
                data[pix_offset + 3] = 200;
            } else {
                data[pix_offset + 0] = 0;
                data[pix_offset + 1] = 0;
                data[pix_offset + 2] = 0;
                data[pix_offset + 3] = 0;
            }
        }
    }
    const imageDataTransparent = new ImageData(data, tmpCanvas.width, tmpCanvas.height);
    tmpCanvas.getContext("2d")!.putImageData(imageDataTransparent, 0, 0);

    const outputCanvas = document.createElement("canvas");

    outputCanvas.width = srcCanvas.width;
    outputCanvas.height = srcCanvas.height;
    const ctx = outputCanvas.getContext("2d")!;
    ctx.drawImage(tmpCanvas, 0, 0, outputCanvas.width, outputCanvas.height);
    const outImageData = ctx.getImageData(0, 0, outputCanvas.width, outputCanvas.height);
    return outImageData;
};
