import { getBrowserType, BrowserType } from "./BrowserUtil";
import * as tf from "@tensorflow/tfjs";
import { GoogleMeetSegmentationConfig, GoogleMeetSegmentationFunctionType, GoogleMeetSegmentationOperationParams, GoogleMeetSegmentationSmoothingType, TFLite, WorkerCommand, WorkerResponse } from "./const";
import { setWasmPath } from "@tensorflow/tfjs-backend-wasm";
import { drawArrayToCanvas, imageToGrayScaleArray, padSymmetricImage } from "./utils";

export { GoogleMeetSegmentationSmoothingType } from "./const";

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
        useTFWasmBackend: false,
        wasmPath: "/tfjs-backend-wasm.wasm",
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
        processSizes: {
            "160x96": [160, 96],
            "128x128": [128, 128],
            "256x144": [256, 144],
            "256x256": [256, 256],
            "512x512": [512, 512],
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
        jbfPostProcess: 3,
        threshold: 0.5,
        interpolation: 3,
    };
    return defaultParams;
};

const load_module = async (config: GoogleMeetSegmentationConfig) => {
    const dirname = config.pageUrl.substr(0, config.pageUrl.lastIndexOf("/"));
    const wasmPath = `${dirname}${config.wasmPath}`;
    console.log(`use wasm backend ${wasmPath}`);
    setWasmPath(wasmPath);
    if (config.useTFWasmBackend) {
        require("@tensorflow/tfjs-backend-wasm");
        await tf.setBackend("wasm");
    } else {
        console.log("use webgl backend");
        require("@tensorflow/tfjs-backend-webgl");
        await tf.setBackend("webgl");
    }
};

export class LocalWorker {
    tfjsModel: tf.GraphModel | null = null;
    tfliteModel: TFLite | null = null;

    canvas = document.createElement("canvas");
    ready = false;

    init = async (config: GoogleMeetSegmentationConfig) => {
        this.ready = false;

        this.tfjsModel = null;
        this.tfliteModel = null;

        if (config.useTFJS) {
            /// (x) Tensorflow JS
            await load_module(config);
            await tf.ready();
            await tf.env().set("WEBGL_CPU_FORWARD", false);
            const modelJson = new File([config.modelJsons[config.modelKey]], "model.json", { type: "application/json" });
            const weight = Buffer.from(config.modelWeights[config.modelKey].split(",")[1], "base64");
            const modelWeights = new File([weight], "group1-shard1of1.bin");
            this.tfjsModel = await tf.loadGraphModel(tf.io.browserFiles([modelJson, modelWeights]));
        }

        /// (x) TensorflowLite (always loaded for interpolutions.)
        const browserType = getBrowserType();
        if (config.useSimd && browserType !== BrowserType.SAFARI) {
            const modSimd = require("../resources/wasm/tflite-simd.js");
            const b = Buffer.from(config.wasmSimdBase64!, "base64");
            this.tfliteModel = await modSimd({ wasmBinary: b });
        } else {
            const mod = require("../resources/wasm/tflite.js");
            const b = Buffer.from(config.wasmBase64!, "base64");
            this.tfliteModel = await mod({ wasmBinary: b });
        }
        const modelBufferOffset = this.tfliteModel!._getModelBufferMemoryOffset();
        const tfliteModel = Buffer.from(config.modelTFLites[config.modelKey], "base64");
        this.tfliteModel!.HEAPU8.set(new Uint8Array(tfliteModel), modelBufferOffset);
        console.log("LOAD MODEL1 ");
        this.tfliteModel!._loadModel(tfliteModel.byteLength);
        console.log("LOAD MODEL2 ");

        this.ready = true;
    };

    predict = async (imageData: ImageData, config: GoogleMeetSegmentationConfig, params: GoogleMeetSegmentationOperationParams) => {
        if (!this.tfliteModel && !this.tfjsModel) {
            return null;
        }
        if (!this.ready) {
            return null;
        }

        let res: ImageData | null = null;
        if (config.useTFJS) {
            tf.tidy(() => {
                let tensor = tf.browser.fromPixels(imageData);
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
                    segmentation = prediction;
                    const seg = segmentation.arraySync() as number[];
                    res = new ImageData(new Uint8ClampedArray(seg), tensorWidth, tensorHeight);
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
                    this.tfliteModel!._jbf(tensorWidth, tensorHeight, imageData.width, imageData.height, params.jbfD, params.jbfSigmaC, params.jbfSigmaS, params.jbfPostProcess, params.interpolation, params.threshold);

                    const outputImageBufferOffset = this.tfliteModel!._getOutputImageBufferOffset();
                    res = new ImageData(new Uint8ClampedArray(this.tfliteModel!.HEAPU8.slice(outputImageBufferOffset, outputImageBufferOffset + imageData.width * imageData.height * 4)), imageData.width, imageData.height);
                }
            });
        } else {
            const inputImageBufferOffset = this.tfliteModel!._getInputImageBufferOffset();
            this.tfliteModel!.HEAPU8.set(imageData.data, inputImageBufferOffset);

            this.tfliteModel!._exec_with_jbf(imageData.width, imageData.height, params.jbfD, params.jbfSigmaC, params.jbfSigmaS, params.jbfPostProcess, params.interpolation, params.threshold);

            const outputImageBufferOffset = this.tfliteModel!._getOutputImageBufferOffset();
            res = new ImageData(new Uint8ClampedArray(this.tfliteModel!.HEAPU8.slice(outputImageBufferOffset, outputImageBufferOffset + imageData.width * imageData.height * 4)), imageData.width, imageData.height);
        }
        // console.log("RES:::", res);
        return res;
    };
}

export class GoogleMeetSegmentationWorkerManager {
    private workerGM: Worker | null = null;
    private tmpCanvas = document.createElement("canvas");
    private config = generateGoogleMeetSegmentationDefaultConfig();
    private localWorker = new LocalWorker();
    init = async (config: GoogleMeetSegmentationConfig | null) => {
        if (config != null) {
            this.config = config;
        }
        if (this.workerGM) {
            this.workerGM.terminate();
        }
        this.workerGM = null;

        if (this.config.processOnLocal == true) {
            await this.localWorker.init(this.config!);
            return;
        }

        // ワーカー
        const workerGM: Worker = new workerJs();
        const p = new Promise<void>((onResolve, onFail) => {
            workerGM!.onmessage = (event) => {
                if (event.data.message === WorkerResponse.INITIALIZED) {
                    console.log("WORKERSS INITIALIZED");
                    this.workerGM = workerGM;
                    onResolve();
                } else {
                    console.log("celeb a mask Initialization something wrong..");
                    onFail(event);
                }
            };
        });
        workerGM!.postMessage({ message: WorkerCommand.INITIALIZE, config: this.config });
        return;
    };

    predict = async (targetCanvas: HTMLCanvasElement, params = generateDefaultGoogleMeetSegmentationParams()) => {
        this.tmpCanvas.width = this.config.processSizes[params.processSizeKey][0];
        this.tmpCanvas.height = this.config.processSizes[params.processSizeKey][1];
        const ctx = this.tmpCanvas.getContext("2d")!;
        ctx.drawImage(targetCanvas, 0, 0, this.tmpCanvas.width, this.tmpCanvas.height);
        const imageData = ctx.getImageData(0, 0, this.tmpCanvas.width, this.tmpCanvas.height);

        if (this.config.processOnLocal == true) {
            // Case.1 Process on local thread.
            // const prediction = await this.localWorker.predict_jbf_js_canvas(targetCanvas, this.config, params);
            const prediction = await this.localWorker.predict(imageData, this.config, params);

            return prediction;
        }
        if (!this.workerGM) {
            return null;
        }

        const uid = performance.now();
        this.workerGM!.postMessage(
            {
                message: WorkerCommand.PREDICT,
                uid: uid,
                config: this.config,
                params: params,
                imageData: imageData,
            },
            [imageData.data.buffer]
        );
        const p = new Promise((onResolve: (v: ImageData | null) => void, onFail) => {
            this.workerGM!.onmessage = (event) => {
                if (event.data.message === WorkerResponse.PREDICTED) {
                    const imageData = event.data.imageData;
                    onResolve(imageData);
                } else {
                    console.log("Bodypix Prediction something wrong..", event.data.message, WorkerResponse.PREDICTED, event.data.uid, uid);
                    // onFail(event)
                }
            };
        });
        return p;

        // if (this.config.browserType === BrowserType.SAFARI) {
        //     const imageData = targetCanvas.getContext("2d")!.getImageData(0, 0, targetCanvas.width, targetCanvas.height);
        //     const dataArray = imageData.data;
        //     const uid = performance.now();
        //     params.originalWidth = imageData.width;
        //     params.originalHeight = imageData.height;

        //     this.workerGM!.postMessage(
        //         {
        //             message: WorkerCommand.PREDICT,
        //             uid: uid,
        //             config: this.config,
        //             params: params,
        //             data: dataArray,
        //         },
        //         [dataArray.buffer]
        //     );
        //     const p = new Promise((onResolve: (v: number[][]) => void, onFail) => {
        //         this.workerGM!.onmessage = (event) => {
        //             if (event.data.message === WorkerResponse.PREDICTED && event.data.uid === uid) {
        //                 const prediction = event.data.prediction;
        //                 onResolve(prediction);
        //             } else {
        //                 console.log("Bodypix Prediction something wrong..", event.data.message, WorkerResponse.PREDICTED, event.data.uid, uid);
        //                 //                        onFail(event)
        //             }
        //         };
        //     });
        //     return p;
        // } else {
        //     // Case.3 Process on worker thread, Chrome (Send ImageBitmap)
        //     const off = new OffscreenCanvas(targetCanvas.width, targetCanvas.height);
        //     off.getContext("2d")!.drawImage(targetCanvas, 0, 0, targetCanvas.width, targetCanvas.height);
        //     const imageBitmap = off.transferToImageBitmap();
        //     const uid = performance.now();
        //     this.workerGM!.postMessage(
        //         {
        //             message: WorkerCommand.PREDICT,
        //             uid: uid,
        //             config: this.config,
        //             params: params,
        //             // data: data, width: inImageData.width, height:inImageData.height
        //             image: imageBitmap,
        //         },
        //         [imageBitmap]
        //     );
        //     const p = new Promise((onResolve: (v: number[][]) => void, onFail) => {
        //         this.workerGM!.onmessage = (event) => {
        //             if (event.data.message === WorkerResponse.PREDICTED && event.data.uid === uid) {
        //                 const prediction = event.data.prediction;
        //                 onResolve(prediction);
        //             } else {
        //                 console.log("Bodypix Prediction something wrong..", event.data.message, WorkerResponse.PREDICTED, event.data.uid, uid);
        //                 // onFail(event)
        //             }
        //         };
        //     });
        //     return p;
        // }
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
