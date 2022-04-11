import * as tf from "@tensorflow/tfjs";
import { BisenetV2CelebAMaskConfig, BisenetV2CelebAMaskOperationParams, BisenetV2CelebAMaskFunctionTypes, WorkerCommand, WorkerResponse, BackendTypes } from "./const";
import { setWasmPath, setWasmPaths } from "@tensorflow/tfjs-backend-wasm";
export { BisenetV2CelebAMaskConfig, BisenetV2CelebAMaskOperationParams, BackendTypes };
// @ts-ignore
import workerJs from "worker-loader?inline=no-fallback!./bisenetv2-celebamask-worker-worker.ts";

// @ts-ignore
import modelJson from "../resources/bisenetv2-celebamask/model.json";
// @ts-ignore
import modelWeight1 from "../resources/bisenetv2-celebamask/group1-shard1of3.bin";
// @ts-ignore
import modelWeight2 from "../resources/bisenetv2-celebamask/group1-shard2of3.bin";
// @ts-ignore
import modelWeight3 from "../resources/bisenetv2-celebamask/group1-shard3of3.bin";
import { getBrowserType, LocalWorker, WorkerManagerBase } from "@dannadori/000_WorkerBase";

export const generateBisenetV2CelebAMaskDefaultConfig = (): BisenetV2CelebAMaskConfig => {
    const defaultConf: BisenetV2CelebAMaskConfig = {
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
        modelWeight1: modelWeight1,
        modelWeight2: modelWeight2,
        modelWeight3: modelWeight3,
    };
    return defaultConf;
};

export const generateDefaultBisenetV2CelebAMaskParams = (): BisenetV2CelebAMaskOperationParams => {
    const defaultParams: BisenetV2CelebAMaskOperationParams = {
        type: BisenetV2CelebAMaskFunctionTypes.Mask,
        processWidth: 256,
        processHeight: 256,
    };
    return defaultParams;
};

export class LocalCT extends LocalWorker {
    model: tf.GraphModel | null = null;
    canvas = document.createElement("canvas");

    load_module = async (config: BisenetV2CelebAMaskConfig) => {
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

    init = async (config: BisenetV2CelebAMaskConfig) => {
        await this.load_module(config);
        await tf.ready();
        tf.env().set("WEBGL_CPU_FORWARD", false);

        const modelJson2 = new File([config.modelJson], "model.json", { type: "application/json" });
        const b1 = Buffer.from(config.modelWeight1.split(",")[1], "base64");
        const modelWeights1 = new File([b1], "group1-shard1of3.bin");
        const b2 = Buffer.from(config.modelWeight2.split(",")[1], "base64");
        const modelWeights2 = new File([b2], "group1-shard2of3.bin");
        const b3 = Buffer.from(config.modelWeight3.split(",")[1], "base64");
        const modelWeights3 = new File([b3], "group1-shard3of3.bin");

        this.model = await tf.loadGraphModel(tf.io.browserFiles([modelJson2, modelWeights1, modelWeights2, modelWeights3]));
    };

    predict = async (config: BisenetV2CelebAMaskConfig, params: BisenetV2CelebAMaskOperationParams, targetCanvas: HTMLCanvasElement): Promise<number[][]> => {
        let bm: number[][];
        tf.tidy(() => {
            let tensor = tf.browser.fromPixels(targetCanvas);
            tensor = tf.sub(tensor.expandDims(0).div(127.5), 1);
            let prediction = this.model!.predict(tensor) as tf.Tensor;
            bm = prediction.arraySync() as number[][];
        });
        return bm!;
    };
}

export class BisenetV2CelebAMaskWorkerManager extends WorkerManagerBase {
    private config = generateBisenetV2CelebAMaskDefaultConfig();
    localWorker = new LocalCT();

    init = async (config: BisenetV2CelebAMaskConfig | null) => {
        this.config = config || generateBisenetV2CelebAMaskDefaultConfig();
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

    predict = async (params: BisenetV2CelebAMaskOperationParams, targetCanvas: HTMLCanvasElement) => {
        const currentParams = { ...params };
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
export const rainbow = [
    [110, 64, 170],
    [143, 61, 178],
    [178, 60, 178],
    [210, 62, 167],
    [238, 67, 149],
    [255, 78, 125],
    [255, 94, 99],
    [255, 115, 75],
    [255, 140, 56],
    [239, 167, 47],
    [217, 194, 49],
    [194, 219, 64],
    [175, 240, 91],
    [135, 245, 87],
    [96, 247, 96],
    [64, 243, 115],
    [40, 234, 141],
    [28, 219, 169],
    [26, 199, 194],
    [33, 176, 213],
    [47, 150, 224],
    [65, 125, 224],
    [84, 101, 214],
    [99, 81, 195],
];

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

            data[pix_offset + 0] = 128;
            data[pix_offset + 1] = rainbow[prediction[rowIndex][colIndex]][0];
            data[pix_offset + 2] = rainbow[prediction[rowIndex][colIndex]][1];
            data[pix_offset + 3] = rainbow[prediction[rowIndex][colIndex]][2];
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
