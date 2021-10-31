import { BrowserType } from "000_image_analyzer_utils";

export const WorkerCommand = {
    INITIALIZE: "initialize",
    PREDICT: "predict",
};

export const WorkerResponse = {
    INITIALIZED: "initialized",
    PREDICTED: "predicted",
};

export interface OpenCVConfig {
    browserType: BrowserType;
    processOnLocal: boolean;
    wasmBase64?: string;
    wasmSimdBase64?: string;
    useSimd: boolean;
}

export interface OpenCVOperatipnParams {
    type: OpenCVProcessTypes;
    cannyParams?: CannyParams | null;
    blurParams?: BlurParams | null;
    gausianBlurParams?: GausianBlurParams | null;
    processWidth: number;
    processHeight: number;
}

export const OpenCVProcessTypes = {
    Canny: "Canny",
    Blur: "Blur",
    GausianBlur: "GausianBlur",
} as const;
export type OpenCVProcessTypes = typeof OpenCVProcessTypes[keyof typeof OpenCVProcessTypes];

export interface CannyParams {
    threshold1: number;
    threshold2: number;
    apertureSize: number;
    L2gradient: boolean;
    bitwiseNot: boolean;
}

export interface BlurParams {
    kernelSize: number;
}

export interface GausianBlurParams {
    kernelSize: number;
    sigma: number;
}

export interface Wasm extends EmscriptenModule {
    _getInputImageBufferOffset(): number;
    _getOutputImageBufferOffset(): number;

    _blur(imageWidth: number, imageHeight: number, ksize: number): number;
    _gaussianBlur(imageWidth: number, imageHeight: number, ksize: number, sigma: number): number;
    _canny(imageWidth: number, imageHeight: number, th1: number, th2: number, apertureSize: number, l2gradient: boolean): number;
}
