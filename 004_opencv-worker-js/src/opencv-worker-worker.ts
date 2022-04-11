import { BrowserTypes } from "@dannadori/000_WorkerBase";
import { WorkerCommand, WorkerResponse, OpenCVConfig, OpenCVOperationParams, Wasm } from "./const";

export let Module = {};

const ctx: Worker = self as any; // eslint-disable-line no-restricted-globals
let wasm: Wasm | null = null;

const predict = async (config: OpenCVConfig, params: OpenCVOperationParams, data: Uint8ClampedArray) => {
    const inputImageBufferOffset = wasm!._getInputImageBufferOffset();
    wasm!.HEAPU8.set(data, inputImageBufferOffset);

    if (params.type === "Blur") {
        wasm!._blur(params.processWidth, params.processHeight, params.blurParams!.kernelSize);
    } else if (params.type === "GausianBlur") {
        wasm!._gaussianBlur(params.processWidth, params.processHeight, params.gausianBlurParams!.kernelSize, params.gausianBlurParams!.sigma);
    } else if (params.type === "Canny") {
        wasm!._canny(params.processWidth, params.processHeight, params.cannyParams!.threshold1, params.cannyParams!.threshold2, params.cannyParams!.apertureSize, params.cannyParams!.L2gradient);
    }

    const outputImageBufferOffset = wasm!._getOutputImageBufferOffset();
    const converted = new ImageData(new Uint8ClampedArray(wasm!.HEAPU8.slice(outputImageBufferOffset, outputImageBufferOffset + params.processWidth * params.processHeight * 4)), params.processWidth, params.processHeight);

    return converted.data;
};

onmessage = async (event) => {
    // console.log("event", event);
    if (event.data.message === WorkerCommand.INITIALIZE) {
        const config = event.data.config as OpenCVConfig;
        if (config.useSimd) {
            const modSimd = require("../resources/custom_opencv-simd.js");
            const b = Buffer.from(config.wasmSimdBase64!, "base64");
            wasm = await modSimd({ wasmBinary: b });
        } else {
            const mod = require("../resources/custom_opencv.js");
            const b = Buffer.from(config.wasmBase64!, "base64");
            wasm = await mod({ wasmBinary: b });
        }

        console.log("initialized opencv worker");
        ctx.postMessage({ message: WorkerResponse.INITIALIZED });
    } else if (event.data.message === WorkerCommand.PREDICT) {
        const config: OpenCVConfig = event.data.config;
        const params: OpenCVOperationParams = event.data.params;

        const data: Uint8ClampedArray = event.data.data;
        const imageData = await predict(config, params, data);
        ctx.postMessage(
            {
                message: WorkerResponse.PREDICTED,
                prediction: imageData,
            },
            [imageData.buffer]
        );
    }
};

module.exports = [ctx];
