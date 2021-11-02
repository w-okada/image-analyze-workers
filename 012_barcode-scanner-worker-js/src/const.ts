import { BrowserType } from "./BrowserUtil";

export const WorkerCommand = {
    INITIALIZE: "initialize",
    PREDICT: "predict",
};

export const WorkerResponse = {
    INITIALIZED: "initialized",
    PREDICTED: "predicted",
    NOT_READY: "not_ready",
};

export interface BarcodeScannerConfig {
    browserType: BrowserType;
    processOnLocal: boolean;

    modelTFLites: { [key: string]: string };
    modelKey: string;
    scanModes: { [key: string]: string };
    scanScales: { [key: string]: number };
    wasmBase64?: string;
    wasmSimdBase64?: string;
    useSimd: boolean;
}

export interface BarcodeScannerOperationParams {
    type: string;
    scale: number;
}

export interface TFLite extends EmscriptenModule {
    _getModelBufferMemoryOffset(): number;
    _getInputImageBufferOffset(): number;
    _getOutputImageBufferOffset(): number;

    _getInputMemoryOffset(): number;
    _getOutputMemoryOffset(): number;

    _loadModel(bufferSize: number): number;
    _exec(widht: number, height: number, scale: number, mode: number): number;

    _detect(widht: number, height: number, scale: number, size_threshold: number): number;
    _getBarcodePointsOffset(): number;
    _getInputBarcodeImageBufferOffset(): number;
    _readBarcode(width: number, height: number, angle: number, mode: number): number;
    _readBarcode_pure_zbar(width: number, height: number): number;
    _readBarcode_pure_zxing(width: number, height: number): number;
    _getBarcodeDataOffset(): number;
    _getZbarScanPointsOffset(): number;
}

export type BarcodeInfo = {
    p1_x: number;
    p1_y: number;
    p2_x: number;
    p2_y: number;
    p3_x: number;
    p3_y: number;
    p4_x: number;
    p4_y: number;

    angle: number;

    px_x: number;
    px_y: number;
    px_w: number;
    px_h: number;

    barcode_type: string;
    barcode_data: string;

    scan_type: string;
};
export const ScanModes = {
    original: "original",
    pure_zbar: "pure_zbar",
    pure_zxing: "pure_zxing",
} as const;

export type ScanModes = typeof ScanModes[keyof typeof ScanModes];

export const ScanScales = {
    "2x2": 2,
    "3x3": 3,
} as const;

export type ScanScales = typeof ScanScales[keyof typeof ScanScales];
