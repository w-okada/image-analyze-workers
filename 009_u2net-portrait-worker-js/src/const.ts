import { BrowserType } from "./BrowserUtil";

export const WorkerCommand = {
    INITIALIZE: "initialize",
    PREDICT: "predict",
};

export const WorkerResponse = {
    INITIALIZED: "initialized",
    PREDICTED: "predicted",
};

export interface U2NetPortraitConfig {
    browserType: BrowserType;
    processOnLocal: boolean;
    useTFWasmBackend: boolean;
    wasmPath: string;
    pageUrl: string;
    modelJson_p3_1: string;
    modelWeight_p3_1: string;
    modelJson_p4_1: string;
    modelWeight_p4_1: string;
    modelJson_p4_2: string;
    modelWeight_p4_2: string;
    modelJson_p4_3: string;
    modelWeight_p4_3: string;
    modelJson_p4_4: string;
    modelWeight_p4_4: string;
    modelJson_p4_5: string;
    modelWeight_p4_5: string;

    // wasmBase64?: string;
    // wasmSimdBase64?: string;
    // useSimd: boolean;
}

export interface U2NetPortraitOperationParams {
    type: U2NetPortraitFunctionType;
    // blurParams?: BlurParams | null;
    processWidth: number;
    processHeight: number;
    // withBlurImage: boolean;
}

export enum U2NetPortraitFunctionType {
    Portrait,
    xxx, // Not implemented
}

// export interface BlurParams {
//     kernelSize: number;
// }

// export interface Wasm extends EmscriptenModule {
//     _getInputImageBufferOffset(): number;
//     _getOutputImageBufferOffset(): number;

//     _blur(imageWidth: number, imageHeight: number, ksize: number): number;
//     _gaussianBlur(imageWidth: number, imageHeight: number, ksize: number, sigma: number): number;
//     _canny(imageWidth: number, imageHeight: number, th1: number, th2: number, apertureSize: number, l2gradient: boolean): number;
// }
