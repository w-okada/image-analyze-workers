import { BackendTypes, InterpolationTypes, SuperResolutionConfig, SuperResolutionOperationParams, TFLite } from "./const";
import { setWasmPaths } from "@tensorflow/tfjs-backend-wasm";
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
import { BrowserTypes, getBrowserType, LocalWorker, WorkerManagerBase } from "@dannadori/000_WorkerBase";

export const generateSuperResolutionDefaultConfig = (): SuperResolutionConfig => {
    const defaultConf: SuperResolutionConfig = {
        browserType: getBrowserType(),
        processOnLocal: true,
        backendType: BackendTypes.WebGL,
        wasmPaths: {
            "tfjs-backend-wasm.wasm": "/tfjs-backend-wasm.wasm",
            "tfjs-backend-wasm-simd.wasm": "/tfjs-backend-wasm-simd.wasm",
            "tfjs-backend-wasm-threaded-simd.wasm": "/tfjs-backend-wasm-threaded-simd.wasm",
        },
        pageUrl: window.location.href,

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
        modelKey: "x2",
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
        processWidth: 128,
        processHeight: 128,
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

export class LocalSR extends LocalWorker {
    mod: any;
    modSIMD: any;
    inputCanvas = document.createElement("canvas");
    resultArray: number[] = Array<number>(300 * 300);

    tflite: TFLite | null = null;
    tfjsModel: tf.LayersModel | null = null;

    ready = false; // TBD: to be more strict for critical section

    load_module = async (config: SuperResolutionConfig) => {
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

    init = async (config: SuperResolutionConfig) => {
        this.ready = false;

        this.tfjsModel = null;
        this.tflite = null;

        if (config.useTFJS) {
            /// (x) Tensorflow JS
            await this.load_module(config);
            await tf.ready();
            tf.env().set("WEBGL_CPU_FORWARD", false);

            const modelJson = new File([config.modelJson[config.modelKey]], "model.json", { type: "application/json" });
            const weight = Buffer.from(config.modelWeight[config.modelKey].split(",")[1], "base64");
            const modelWeights = new File([weight], "group1-shard1of1.bin");
            this.tfjsModel = await tf.loadLayersModel(tf.io.browserFiles([modelJson, modelWeights]));
        }

        /// (x) TensorflowLite (always loaded for interpolutions.)
        const browserType = getBrowserType();
        if (config.useSimd && browserType !== BrowserTypes.SAFARI) {
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

    predict = async (config: SuperResolutionConfig, params: SuperResolutionOperationParams, targetCanvas: HTMLCanvasElement) => {
        if (!this.tflite) {
            return null;
        }

        if (!this.ready) {
            return null;
        }

        const imageData = targetCanvas.getContext("2d")!.getImageData(0, 0, targetCanvas.width, targetCanvas.height);
        if (config.useTFJS && params.interpolation === InterpolationTypes.INTER_ESPCN) {
            // EXTRACT Y with WASM(TFLITE)
            this.tflite!.HEAPU8.set(imageData.data, this.tflite!._getInputImageBufferOffset());
            this.tflite!._extractY(params.processWidth, params.processHeight);
            const YBufferOffset = this.tflite!._getYBufferOffset();
            const Y = this.tflite!.HEAPU8.slice(YBufferOffset, YBufferOffset + params.processWidth * params.processHeight);

            // Super Resolution with TFJS
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
                    let prediction = this.tfjsModel!.predict(tensor) as tf.Tensor;
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

            // Merge Y with Other channels
            const scaledYBufferOffset = this.tflite!._getScaledYBufferOffset();
            this.tflite!.HEAPU8.set(scaledY, scaledYBufferOffset);
            this.tflite!._mergeY(params.processWidth, params.processHeight, resizedWidth, resizedHeight);
            const outputImageBufferOffset = this.tflite!._getOutputImageBufferOffset();
            return this.tflite!.HEAPU8.slice(outputImageBufferOffset, outputImageBufferOffset + resizedWidth * resizedHeight * 4);
        } else {
            this.tflite!.HEAPU8.set(imageData.data, this.tflite!._getInputImageBufferOffset());
            this.tflite!._exec(params.processWidth, params.processHeight, params.interpolation);
            const outputImageBufferOffset = this.tflite!._getOutputImageBufferOffset();
            const resizedWidth = params.processWidth * config.scaleFactor[config.modelKey];
            const resizedHeight = params.processHeight * config.scaleFactor[config.modelKey];
            return this.tflite!.HEAPU8.slice(outputImageBufferOffset, outputImageBufferOffset + resizedWidth * resizedHeight * 4);
        }
    };
}

export class SuperResolutionWorkerManager extends WorkerManagerBase {
    private config = generateSuperResolutionDefaultConfig();
    localWorker = new LocalSR();
    private orgCanvas = document.createElement("canvas");

    init = async (config: SuperResolutionConfig | null) => {
        this.config = config || generateSuperResolutionDefaultConfig();
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

    predict = async (params = generateDefaultSuperResolutionParams(), src: HTMLCanvasElement | HTMLImageElement | HTMLVideoElement) => {
        //// (0) If select canvas as interpolationType, return here
        if (params.interpolation === InterpolationTypes.CANVAS) {
            const scaleFactor = this.config.scaleFactor[this.config.modelKey];
            this.orgCanvas.width = params.processWidth * scaleFactor;
            this.orgCanvas.height = params.processHeight * scaleFactor;
            const orgCanvasCtx = this.orgCanvas.getContext("2d")!;
            orgCanvasCtx.drawImage(src, 0, 0, this.orgCanvas.width, this.orgCanvas.height);
            const imageData = orgCanvasCtx.getImageData(0, 0, this.orgCanvas.width, this.orgCanvas.height);
            return imageData.data;
        }

        //// (1) generate input imagedata
        this.orgCanvas.width = params.processWidth;
        this.orgCanvas.height = params.processHeight;
        const orgCanvasCtx = this.orgCanvas.getContext("2d")!;
        orgCanvasCtx.drawImage(src, 0, 0, this.orgCanvas.width, this.orgCanvas.height);

        if (!this.worker) {
            const prediction = await this.localWorker.predict(this.config, params, this.orgCanvas);
            return prediction;
        }

        const imageData = orgCanvasCtx.getImageData(0, 0, this.orgCanvas.width, this.orgCanvas.height);
        const prediction = (await this.sendToWorker(this.config, params, imageData.data)) as Uint8ClampedArray;
        return prediction;
    };
}
