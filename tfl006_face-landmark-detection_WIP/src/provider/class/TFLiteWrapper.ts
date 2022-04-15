import { BrowserTypes, getBrowserType } from "@dannadori/000_WorkerBase";
import { BlazefaceConfig, INPUT_HEIGHT, INPUT_WIDTH, TFLite } from "../../const";

export class TFLiteWrapper {
    tflite: TFLite | null = null;
    width = INPUT_WIDTH
    height = INPUT_HEIGHT

    init = async (config: BlazefaceConfig) => {
        const browserType = getBrowserType();
        if (config.useSimd && browserType !== BrowserTypes.SAFARI) {
            const modSimd = require("../../../resources/wasm/tflite-simd.js");
            const b = Buffer.from(config.wasmSimdBase64!, "base64");
            this.tflite = await modSimd({ wasmBinary: b });
            console.log("SIMD******", modSimd, this.tflite)
        } else {
            const mod = require("../../../resources/wasm/tflite.js");
            const b = Buffer.from(config.wasmBase64!, "base64");
            this.tflite = await mod({ wasmBinary: b });
            console.log("WASM******", mod, this.tflite)
        }
        const tfliteModel = Buffer.from(config.modelTFLites[config.modelKey], "base64");
        this.tflite!._initModelBuffer(tfliteModel.byteLength);
        const modelBufferOffset = this.tflite!._getModelBufferAddress();
        this.tflite!.HEAPU8.set(new Uint8Array(tfliteModel), modelBufferOffset);
        this.tflite!._loadModel(tfliteModel.byteLength);


        const tfliteLandmarkModel = Buffer.from(config.landmarkModelTFLites[config.modelKey], "base64");
        this.tflite!._initLandmarkModelBuffer(tfliteLandmarkModel.byteLength);
        const landmarkModelBufferOffset = this.tflite!._getLandmarkModelBufferAddress();
        this.tflite!.HEAPU8.set(new Uint8Array(tfliteLandmarkModel), landmarkModelBufferOffset);
        this.tflite!._loadLandmarkModel(tfliteLandmarkModel.byteLength);

        const s = this.tflite!._getInputBufferAddress()
        console.log("address;;;;;", s)
        this.tflite!._initInputBuffer(this.width, this.height, 4)
        const s2 = this.tflite!._getInputBufferAddress()
        console.log("address;;;;;", s2)
    };

    exec = (inputImage: ImageData) => {
        const s = this.tflite!._getInputBufferAddress()
        this.tflite!.HEAPU8.set(inputImage.data, s);
        this.tflite!._copySrc2Dst(this.width, this.height, 4);
        this.tflite!._exec2(this.width, this.height);

        const e = this.tflite!._getOutputBufferAddress()
        const outImage = new ImageData(new Uint8ClampedArray(this.tflite!.HEAPU8.slice(e, e + this.width * this.height * 4)), this.width, this.height)
        return outImage
    }

}
