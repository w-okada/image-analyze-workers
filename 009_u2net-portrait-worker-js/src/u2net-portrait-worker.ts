import { getBrowserType, BrowserType } from "./BrowserUtil";
import * as tf from "@tensorflow/tfjs";
import { U2NetPortraitConfig, U2NetPortraitOperationParams, U2NetPortraitFunctionType, WorkerCommand, WorkerResponse } from "./const";
import { setWasmPath } from "@tensorflow/tfjs-backend-wasm";
export { U2NetPortraitConfig, U2NetPortraitOperationParams };

// @ts-ignore
import workerJs from "worker-loader?inline=no-fallback!./u2net-portrait-worker-worker.ts";

// // @ts-ignore
// import modelJson_p3_1 from "../resources/u2net-portrait_320_p3_1/model.json";
// // @ts-ignore
// import modelWeight_p3_1 from "../resources/u2net-portrait_320_p3_1/group1-shard1of1.bin";

// // @ts-ignore
// import modelJson_p4_1 from "../resources/u2net-portrait_320_p4_5/model.json";
// // @ts-ignore
// import modelWeight_p4_1 from "../resources/u2net-portrait_320_p4_5/group1-shard1of1.bin";

// @ts-ignore
import modelJson_p4_256_uint8 from "../resources/used_model_2021_11_02/itr640000_acc0.085795_p4/256/web_model_uint8/model.json";
// @ts-ignore
import modelWeight_p4_256_uint8 from "../resources/used_model_2021_11_02/itr640000_acc0.085795_p4/256/web_model_uint8/group1-shard1of1.bin";
// @ts-ignore
import modelJson_p4_256_float16 from "../resources/used_model_2021_11_02/itr640000_acc0.085795_p4/256/web_model_float16/model.json";
// @ts-ignore
import modelWeight_p4_256_float16 from "../resources/used_model_2021_11_02/itr640000_acc0.085795_p4/256/web_model_float16/group1-shard1of1.bin";
// @ts-ignore
import modelJson_p4_256_float32 from "../resources/used_model_2021_11_02/itr640000_acc0.085795_p4/256/web_model_float32/model.json";
// @ts-ignore
import modelWeight_p4_256_float32 from "../resources/used_model_2021_11_02/itr640000_acc0.085795_p4/256/web_model_float32/group1-shard1of1.bin";

// @ts-ignore
import modelJson_p4_320_uint8 from "../resources/used_model_2021_11_02/itr640000_acc0.085795_p4/320/web_model_uint8/model.json";
// @ts-ignore
import modelWeight_p4_320_uint8 from "../resources/used_model_2021_11_02/itr640000_acc0.085795_p4/320/web_model_uint8/group1-shard1of1.bin";
// @ts-ignore
import modelJson_p4_320_float16 from "../resources/used_model_2021_11_02/itr640000_acc0.085795_p4/320/web_model_float16/model.json";
// @ts-ignore
import modelWeight_p4_320_float16 from "../resources/used_model_2021_11_02/itr640000_acc0.085795_p4/320/web_model_float16/group1-shard1of1.bin";
// @ts-ignore
import modelJson_p4_320_float32 from "../resources/used_model_2021_11_02/itr640000_acc0.085795_p4/320/web_model_float32/model.json";
// @ts-ignore
import modelWeight_p4_320_float32 from "../resources/used_model_2021_11_02/itr640000_acc0.085795_p4/320/web_model_float32/group1-shard1of1.bin";

export const generateU2NetPortraitDefaultConfig = (): U2NetPortraitConfig => {
    const defaultConf: U2NetPortraitConfig = {
        browserType: getBrowserType(),
        processOnLocal: false,
        useTFWasmBackend: false,
        wasmPath: "/tfjs-backend-wasm.wasm",
        pageUrl: window.location.href,
        modelJson: {
            "256_uint8": modelJson_p4_256_uint8,
            "256_float16": modelJson_p4_256_float16,
            "256_float32": modelJson_p4_256_float32,
            "320_uint8": modelJson_p4_320_uint8,
            "320_float16": modelJson_p4_320_float16,
            "320_float32": modelJson_p4_320_float32,
        },
        modelWeight: {
            "256_uint8": modelWeight_p4_256_uint8,
            "256_float16": modelWeight_p4_256_float16,
            "256_float32": modelWeight_p4_256_float32,
            "320_uint8": modelWeight_p4_320_uint8,
            "320_float16": modelWeight_p4_320_float16,
            "320_float32": modelWeight_p4_320_float32,
        },
        modelInputs: {
            "256_uint8": [256, 256],
            "256_float16": [256, 256],
            "256_float32": [256, 256],
            "320_uint8": [320, 320],
            "320_float16": [320, 320],
            "320_float32": [320, 320],
        },
        modelKey: "320_float16",
    };
    return defaultConf;
};

export const generateDefaultU2NetPortraitParams = (): U2NetPortraitOperationParams => {
    const defaultParams: U2NetPortraitOperationParams = {
        type: U2NetPortraitFunctionType.Portrait,
        processWidth: 320,
        processHeight: 320,
    };
    return defaultParams;
};

const load_module = async (config: U2NetPortraitConfig) => {
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
    model: tf.GraphModel | null = null;
    canvas = document.createElement("canvas");
    // wasm: Wasm | null = null;
    init = async (config: U2NetPortraitConfig) => {
        const p = new Promise<void>((onResolve, onFail) => {
            load_module(config).then(() => {
                tf.ready().then(async () => {
                    tf.env().set("WEBGL_CPU_FORWARD", false);

                    const modelJson = new File([config.modelJson[config.modelKey]], "model.json", { type: "application/json" });
                    const weight = Buffer.from(config.modelWeight[config.modelKey].split(",")[1], "base64");
                    const modelWeights = new File([weight], "group1-shard1of1.bin");
                    this.model = await tf.loadGraphModel(tf.io.browserFiles([modelJson, modelWeights]));
                    onResolve();
                });
            });
        });
        return p;
    };

    predict = async (imageData: ImageData, config: U2NetPortraitConfig, params: U2NetPortraitOperationParams): Promise<number[][]> => {
        console.log("current backend[main thread]:", tf.getBackend());
        let bm: number[][];
        tf.tidy(() => {
            let tensor = tf.browser.fromPixels(imageData);
            tensor = tf.cast(tensor, "float32");

            tensor = tensor.div(255.0);
            let [r, g, b] = tf.split(tensor, 3, 2);
            r = r.sub(0.485).div(0.229);
            g = g.sub(0.456).div(0.224);
            b = b.sub(0.406).div(0.225);
            tensor = tf.concat([r, g, b], 2);
            tensor = tensor.expandDims(0);

            let prediction = this.model!.predict(tensor) as tf.Tensor;
            prediction = prediction.onesLike().sub(prediction);
            prediction = prediction.sub(prediction.min()).div(prediction.max().sub(prediction.min()));
            prediction = prediction.squeeze();
            bm = prediction.arraySync() as number[][];
        });
        return bm!;
    };
}

export class U2NetPortraitWorkerManager {
    private workerU2: Worker | null = null;
    private canvas = document.createElement("canvas");
    private config = generateU2NetPortraitDefaultConfig();
    private localWorker = new LocalWorker();
    init = async (config: U2NetPortraitConfig | null) => {
        if (config != null) {
            this.config = config;
        }
        if (this.workerU2) {
            this.workerU2.terminate();
        }
        this.workerU2 = null;

        if (this.config.processOnLocal == true) {
            await this.localWorker.init(this.config!);
            return;
        }

        // Bodypix 用ワーカー
        const workerU2: Worker = new workerJs();
        console.log("WORKER!!!!", workerU2);

        workerU2!.postMessage({
            message: WorkerCommand.INITIALIZE,
            config: this.config,
        });
        const p = new Promise<void>((onResolve, onFail) => {
            workerU2!.onmessage = (event) => {
                if (event.data.message === WorkerResponse.INITIALIZED) {
                    console.log("WORKERSS INITIALIZED");
                    this.workerU2 = workerU2;
                    onResolve();
                } else {
                    console.log("celeb a mask Initialization something wrong..");
                    onFail(event);
                }
            };
        });
        return p;
    };

    predict = async (targetCanvas: HTMLCanvasElement, params = generateDefaultU2NetPortraitParams()) => {
        this.canvas.width = params.processWidth;
        this.canvas.height = params.processHeight;
        const ctx = this.canvas.getContext("2d")!;
        ctx.drawImage(targetCanvas, 0, 0, this.canvas.width, this.canvas.height);
        const imageData = ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);

        if (this.config.processOnLocal == true) {
            // Case.1 Process on local thread.
            const prediction = await this.localWorker.predict(imageData, this.config, params);
            return prediction;
        }
        if (!this.workerU2) {
            return null;
        }

        if (this.config.browserType === BrowserType.SAFARI) {
            // Case.2 Process on worker thread, Safari (Send dataArray)
            const dataArray = imageData.data;
            const uid = performance.now();

            this.workerU2!.postMessage(
                {
                    message: WorkerCommand.PREDICT,
                    uid: uid,
                    config: this.config,
                    params: params,
                    data: dataArray,
                },
                [dataArray.buffer]
            );
            const p = new Promise((onResolve: (v: number[][]) => void, onFail) => {
                this.workerU2!.onmessage = (event) => {
                    if (event.data.message === WorkerResponse.PREDICTED && event.data.uid === uid) {
                        const prediction = event.data.prediction;
                        onResolve(prediction);
                    } else {
                        console.log("celeb a mask Prediction something wrong..");
                        onFail(event);
                    }
                };
            });
            return p;
        } else {
            // Case.3 Process on worker thread, Chrome (Send ImageBitmap)
            const dataArray = imageData.data;
            const uid = performance.now();
            this.workerU2!.postMessage(
                {
                    message: WorkerCommand.PREDICT,
                    uid: uid,
                    config: this.config,
                    params: params,
                    image: imageData,
                },
                [imageData.data.buffer]
            );
            const p = new Promise((onResolve: (v: number[][]) => void, onFail) => {
                this.workerU2!.onmessage = (event) => {
                    if (event.data.message === WorkerResponse.PREDICTED && event.data.uid === uid) {
                        const prediction = event.data.prediction;
                        onResolve(prediction);
                    } else {
                        console.log("celeb a mask Prediction something wrong..");
                        onFail(event);
                    }
                };
            });
            return p;
        }
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
            if (prediction[rowIndex][colIndex] > 0.005) {
                data[pix_offset + 0] = prediction[rowIndex][colIndex] * 255;
                data[pix_offset + 1] = prediction[rowIndex][colIndex] * 255;
                data[pix_offset + 2] = prediction[rowIndex][colIndex] * 255;
                data[pix_offset + 3] = 255;
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
