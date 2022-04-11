import { OpenCVConfig, OpenCVOperationParams, OpenCVProcessTypes, Wasm } from "./const";
export { OpenCVConfig, OpenCVOperationParams, OpenCVProcessTypes } from "./const";

// @ts-ignore
import opencvWasm from "../resources/custom_opencv.wasm";
// @ts-ignore
import opencvWasmSimd from "../resources/custom_opencv-simd.wasm";

// @ts-ignore
import workerJs from "worker-loader?inline=no-fallback!./opencv-worker-worker.ts";
import { BrowserTypes, getBrowserType, LocalWorker, WorkerManagerBase } from "@dannadori/000_WorkerBase";

export const generateOpenCVDefaultConfig = (): OpenCVConfig => {
    const defaultConf: OpenCVConfig = {
        browserType: getBrowserType(),
        processOnLocal: true,
        wasmBase64: opencvWasm.split(",")[1],
        wasmSimdBase64: opencvWasmSimd.split(",")[1],
        useSimd: false,
    };
    return defaultConf;
};

export const generateDefaultOpenCVParams = (): OpenCVOperationParams => {
    const defaultParams: OpenCVOperationParams = {
        type: OpenCVProcessTypes.Blur,
        cannyParams: {
            threshold1: 50,
            threshold2: 100,
            apertureSize: 3,
            L2gradient: false,
            bitwiseNot: true,
        },
        blurParams: {
            kernelSize: 10,
        },
        gausianBlurParams: {
            kernelSize: 10,
            sigma: 10,
        },
        processWidth: 300,
        processHeight: 300,
    };
    return defaultParams;
};

export class LocalCV extends LocalWorker {
    opencvLoaded = false;
    wasm: Wasm | null = null;
    init = async (config: OpenCVConfig) => {
        const browserType = getBrowserType();
        if (config.useSimd && browserType !== BrowserTypes.SAFARI) {
            const modSimd = require("../resources/custom_opencv-simd.js");
            const b = Buffer.from(config.wasmSimdBase64!, "base64");
            this.wasm = await modSimd({ wasmBinary: b });
        } else {
            const mod = require("../resources/custom_opencv.js");
            const b = Buffer.from(config.wasmBase64!, "base64");
            this.wasm = await mod({ wasmBinary: b });
        }
    };

    predict = async (config: OpenCVConfig, params: OpenCVOperationParams, data: Uint8ClampedArray) => {
        if (!this.wasm) {
            return null;
        }
        const inputImageBufferOffset = this.wasm._getInputImageBufferOffset();

        this.wasm!.HEAPU8.set(data, inputImageBufferOffset);

        if (params.type === "Blur") {
            this.wasm._blur(params.processWidth, params.processHeight, params.blurParams!.kernelSize);
        } else if (params.type === "GausianBlur") {
            this.wasm._gaussianBlur(params.processWidth, params.processHeight, params.gausianBlurParams!.kernelSize, params.gausianBlurParams!.sigma);
        } else if (params.type === "Canny") {
            this.wasm._canny(params.processWidth, params.processHeight, params.cannyParams!.threshold1, params.cannyParams!.threshold2, params.cannyParams!.apertureSize, params.cannyParams!.L2gradient);
        }

        const outputImageBufferOffset = this.wasm!._getOutputImageBufferOffset();
        const converted = new ImageData(new Uint8ClampedArray(this.wasm!.HEAPU8.slice(outputImageBufferOffset, outputImageBufferOffset + params.processWidth * params.processHeight * 4)), params.processWidth, params.processHeight);

        return converted.data;
    };
}

export class OpenCVWorkerManager extends WorkerManagerBase {
    private workerCV: Worker | null = null;
    tmpCanvas = document.createElement("canvas");

    private config = generateOpenCVDefaultConfig();
    localWorker = new LocalCV();
    init = async (config: OpenCVConfig | null = null) => {
        this.config = config || generateOpenCVDefaultConfig();
        await this.initCommon(
            {
                useWorkerForSafari: true,
                processOnLocal: this.config.processOnLocal,
                workerJs: () => {
                    return new workerJs();
                },
            },
            config
        );
        return;
    };

    predict = async (params: OpenCVOperationParams, targetCanvas: HTMLCanvasElement) => {
        const currentParams = { ...params };
        const resizedCanvas = this.generateTargetCanvas(targetCanvas, currentParams.processWidth, currentParams.processHeight);
        const imageData = resizedCanvas.getContext("2d")!.getImageData(0, 0, resizedCanvas.width, resizedCanvas.height);
        if (!this.worker) {
            const prediction = await this.localWorker.predict(this.config, currentParams, imageData.data);
            return prediction;
        }
        const prediction = (await this.sendToWorker(this.config, currentParams, imageData.data)) as Uint8ClampedArray | null;
        return prediction;
    };
}
