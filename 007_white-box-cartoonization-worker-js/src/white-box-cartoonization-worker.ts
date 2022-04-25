import { WorkerResponse, WorkerCommand, CartoonConfig, CartoonOperationParams, CartoonFunctionTypes, BackendTypes } from "./const";
import * as tf from "@tensorflow/tfjs";
import { setWasmPaths } from "@tensorflow/tfjs-backend-wasm";

export { CartoonConfig, CartoonOperationParams, BackendTypes } from "./const";

// @ts-ignore
import workerJs from "worker-loader?inline=no-fallback!./white-box-cartoonization-worker-worker.ts";

// @ts-ignore
import modelJson from "../resources/white-box-cartoonization/model.json";
// @ts-ignore
import modelWeight from "../resources/white-box-cartoonization/group1-shard1of1.bin";
import { getBrowserType, LocalWorker, WorkerManagerBase } from "@dannadori/000_WorkerBase";

export const generateCartoonDefaultConfig = (): CartoonConfig => {
    const defaultConf: CartoonConfig = {
        browserType: getBrowserType(),
        processOnLocal: false,
        backendType: BackendTypes.WebGL,
        wasmPaths: {
            "tfjs-backend-wasm.wasm": "/tfjs-backend-wasm.wasm",
            "tfjs-backend-wasm-simd.wasm": "/tfjs-backend-wasm-simd.wasm",
            "tfjs-backend-wasm-threaded-simd.wasm": "/tfjs-backend-wasm-threaded-simd.wasm",
        },
        pageUrl: window.location.href,
        modelJson: modelJson,
        modelWeight: modelWeight,
    };
    return defaultConf;
};

export const generateDefaultCartoonParams = (): CartoonOperationParams => {
    const defaultParams: CartoonOperationParams = {
        type: CartoonFunctionTypes.Cartoon,
        processWidth: 320,
        processHeight: 320,
    };
    return defaultParams;
};

export class LocalCT extends LocalWorker {
    model: tf.GraphModel | null = null;
    canvas = document.createElement("canvas");

    load_module = async (config: CartoonConfig) => {
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
    init = async (config: CartoonConfig) => {
        await this.load_module(config);
        await tf.ready();
        tf.env().set("WEBGL_CPU_FORWARD", false);

        const modelJson2 = new File([config.modelJson], "model.json", {
            type: "application/json",
        });
        const b = Buffer.from(config.modelWeight.split(",")[1], "base64");
        const modelWeights = new File([b], "group1-shard1of1.bin");
        this.model = await tf.loadGraphModel(tf.io.browserFiles([modelJson2, modelWeights]));
    };

    // outputArray: Uint8ClampedArray | null = null;
    predict = async (config: CartoonConfig, params: CartoonOperationParams, targetCanvas: HTMLCanvasElement) => {
        let outputArray: Uint8ClampedArray | null = null;
        tf.tidy(() => {
            let tensor = tf.browser.fromPixels(targetCanvas);
            tensor = tf.sub(tensor.expandDims(0).div(127.5), 1);
            let prediction = this.model!.predict(tensor) as tf.Tensor;

            const alpha = tf.ones([1, params.processWidth, params.processHeight, 1]);
            prediction = tf.concat([prediction, alpha], 3);
            prediction = tf.add(prediction, 1);
            prediction = tf.mul(prediction, 127.5);
            prediction = prediction.flatten();
            prediction = tf.cast(prediction, "int32");
            prediction = tf.squeeze(prediction as tf.Tensor);
            let imgArray = prediction.arraySync() as number[];
            outputArray = new Uint8ClampedArray(imgArray.length);
            outputArray.set(imgArray);
            // const outputImage = new ImageData(imgArray2, this.canvas.width, this.canvas.height);
            // ctx.putImageData(outputImage, 0, 0);
        });

        return outputArray;
    };
}

export class CartoonWorkerManager extends WorkerManagerBase {
    private config = generateCartoonDefaultConfig();
    localWorker = new LocalCT();

    init = async (config: CartoonConfig | null) => {
        this.config = config || generateCartoonDefaultConfig();
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
    predict = async (params: CartoonOperationParams, targetCanvas: HTMLCanvasElement) => {
        const currentParams = { ...params };
        const resizedCanvas = this.generateTargetCanvas(targetCanvas, currentParams.processWidth, currentParams.processHeight);
        if (!this.worker) {
            const prediction = await this.localWorker.predict(this.config, currentParams, resizedCanvas);
            return prediction;
        }
        const imageData = resizedCanvas.getContext("2d")!.getImageData(0, 0, resizedCanvas.width, resizedCanvas.height);
        const prediction = (await this.sendToWorker(currentParams, imageData.data)) as Uint8ClampedArray | null;
        return prediction;
    };
}
