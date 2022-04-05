import { BodyPixConfig, BodyPixOperatipnParams, BodypixFunctionTypes, ModelConfigs } from "./const";
import * as bodyPix from "@tensorflow-models/body-pix";
import { SemanticPersonSegmentation } from "@tensorflow-models/body-pix";
import { WorkerManagerBase, LocalWorker, getBrowserType } from "@dannadori/000_WorkerBase";

export { BodypixFunctionTypes, BodyPixConfig, BodyPixOperatipnParams } from "./const";
export { SemanticPersonSegmentation, SemanticPartSegmentation, PersonSegmentation, PartSegmentation } from "@tensorflow-models/body-pix";
export { BodyPixInternalResolution, BodyPixArchitecture, BodyPixMultiplier, BodyPixOutputStride, BodyPixQuantBytes } from "@tensorflow-models/body-pix/dist/types";

import * as tf from "@tensorflow/tfjs";

// @ts-ignore
import workerJs from "worker-loader?inline=no-fallback!./bodypix-worker-worker.ts";

const load_module = async (config: BodyPixConfig) => {
    if (config.useTFWasmBackend) {
        console.log("use wasm backend");
        require("@tensorflow/tfjs-backend-wasm");
        await tf.setBackend("wasm");
    } else {
        console.log("use webgl backend");
        require("@tensorflow/tfjs-backend-webgl");
        await tf.setBackend("webgl");
    }
};

export const generateBodyPixDefaultConfig = (): BodyPixConfig => {
    const defaultConf: BodyPixConfig = {
        browserType: getBrowserType(),
        model: ModelConfigs.ModelConfigMobileNetV1,
        processOnLocal: false,
        useTFWasmBackend: false,
    };
    return defaultConf;
};

export const generateDefaultBodyPixParams = () => {
    const defaultParams: BodyPixOperatipnParams = {
        type: BodypixFunctionTypes.SegmentPerson,
        segmentPersonParams: {
            flipHorizontal: false,
            internalResolution: "medium",
            segmentationThreshold: 0.7,
            maxDetections: 10,
            scoreThreshold: 0.3,
            nmsRadius: 20,
        },
        segmentPersonPartsParams: {
            flipHorizontal: false,
            internalResolution: "medium",
            segmentationThreshold: 0.7,
            maxDetections: 10,
            scoreThreshold: 0.3,
            nmsRadius: 20,
        },
        segmentMultiPersonParams: {
            flipHorizontal: false,
            internalResolution: "medium",
            segmentationThreshold: 0.7,
            maxDetections: 10,
            scoreThreshold: 0.3,
            nmsRadius: 20,
            minKeypointScore: 0.3,
            refineSteps: 10,
        },
        segmentMultiPersonPartsParams: {
            flipHorizontal: false,
            internalResolution: "medium",
            segmentationThreshold: 0.7,
            maxDetections: 10,
            scoreThreshold: 0.3,
            nmsRadius: 20,
            minKeypointScore: 0.3,
            refineSteps: 10,
        },
        processWidth: 300,
        processHeight: 300,
    };
    return defaultParams;
};

class LocalBP extends LocalWorker {
    model: bodyPix.BodyPix | null = null;
    canvas: HTMLCanvasElement = (() => {
        const newCanvas = document.createElement("canvas");
        newCanvas.style.display = "none";
        return newCanvas;
    })();

    init = async (config: BodyPixConfig) => {
        await load_module(config);
        this.model = await bodyPix.load(config.model);
    };

    predict = async (config: BodyPixConfig, params: BodyPixOperatipnParams, targetCanvas: HTMLCanvasElement) => {
        const ctx = targetCanvas.getContext("2d")!;
        const newImg = ctx.getImageData(0, 0, targetCanvas.width, targetCanvas.height);

        let prediction;
        if (params.type === BodypixFunctionTypes.SegmentPerson) {
            prediction = await this.model!.segmentPerson(newImg, params.segmentPersonParams);
        } else if (params.type === BodypixFunctionTypes.SegmentPersonParts) {
            prediction = await this.model!.segmentPersonParts(newImg, params.segmentPersonPartsParams);
        } else if (params.type === BodypixFunctionTypes.SegmentMultiPerson) {
            prediction = await this.model!.segmentMultiPerson(newImg, params.segmentMultiPersonParams);
        } else if (params.type === BodypixFunctionTypes.SegmentMultiPersonParts) {
            prediction = await this.model!.segmentMultiPersonParts(newImg, params.segmentMultiPersonPartsParams);
        } else {
            // segmentPersonに倒す
            prediction = await this.model!.segmentPerson(newImg, params.segmentPersonParams);
        }
        return prediction;
    };
}

export class BodypixWorkerManager extends WorkerManagerBase {
    private config: BodyPixConfig = generateBodyPixDefaultConfig();
    localWorker = new LocalBP();
    init = async (config: BodyPixConfig | null = null) => {
        this.config = config || generateBodyPixDefaultConfig();
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

    predict = async (params: BodyPixOperatipnParams, targetCanvas: HTMLCanvasElement) => {
        const currentParams = { ...params };
        const resizedCanvas = this.generateTargetCanvas(targetCanvas, currentParams.processWidth, currentParams.processHeight);
        if (!this.worker) {
            const prediction = await this.localWorker.predict(this.config, currentParams, resizedCanvas);
            return prediction;
        }
        const imageData = resizedCanvas.getContext("2d")!.getImageData(0, 0, resizedCanvas.width, resizedCanvas.height);
        const prediction = (await this.sendToWorker(this.config, currentParams, imageData.data)) as bodyPix.SemanticPersonSegmentation | bodyPix.SemanticPartSegmentation | bodyPix.PersonSegmentation[] | bodyPix.PartSegmentation[];
        return prediction;
    };
}

/////////////////////////
//// Utility for Demo ///
/////////////////////////
export const createForegroundImage = (srcCanvas: HTMLCanvasElement, prediction: SemanticPersonSegmentation) => {
    const tmpCanvas = document.createElement("canvas");
    tmpCanvas.width = prediction.width;
    tmpCanvas.height = prediction.height;
    const imageData = tmpCanvas.getContext("2d")!.getImageData(0, 0, tmpCanvas.width, tmpCanvas.height);
    const data = imageData.data;
    for (let rowIndex = 0; rowIndex < prediction.height; rowIndex++) {
        for (let colIndex = 0; colIndex < prediction.width; colIndex++) {
            const seg_offset = rowIndex * prediction.width + colIndex;
            const pix_offset = (rowIndex * prediction.width + colIndex) * 4;

            if (prediction.data[seg_offset] === 0) {
                data[pix_offset] = 0;
                data[pix_offset + 1] = 0;
                data[pix_offset + 2] = 0;
                data[pix_offset + 3] = 0;
            } else {
                data[pix_offset] = 255;
                data[pix_offset + 1] = 255;
                data[pix_offset + 2] = 255;
                data[pix_offset + 3] = 255;
            }
        }
    }
    const imageDataTransparent = new ImageData(data, prediction.width, prediction.height);
    tmpCanvas.getContext("2d")!.putImageData(imageDataTransparent, 0, 0);

    const outputCanvas = document.createElement("canvas");

    outputCanvas.width = srcCanvas.width;
    outputCanvas.height = srcCanvas.height;
    const ctx = outputCanvas.getContext("2d")!;
    ctx.drawImage(tmpCanvas, 0, 0, outputCanvas.width, outputCanvas.height);
    ctx.globalCompositeOperation = "source-in";
    ctx.drawImage(srcCanvas, 0, 0, outputCanvas.width, outputCanvas.height);
    const outputImage = outputCanvas.getContext("2d")!.getImageData(0, 0, outputCanvas.width, outputCanvas.height);
    tmpCanvas.remove();
    outputCanvas.remove();
    return outputImage;
};
