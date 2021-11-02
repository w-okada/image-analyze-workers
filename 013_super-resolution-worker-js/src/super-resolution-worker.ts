import { BrowserType, getBrowserType } from "./BrowserUtil";
import { InterpolationTypes, SuperResolutionConfig, SuperResolutionOperationParams, TFLite, WorkerCommand, WorkerResponse } from "./const";
import { setWasmPath } from "@tensorflow/tfjs-backend-wasm";
export { SuperResolutionConfig, InterpolationTypes, SuperResolutionOperationParams };
import * as tf from "@tensorflow/tfjs";

// @ts-ignore
import workerJs from "worker-loader?inline=no-fallback!./super-resolution-worker-worker.ts";

// @ts-ignore
import modelJson_x2 from "../resources/tensorflowjs/model_x2_nopadding_tfjs/model.json";
// @ts-ignore
import modelWeight_x2 from "../resources/tensorflowjs/model_x2_nopadding_tfjs/group1-shard1of1.bin";
// @ts-ignore
import modelJson_x3 from "../resources/tensorflowjs/model_x3_nopadding_tfjs/model.json";
// @ts-ignore
import modelWeight_x3 from "../resources/tensorflowjs/model_x3_nopadding_tfjs/group1-shard1of1.bin";
// @ts-ignore
import modelJson_x4 from "../resources/tensorflowjs/model_x4_nopadding_tfjs/model.json";
// @ts-ignore
import modelWeight_x4 from "../resources/tensorflowjs/model_x4_nopadding_tfjs/group1-shard1of1.bin";

// @ts-ignore
import tflite_x2 from "../resources/tflite_models/model_x2_nopadding.tflite.bin";
// @ts-ignore
import tflite_x3 from "../resources/tflite_models/model_x3_nopadding.tflite.bin";
// @ts-ignore
import tflite_x4 from "../resources/tflite_models/model_x4_nopadding.tflite.bin";

// @ts-ignore
import opencvWasm from "../resources/wasm/tflite.wasm";
// @ts-ignore
import opencvWasmSimd from "../resources/wasm/tflite-simd.wasm";

export const generateSuperResolutionDefaultConfig = (): SuperResolutionConfig => {
    const defaultConf: SuperResolutionConfig = {
        browserType: getBrowserType(),
        processOnLocal: true,
        modelPath: "",
        enableSIMD: true,
        useTFWasmBackend: false,
        wasmPath: "/tfjs-backend-wasm.wasm",
        pageUrl: window.location.href,
        tfjsModelPath: "",

        modelJson: {
            x2: modelJson_x2,
            x3: modelJson_x3,
            x4: modelJson_x4,
        },
        modelWeight: {
            x2: modelWeight_x2,
            x3: modelWeight_x3,
            x4: modelWeight_x4,
        },
        modelTFLite: {
            x2: tflite_x2.split(",")[1],
            x3: tflite_x3.split(",")[1],
            x4: tflite_x4.split(",")[1],
        },
        scaleFactor: {
            x2: 2,
            x3: 3,
            x4: 4,
        },
        modelKey: "2x",
        interpolationTypes: InterpolationTypes,

        wasmBase64: opencvWasm.split(",")[1],
        wasmSimdBase64: opencvWasmSimd.split(",")[1],
        useSimd: false,
        useTFJS: false,
    };
    return defaultConf;
};

export const generateDefaultSuperResolutionParams = (): SuperResolutionOperationParams => {
    const defaultParams: SuperResolutionOperationParams = {
        inputWidth: 128,
        inputHeight: 128,
        interpolation: InterpolationTypes.INTER_ESPCN,
    };
    return defaultParams;
};

const calcProcessSize = (width: number, height: number) => {
    const max_size = 2000;
    if (Math.max(width, height) > max_size) {
        const ratio = max_size / Math.max(width, height);
        return [width * ratio, height * ratio];
    } else {
        return [width, height];
    }
};
const load_module = async (config: SuperResolutionConfig) => {
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
    mod: any;
    modSIMD: any;
    inputCanvas = document.createElement("canvas");
    resultArray: number[] = Array<number>(300 * 300);

    ready = false; // TBD: to be more strict for critical section

    tflite: TFLite | null = null;
    tfjsModel: tf.LayersModel | null = null;
    init = async (config: SuperResolutionConfig) => {
        this.ready = false;

        this.tfjsModel = null;
        this.tflite = null;

        if (config.useTFJS) {
            /// (x) Tensorflow JS
            await load_module(config);
            await tf.ready();
            tf.env().set("WEBGL_CPU_FORWARD", false);

            const modelJson = new File([config.modelJson[config.modelKey]], "model.json", { type: "application/json" });
            const weight = Buffer.from(config.modelWeight[config.modelKey].split(",")[1], "base64");
            const modelWeights = new File([weight], "group1-shard1of1.bin");
            this.tfjsModel = await tf.loadLayersModel(tf.io.browserFiles([modelJson, modelWeights]));
        }

        /// (x) TensorflowLite (always loaded for interpolutions.)
        const browserType = getBrowserType();
        if (config.useSimd && browserType !== BrowserType.SAFARI) {
            const modSimd = require("../resources/wasm/tflite-simd.js");
            const b = Buffer.from(config.wasmSimdBase64!, "base64");
            this.tflite = await modSimd({ wasmBinary: b });
        } else {
            const mod = require("../resources/wasm/tflite.js");
            const b = Buffer.from(config.wasmBase64!, "base64");
            this.tflite = await mod({ wasmBinary: b });
        }
        const modelBufferOffset = this.tflite!._getModelBufferMemoryOffset();
        const tfliteModel = Buffer.from(config.modelTFLite[config.modelKey], "base64");
        this.tflite!.HEAPU8.set(new Uint8Array(tfliteModel), modelBufferOffset);
        this.tflite!._loadModel(tfliteModel.byteLength);

        this.ready = true;
    };

    predict = async (imageData: ImageData, config: SuperResolutionConfig, params: SuperResolutionOperationParams) => {
        if (!this.tflite) {
            return null;
        }

        if (!this.ready) {
            return null;
        }

        if (config.useTFJS && params.interpolation === InterpolationTypes.INTER_ESPCN) {
            console.log("TFJS");

            // EXTRACT Y with WASM(TFLITE)
            this.tflite!.HEAPU8.set(imageData.data, this.tflite!._getInputImageBufferOffset());
            this.tflite!._extractY(params.inputWidth, params.inputHeight);
            const YBufferOffset = this.tflite!._getYBufferOffset();
            const Y = this.tflite!.HEAPU8.slice(YBufferOffset, YBufferOffset + params.inputWidth * params.inputHeight);

            // Super Resolution with TFJS
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
                    let prediction = this.tfjsModel!.predict(tensor) as tf.Tensor;
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

            // Merge Y with Other channels
            const scaledYBufferOffset = this.tflite!._getScaledYBufferOffset();
            this.tflite!.HEAPU8.set(scaledY, scaledYBufferOffset);
            this.tflite!._mergeY(params.inputWidth, params.inputHeight, resizedWidth, resizedHeight);
            const outputImageBufferOffset = this.tflite!._getOutputImageBufferOffset();
            return this.tflite!.HEAPU8.slice(outputImageBufferOffset, outputImageBufferOffset + resizedWidth * resizedHeight * 4);
        } else {
            this.tflite!.HEAPU8.set(imageData.data, this.tflite!._getInputImageBufferOffset());
            this.tflite!._exec(params.inputWidth, params.inputHeight, params.interpolation);
            const outputImageBufferOffset = this.tflite!._getOutputImageBufferOffset();
            const resizedWidth = params.inputWidth * config.scaleFactor[config.modelKey];
            const resizedHeight = params.inputHeight * config.scaleFactor[config.modelKey];
            return this.tflite!.HEAPU8.slice(outputImageBufferOffset, outputImageBufferOffset + resizedWidth * resizedHeight * 4);
        }
    };
}

export class SuperResolutionWorkerManager {
    private workerBSL: Worker | null = null;
    orgCanvas = document.createElement("canvas"); // to resize canvas for WebWorker

    private config = generateSuperResolutionDefaultConfig();
    private localWorker = new LocalWorker();
    init = async (config: SuperResolutionConfig | null) => {
        if (config != null) {
            this.config = config;
        }
        if (this.workerBSL) {
            this.workerBSL.terminate();
        }
        this.workerBSL = null;

        //// Local
        if (this.config.processOnLocal == true) {
            await this.localWorker.init(this.config!);
            return;
        }

        //// Remote
        const workerBSL: Worker = new workerJs();
        console.log("[manager] send initialize request");
        workerBSL!.postMessage({
            message: WorkerCommand.INITIALIZE,
            config: this.config,
        });
        const p = new Promise<void>((onResolve, onFail) => {
            workerBSL!.onmessage = (event) => {
                console.log("[manager] receive event", event);
                if (event.data.message === WorkerResponse.INITIALIZED) {
                    console.log("WORKERSS INITIALIZED");
                    this.workerBSL = workerBSL;
                    onResolve();
                } else {
                    console.log("opencv Initialization something wrong..");
                    onFail(event);
                }
            };
        });
        await p;
        return;
    };

    predict = async (src: HTMLCanvasElement | HTMLImageElement | HTMLVideoElement, params = generateDefaultSuperResolutionParams()) => {
        //// (0) If select canvas as interpolationType, return here
        if (params.interpolation === InterpolationTypes.CANVAS) {
            const scaleFactor = this.config.scaleFactor[this.config.modelKey];
            this.orgCanvas.width = params.inputWidth * scaleFactor;
            this.orgCanvas.height = params.inputHeight * scaleFactor;
            const orgCanvasCtx = this.orgCanvas.getContext("2d")!;
            orgCanvasCtx.drawImage(src, 0, 0, this.orgCanvas.width, this.orgCanvas.height);
            const imageData = orgCanvasCtx.getImageData(0, 0, this.orgCanvas.width, this.orgCanvas.height);
            return imageData.data;
        }

        //// (1) generate input imagedata
        this.orgCanvas.width = params.inputWidth;
        this.orgCanvas.height = params.inputHeight;
        const orgCanvasCtx = this.orgCanvas.getContext("2d")!;
        orgCanvasCtx.drawImage(src, 0, 0, this.orgCanvas.width, this.orgCanvas.height);
        const imageData = orgCanvasCtx.getImageData(0, 0, this.orgCanvas.width, this.orgCanvas.height);

        //// (2) Local or Safari
        if (this.config.processOnLocal == true || this.config.browserType === BrowserType.SAFARI) {
            const res = await this.localWorker.predict(imageData, this.config, params);
            return res;
        }

        //// (3) WebWorker
        /////// (3-1) Not initilaized return.
        if (!this.workerBSL) {
            return null;
        }
        /////// worker is initialized.
        ///// (3-2) send data
        const uid = performance.now();
        this.workerBSL!.postMessage(
            {
                message: WorkerCommand.PREDICT,
                uid: uid,
                config: this.config,
                params: params,
                imageData: imageData,
            },
            [imageData.data.buffer]
        );

        ///// (3-3) recevie message
        const p = new Promise<Uint8Array>((resolve, reject) => {
            this.workerBSL!.onmessage = (event) => {
                if (event.data.message === WorkerResponse.PREDICTED && event.data.uid === uid) {
                    const prediction = event.data.prediction as Uint8Array;
                    resolve(prediction);
                } else {
                    //// Only Drop the request...
                    console.log("something wrong..", event, event.data.message);
                    const prediction = event.data.prediction as Uint8Array;
                    resolve(prediction);
                    // reject()
                }
            };
        });
        const res = await p;
        return res;
    };
}
