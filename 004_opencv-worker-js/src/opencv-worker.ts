import { BrowserType, getBrowserType } from "./BrowserUtil";
import { OpenCVConfig, OpenCVOperatipnParams, OpenCVProcessTypes, Wasm, WorkerCommand, WorkerResponse } from "./const";

export { OpenCVConfig, OpenCVOperatipnParams, OpenCVProcessTypes } from "./const";
export { BrowserType, getBrowserType } from "./BrowserUtil";

// @ts-ignore
import opencvWasm from "../resources/custom_opencv.wasm";
// @ts-ignore
import opencvWasmSimd from "../resources/custom_opencv-simd.wasm";

// @ts-ignore
import workerJs from "worker-loader?inline=no-fallback!./opencv-worker-worker.ts";

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

export const generateDefaultOpenCVParams = (): OpenCVOperatipnParams => {
    const defaultParams: OpenCVOperatipnParams = {
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

export class LocalCV {
    opencvLoaded = false;
    wasm: Wasm | null = null;
    init = async (config: OpenCVConfig) => {
        const browserType = getBrowserType();
        if (config.useSimd && browserType !== BrowserType.SAFARI) {
            const modSimd = require("../resources/custom_opencv-simd.js");
            const b = Buffer.from(config.wasmSimdBase64!, "base64");
            this.wasm = await modSimd({ wasmBinary: b });
        } else {
            const mod = require("../resources/custom_opencv.js");
            const b = Buffer.from(config.wasmBase64!, "base64");
            this.wasm = await mod({ wasmBinary: b });
        }
    };

    predict = async (data: Uint8ClampedArray, config: OpenCVConfig, params: OpenCVOperatipnParams) => {
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

export class OpenCVWorkerManager {
    private workerCV: Worker | null = null;
    tmpCanvas = document.createElement("canvas");

    private config = generateOpenCVDefaultConfig();
    private localCV = new LocalCV();
    init = async (config: OpenCVConfig | null) => {
        if (config != null) {
            this.config = config;
        }
        if (this.workerCV) {
            this.workerCV.terminate();
        }
        this.workerCV = null;

        if (config!.processOnLocal === true) {
            this.localCV.init(config!);
            return;
        } else {
            const workerCV: Worker = new workerJs();
            workerCV!.postMessage({
                message: WorkerCommand.INITIALIZE,
                config: this.config,
            });

            const p = new Promise<void>((onResolve, onFail) => {
                workerCV!.onmessage = (event) => {
                    if (event.data.message === WorkerResponse.INITIALIZED) {
                        console.log("WORKERSS INITIALIZED");
                        this.workerCV = workerCV;
                        onResolve();
                    } else {
                        console.log("AsciiArt Initialization something wrong[1]..");
                        onFail(event);
                    }
                };
            });
            return p;
        }
    };

    predict = async (targetCanvas: HTMLCanvasElement, params = generateDefaultOpenCVParams()) => {
        this.tmpCanvas.width = params.processWidth;
        this.tmpCanvas.height = params.processHeight;
        const ctx = this.tmpCanvas.getContext("2d")!;
        ctx.drawImage(targetCanvas, 0, 0, this.tmpCanvas.width, this.tmpCanvas.height);
        const imageData = ctx.getImageData(0, 0, this.tmpCanvas.width, this.tmpCanvas.height);

        if (this.config.processOnLocal === true) {
            const prediction = await this.localCV.predict(imageData.data, this.config, params);
            return prediction;
        } else {
            if (!this.workerCV) {
                return null;
            }
            const uid = performance.now();
            this.workerCV!.postMessage(
                {
                    message: WorkerCommand.PREDICT,
                    uid: uid,
                    params: params,
                    data: imageData.data,
                },
                [imageData.data.buffer]
            );

            const p = new Promise((onResolve: (data: Uint8ClampedArray) => void, onFail) => {
                this.workerCV!.onmessage = (event) => {
                    if (event.data.message === WorkerResponse.PREDICTED) {
                        const data = event.data.converted as Uint8ClampedArray;
                        // for (let i = 0; i < data.length; i++) {
                        //     if (data[i] !== 255) {
                        //         console.log(data[i]);
                        //     }
                        // }
                        // console.log(data.length, params.processWidth, params.processHeight);
                        onResolve(data);
                    } else {
                        console.log("OpenCV something wrong[2]..", event.data.uid, uid);
                    }
                };
            });
            return p;
        }
    };
}
