
import * as tf from "@tensorflow/tfjs";
import { MODNetConfig, MODNetFunctionTypes, MODNetOperationParams, WorkerCommand, WorkerResponse, MODEL_INPUT_SIZES, BackendTypes } from "./const";
import { setWasmPath, setWasmPaths } from "@tensorflow/tfjs-backend-wasm";

export { MODNetConfig, MODNetOperationParams, MODEL_INPUT_SIZES, BackendTypes  };


// @ts-ignore
import workerJs from "worker-loader?inline=no-fallback!./modnet-worker-worker.ts";

// @ts-ignore
import modelJson_192 from `../resources/webcam_16/192/model.json`;
// @ts-ignore
import modelWeight_192 from `../resources/webcam_16/192/group1-shard1of1.bin`;

// @ts-ignore
import modelJson_256 from `../resources/webcam_16/256/model.json`;
// @ts-ignore
import modelWeight_256 from `../resources/webcam_16/256/group1-shard1of1.bin`;

// @ts-ignore
import modelJson_512 from `../resources/webcam_16/512/model.json`;
// @ts-ignore
import modelWeight_512 from `../resources/webcam_16/512/group1-shard1of1.bin`;
import { getBrowserType, LocalWorker, WorkerManagerBase } from "@dannadori/000_WorkerBase";


export const generateMODNetDefaultConfig = (): MODNetConfig => {
    const defaultConf: MODNetConfig = {
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
            "192x192":modelJson_192,
            "256x256":modelJson_256,
            "512x512":  modelJson_512,
        },
        modelWeight: {
            "192x192":modelWeight_192,
            "256x256": modelWeight_256,
            "512x512": modelWeight_512,
        },
        modelInputs: {
            "192x192": [192, 192],
            "256x256": [256, 256],
            "512x512": [512, 512],
        },
        modelKey: "192x192",

    };
    return defaultConf;
};

export const generateDefaultMODNetParams = (): MODNetOperationParams => {
    const defaultParams: MODNetOperationParams = {
        type: MODNetFunctionTypes.Segmentation,
        processWidth: 256,
        processHeight: 256,
    };
    return defaultParams;
};


export class WorkerMD  extends LocalWorker{
    model: tf.GraphModel | null = null;
    canvas = document.createElement("canvas");
    load_module = async (config:  MODNetConfig) => {
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
    init = async (config: MODNetConfig) => {
        await this.load_module(config)
        await  tf.ready()
        tf.env().set("WEBGL_CPU_FORWARD", false);
        const modelJson = new File([config.modelJson[config.modelKey]], "model.json", { type: "application/json" });
        const weight = Buffer.from(config.modelWeight[config.modelKey].split(",")[1], "base64");
        const modelWeights = new File([weight], "group1-shard1of1.bin");
        this.model = await tf.loadGraphModel(tf.io.browserFiles([modelJson, modelWeights]));
    };

    predict = async (config: MODNetConfig, params: MODNetOperationParams,targetCanvas: HTMLCanvasElement): Promise<number[][]> => {
        let bm: number[][];
        tf.tidy(() => {
            let tensor = tf.browser.fromPixels(targetCanvas);
            tensor = tensor.expandDims(0);
            tensor = tf.cast(tensor, "float32");
            tensor = tensor.div(tf.max(tensor));
            tensor = tensor.sub(0.485).div(0.229);
            let prediction = this.model!.predict(tensor) as tf.Tensor;
            bm = prediction.reshape([params.processWidth, params.processHeight]).arraySync() as number[][];
        });
        return bm!;
    };
}

export class MODNetWorkerManager extends WorkerManagerBase {
    private config = generateMODNetDefaultConfig();
    localWorker= new WorkerMD();

    init = async (config: MODNetConfig | null) => {
        this.config = config ||generateMODNetDefaultConfig();
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

    predict = async (params: MODNetOperationParams, targetCanvas: HTMLCanvasElement) => {
        const currentParams = { ...params };
        currentParams.processWidth = this.config.modelInputs[this.config.modelKey][0];
        currentParams.processHeight = this.config.modelInputs[this.config.modelKey][1];
        const resizedCanvas = this.generateTargetCanvas(targetCanvas, currentParams.processWidth, currentParams.processHeight);
        if (!this.worker) {
            const prediction = await this.localWorker.predict(this.config, currentParams, resizedCanvas);
            return prediction;
        }
        const imageData = resizedCanvas.getContext("2d")!.getImageData(0, 0, resizedCanvas.width, resizedCanvas.height);
        const prediction = (await this.sendToWorker(this.config, currentParams, imageData.data)) as number[][] | null;

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
