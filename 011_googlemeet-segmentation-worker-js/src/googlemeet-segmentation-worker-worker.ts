import { GoogleMeetSegmentationConfig, GoogleMeetSegmentationOperationParams, TFLite, WorkerCommand, WorkerResponse } from "./const";
import * as tf from "@tensorflow/tfjs";
import { BrowserTypes } from "@dannadori/000_WorkerBase";

const ctx: Worker = self as any; // eslint-disable-line no-restricted-globals

let tfliteModel: TFLite | null = null;
let ready: boolean = false;
let config: GoogleMeetSegmentationConfig | null = null


const predict = async (config: GoogleMeetSegmentationConfig, params: GoogleMeetSegmentationOperationParams, data: Uint8ClampedArray) => {
    const imageData = new ImageData(data, params.processWidth, params.processHeight);
    const inputImageBufferOffset = tfliteModel!._getInputImageBufferOffset();
    tfliteModel!.HEAPU8.set(imageData.data, inputImageBufferOffset);

    tfliteModel!._exec_with_jbf(imageData.width, imageData.height, params.jbfD, params.jbfSigmaC, params.jbfSigmaS, params.jbfPostProcess, params.interpolation, params.threshold);

    const outputImageBufferOffset = tfliteModel!._getOutputImageBufferOffset();
    const res = new Uint8ClampedArray(tfliteModel!.HEAPU8.slice(outputImageBufferOffset, outputImageBufferOffset + imageData.width * imageData.height * 4));
    return res!;
};

onmessage = async (event) => {
    if (event.data.message === WorkerCommand.INITIALIZE) {
        ready = false;
        config = event.data.config as GoogleMeetSegmentationConfig;
        tfliteModel = null;

        /// (x) TensorflowLite (always loaded for interpolutions.)
        const browserType = config.browserType;
        if (config.useSimd && browserType !== BrowserTypes.SAFARI) {
            const modSimd = require("../resources/wasm/tflite-simd.js");
            const b = Buffer.from(config.wasmSimdBase64!, "base64");
            tfliteModel = await modSimd({ wasmBinary: b });
        } else {
            const mod = require("../resources/wasm/tflite.js");
            const b = Buffer.from(config.wasmBase64!, "base64");
            tfliteModel = await mod({ wasmBinary: b });
        }
        const modelBufferOffset = tfliteModel!._getModelBufferMemoryOffset();
        const tfliteModelData = Buffer.from(config.modelTFLites[config.modelKey], "base64");
        tfliteModel!.HEAPU8.set(new Uint8Array(tfliteModelData), modelBufferOffset);
        tfliteModel!._loadModel(tfliteModelData.byteLength);
        ready = true;
        ctx.postMessage({ message: WorkerResponse.INITIALIZED });
    } else if (event.data.message === WorkerCommand.PREDICT) {
        const params: GoogleMeetSegmentationOperationParams = event.data.params;
        const data: Uint8ClampedArray = event.data.data;

        const prediction = await predict(config!, params, data);
        ctx.postMessage({ message: WorkerResponse.PREDICTED, prediction: prediction }, [prediction.buffer]);
    }
};
