import * as tf from "@tensorflow/tfjs";
import { U2NetPortraitConfig, U2NetPortraitOperationParams, BackendTypes, U2NetPortraitFunctionTypes } from "./const";
import { setWasmPaths } from "@tensorflow/tfjs-backend-wasm";
export { U2NetPortraitConfig, U2NetPortraitOperationParams, BackendTypes };

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
// // @ts-ignore
// import modelJson_p4_256_float16 from "../resources/used_model_2021_11_02/itr640000_acc0.085795_p4/256/web_model_float16/model.json";
// // @ts-ignore
// import modelWeight_p4_256_float16 from "../resources/used_model_2021_11_02/itr640000_acc0.085795_p4/256/web_model_float16/group1-shard1of1.bin";
// // @ts-ignore
// import modelJson_p4_256_float32 from "../resources/used_model_2021_11_02/itr640000_acc0.085795_p4/256/web_model_float32/model.json";
// // @ts-ignore
// import modelWeight_p4_256_float32 from "../resources/used_model_2021_11_02/itr640000_acc0.085795_p4/256/web_model_float32/group1-shard1of1.bin";

// @ts-ignore
import modelJson_p4_320_uint8 from "../resources/used_model_2021_11_02/itr640000_acc0.085795_p4/320/web_model_uint8/model.json";
// @ts-ignore
import modelWeight_p4_320_uint8 from "../resources/used_model_2021_11_02/itr640000_acc0.085795_p4/320/web_model_uint8/group1-shard1of1.bin";
// @ts-ignore
// import modelJson_p4_320_float16 from "../resources/used_model_2021_11_02/itr640000_acc0.085795_p4/320/web_model_float16/model.json";
// // @ts-ignore
// import modelWeight_p4_320_float16 from "../resources/used_model_2021_11_02/itr640000_acc0.085795_p4/320/web_model_float16/group1-shard1of1.bin";
// // @ts-ignore
// import modelJson_p4_320_float32 from "../resources/used_model_2021_11_02/itr640000_acc0.085795_p4/320/web_model_float32/model.json";
// // @ts-ignore
// import modelWeight_p4_320_float32 from "../resources/used_model_2021_11_02/itr640000_acc0.085795_p4/320/web_model_float32/group1-shard1of1.bin";
import { getBrowserType, LocalWorker, WorkerManagerBase } from "@dannadori/worker-base";

export const generateU2NetPortraitDefaultConfig = (): U2NetPortraitConfig => {
    const defaultConf: U2NetPortraitConfig = {
        browserType: getBrowserType(),
        processOnLocal: false,
        backendType: BackendTypes.WebGL,
        wasmPaths: {
            "tfjs-backend-wasm.wasm": "/tfjs-backend-wasm.wasm",
            "tfjs-backend-wasm-simd.wasm": "/tfjs-backend-wasm-simd.wasm",
            "tfjs-backend-wasm-threaded-simd.wasm": "/tfjs-backend-wasm-threaded-simd.wasm",
        },
        pageUrl: window.location.href,
        modelJson: {
            "256_uint8": modelJson_p4_256_uint8,
            // "256_float16": modelJson_p4_256_float16,
            // "256_float32": modelJson_p4_256_float32,
            "320_uint8": modelJson_p4_320_uint8,
            // "320_float16": modelJson_p4_320_float16,
            // "320_float32": modelJson_p4_320_float32,
        },
        modelWeight: {
            "256_uint8": modelWeight_p4_256_uint8,
            // "256_float16": modelWeight_p4_256_float16,
            // "256_float32": modelWeight_p4_256_float32,
            "320_uint8": modelWeight_p4_320_uint8,
            // "320_float16": modelWeight_p4_320_float16,
            // "320_float32": modelWeight_p4_320_float32,
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
        type: U2NetPortraitFunctionTypes.Portrait,
        processWidth: 320,
        processHeight: 320,
    };
    return defaultParams;
};

export class WorkerU2 extends LocalWorker {
    model: tf.GraphModel | null = null;
    canvas = document.createElement("canvas");

    load_module = async (config: U2NetPortraitConfig) => {
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

    init = async (config: U2NetPortraitConfig) => {
        await this.load_module(config);
        await tf.ready();
        await tf.env().set("WEBGL_CPU_FORWARD", false);
        const modelJson = new File([config.modelJson[config.modelKey]], "model.json", { type: "application/json" });
        const weight = Buffer.from(config.modelWeight[config.modelKey].split(",")[1], "base64");
        const modelWeights = new File([weight], "group1-shard1of1.bin");
        this.model = await tf.loadGraphModel(tf.io.browserFiles([modelJson, modelWeights]));
    };

    predict = async (config: U2NetPortraitConfig, params: U2NetPortraitOperationParams, targetCanvas: HTMLCanvasElement): Promise<number[][]> => {
        const imageData = targetCanvas.getContext("2d")!.getImageData(0, 0, targetCanvas.width, targetCanvas.height);
        console.log("current backend[main thread]:", tf.getBackend(), params.processWidth, params.processHeight, targetCanvas.width, targetCanvas.height);
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

export class U2NetPortraitWorkerManager extends WorkerManagerBase {
    private config = generateU2NetPortraitDefaultConfig();
    localWorker = new WorkerU2();

    init = async (config: U2NetPortraitConfig | null) => {
        this.config = config || generateU2NetPortraitDefaultConfig();
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

    predict = async (params: U2NetPortraitOperationParams, targetCanvas: HTMLCanvasElement) => {
        const currentParams = { ...params };
        currentParams.processWidth = this.config.modelInputs[this.config.modelKey][0];
        currentParams.processHeight = this.config.modelInputs[this.config.modelKey][1];
        const resizedCanvas = this.generateTargetCanvas(targetCanvas, currentParams.processWidth, currentParams.processHeight);
        if (!this.worker) {
            const prediction = await this.localWorker.predict(this.config, currentParams, resizedCanvas);
            return prediction;
        }
        const imageData = resizedCanvas.getContext("2d")!.getImageData(0, 0, resizedCanvas.width, resizedCanvas.height);
        const prediction = (await this.sendToWorker(currentParams, imageData.data)) as number[][] | null;

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
