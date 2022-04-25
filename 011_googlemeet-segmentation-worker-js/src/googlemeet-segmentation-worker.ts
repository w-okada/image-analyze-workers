import { GoogleMeetSegmentationConfig, GoogleMeetSegmentationFunctionType, GoogleMeetSegmentationOperationParams, InterpolationTypes, PostProcessTypes, TFLite } from "./const";
import { BrowserTypes, getBrowserType, LocalWorker, WorkerManagerBase } from "@dannadori/000_WorkerBase";
export { GoogleMeetSegmentationSmoothingType, PostProcessTypes, InterpolationTypes, GoogleMeetSegmentationConfig, GoogleMeetSegmentationOperationParams } from "./const";

/// #if TFLITE_TARGET==="96x160"
// @ts-ignore
import tflite_96x160 from "../resources/tflite_models/96x160/segm_lite_v681.tflite.bin";

/// #elif TFLITE_TARGET==="128x128"
// @ts-ignore
import tflite_128x128 from "../resources/tflite_models/128x128/segm_lite_v509.tflite.bin";

/// #elif TFLITE_TARGET==="144x256"
// @ts-ignore
import tflite_144x256 from "../resources/tflite_models/144x256/segm_full_v679.tflite.bin";

/// #elif TFLITE_TARGET==="256x256"
// @ts-ignore
import tflite_256x256 from "../resources/tflite_models/256x256/segm_full_v1215.f16.tflite.bin";

/// #else
// @ts-ignore
import tflite_96x160 from "../resources/tflite_models/96x160/segm_lite_v681.tflite.bin";
// @ts-ignore
import tflite_128x128 from "../resources/tflite_models/128x128/segm_lite_v509.tflite.bin";
// @ts-ignore
import tflite_144x256 from "../resources/tflite_models/144x256/segm_full_v679.tflite.bin";
// @ts-ignore
import tflite_256x256 from "../resources/tflite_models/256x256/segm_full_v1215.f16.tflite.bin";

/// #endif

// @ts-ignore
import workerJs from "worker-loader?inline=no-fallback!./googlemeet-segmentation-worker-worker.ts";
// @ts-ignore
import wasm from "../resources/wasm/tflite.wasm";
// @ts-ignore
import wasmSimd from "../resources/wasm/tflite-simd.wasm";

export const generateGoogleMeetSegmentationDefaultConfig = (): GoogleMeetSegmentationConfig => {
    const defaultConf: GoogleMeetSegmentationConfig = {
        browserType: getBrowserType(),
        processOnLocal: false,
        wasmPaths: {
            "tfjs-backend-wasm.wasm": "/tfjs-backend-wasm.wasm",
            "tfjs-backend-wasm-simd.wasm": "/tfjs-backend-wasm-simd.wasm",
            "tfjs-backend-wasm-threaded-simd.wasm": "/tfjs-backend-wasm-threaded-simd.wasm",
        },
        modelTFLites: {},
        modelInputs: {},
        modelKey: "160x96",

        wasmBase64: wasm.split(",")[1],
        wasmSimdBase64: wasmSimd.split(",")[1],
        useSimd: false,
    };
    /// #if TFLITE_TARGET==="96x160"
    defaultConf.modelTFLites = {
        "160x96": tflite_96x160.split(",")[1],
    }
    defaultConf.modelInputs = {
        "160x96": [160, 96],
    }
    defaultConf.modelKey = "160x96"
    defaultConf.useSimd = true
    /// #elif TFLITE_TARGET==="128x128"
    defaultConf.modelTFLites = {
        "128x128": tflite_128x128.split(",")[1],
    }
    defaultConf.modelInputs = {
        "128x128": [128, 128],
    }
    defaultConf.modelKey = "128x128"
    defaultConf.useSimd = true
    /// #elif TFLITE_TARGET==="144x256"
    defaultConf.modelTFLites = {
        "256x144": tflite_144x256.split(",")[1],
    }
    defaultConf.modelInputs = {
        "256x144": [256, 144],
    }
    defaultConf.modelKey = "256x144"
    defaultConf.useSimd = true
    /// #elif TFLITE_TARGET==="256x256"
    defaultConf.modelTFLites = {
        "256x256": tflite_256x256.split(",")[1],
    }
    defaultConf.modelInputs = {
        "256x256": [256, 256],
    }
    defaultConf.modelKey = "256x256"
    defaultConf.useSimd = true
    /// #else  
    defaultConf.modelTFLites = {
        "160x96": tflite_96x160.split(",")[1],
        "128x128": tflite_128x128.split(",")[1],
        "256x144": tflite_144x256.split(",")[1],
        "256x256": tflite_256x256.split(",")[1],
    }
    defaultConf.modelInputs = {
        "160x96": [160, 96],
        "128x128": [128, 128],
        "256x144": [256, 144],
        "256x256": [256, 256],
    }
    defaultConf.modelKey = "160x96"
    defaultConf.useSimd = true
    /// #endif
    return defaultConf;
};

export const generateDefaultGoogleMeetSegmentationParams = (): GoogleMeetSegmentationOperationParams => {
    const defaultParams: GoogleMeetSegmentationOperationParams = {
        type: GoogleMeetSegmentationFunctionType.Segmentation,
        processSizeKey: "256x256",
        jbfD: 0,
        jbfSigmaC: 2,
        jbfSigmaS: 2,
        jbfPostProcess: PostProcessTypes.softmax_jbf,
        threshold: 0.5,
        interpolation: InterpolationTypes.lanczos,
        processWidth: 128,
        processHeight: 128,
    };
    return defaultParams;
};

export class LocalGM extends LocalWorker {
    tfliteModel: TFLite | null = null;

    canvas = document.createElement("canvas");
    ready = false;

    init = async (config: GoogleMeetSegmentationConfig) => {
        this.ready = false;
        this.tfliteModel = null;

        const browserType = getBrowserType();
        if (config.useSimd && browserType !== BrowserTypes.SAFARI) {
            // SIMD
            const modSimd = require("../resources/wasm/tflite-simd.js");
            const b = Buffer.from(config.wasmSimdBase64!, "base64");
            this.tfliteModel = await modSimd({ wasmBinary: b });
        } else {
            // Not-SIMD
            const mod = require("../resources/wasm/tflite.js");
            const b = Buffer.from(config.wasmBase64!, "base64");
            this.tfliteModel = await mod({ wasmBinary: b });
        }
        const modelBufferOffset = this.tfliteModel!._getModelBufferMemoryOffset();
        const tfliteModel = Buffer.from(config.modelTFLites[config.modelKey], "base64");
        this.tfliteModel!.HEAPU8.set(new Uint8Array(tfliteModel), modelBufferOffset);
        this.tfliteModel!._loadModel(tfliteModel.byteLength);

        this.ready = true;
    };

    predict = async (config: GoogleMeetSegmentationConfig, params: GoogleMeetSegmentationOperationParams, targetCanvas: HTMLCanvasElement) => {
        if (!this.tfliteModel) {
            return null;
        }
        if (!this.ready) {
            return null;
        }

        const imageData = targetCanvas.getContext("2d")!.getImageData(0, 0, targetCanvas.width, targetCanvas.height);
        const inputImageBufferOffset = this.tfliteModel!._getInputImageBufferOffset();
        this.tfliteModel!.HEAPU8.set(imageData.data, inputImageBufferOffset);
        this.tfliteModel!._exec_with_jbf(imageData.width, imageData.height, params.jbfD, params.jbfSigmaC, params.jbfSigmaS, params.jbfPostProcess, params.interpolation, params.threshold);
        const outputImageBufferOffset = this.tfliteModel!._getOutputImageBufferOffset();
        const res = new Uint8ClampedArray(this.tfliteModel!.HEAPU8.slice(outputImageBufferOffset, outputImageBufferOffset + imageData.width * imageData.height * 4));
        return res;
    };
}

export class GoogleMeetSegmentationWorkerManager extends WorkerManagerBase {
    private config = generateGoogleMeetSegmentationDefaultConfig();
    localWorker = new LocalGM();

    init = async (config: GoogleMeetSegmentationConfig | null) => {
        this.config = config || generateGoogleMeetSegmentationDefaultConfig();
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

    predict = async (params = generateDefaultGoogleMeetSegmentationParams(), targetCanvas: HTMLCanvasElement) => {
        const currentParams = { ...params };
        const resizedCanvas = this.generateTargetCanvas(targetCanvas, currentParams.processWidth, currentParams.processHeight);
        if (!this.worker) {
            const prediction = await this.localWorker.predict(this.config, currentParams, resizedCanvas);
            return prediction;
        }
        const imageData = resizedCanvas.getContext("2d")!.getImageData(0, 0, resizedCanvas.width, resizedCanvas.height);
        const prediction = (await this.sendToWorker(currentParams, imageData.data)) as Uint8ClampedArray;
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
            if (prediction[rowIndex][colIndex] > 0.5) {
                data[pix_offset + 0] = 70;
                data[pix_offset + 1] = 30;
                data[pix_offset + 2] = 30;
                data[pix_offset + 3] = 200;
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
