import { BrowserTypes, getBrowserType } from "@dannadori/000_WorkerBase";
import { BlazefaceConfig, TFLite } from "../../const";

export class TFLiteWrapper {
    tflite: TFLite | null = null;

    init = async (config: BlazefaceConfig) => {
        const browserType = getBrowserType();
        if (config.useSimd && browserType !== BrowserTypes.SAFARI) {
            const mod = require("../../../resources/wasm/tflite.js");
            // const modSimd = require("../../../resources/wasm/tflite-simd.js");
            // const b = Buffer.from(config.wasmSimdBase64!, "base64");
            const b = Buffer.from(config.wasmBase64!, "base64");
            this.tflite = await mod({ wasmBinary: b });
            // this.tflite = await modSimd({ wasmBinary: b });
        } else {
            const mod = require("../../../resources/wasm/tflite.js");
            const b = Buffer.from(config.wasmBase64!, "base64");
            this.tflite = await mod({ wasmBinary: b });
        }
        const modelBufferOffset = this.tflite!._getModelBufferMemoryOffset();
        const tfliteModel = Buffer.from(config.modelTFLites[config.modelKey], "base64");
        this.tflite!.HEAPU8.set(new Uint8Array(tfliteModel), modelBufferOffset);
        this.tflite!._loadModel(tfliteModel.byteLength);
        this.tflite!._exec(100, 100);
    };
}
