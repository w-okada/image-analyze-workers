import { BrowserTypes } from "@dannadori/000_WorkerBase";

export const BackendTypes = {
    WebGL: "WebGL",
    wasm: "wasm",
    cpu: "cpu",
} as const;
export type BackendTypes = typeof BackendTypes[keyof typeof BackendTypes];

export interface BlazefaceConfig {
    browserType: BrowserTypes;
    processOnLocal: boolean;
    backendType: BackendTypes;
    wasmPaths: { [key: string]: string };
    pageUrl: string;

    modelTFLites: { [key: string]: string };
    modelKey: string;
    wasmBase64: string;
    // wasmSimdBase64: string;
    useSimd: boolean;
}

export interface BlazefaceOperationParams {
    processWidth: number;
    processHeight: number;
}

export interface TFLite extends EmscriptenModule {
    _getModelBufferMemoryOffset(): number;
    _getInputImageBufferOffset(): number;
    _getOutputImageBufferOffset(): number;

    _loadModel(bufferSize: number): number;
    _exec(widht: number, height: number): number;
}
