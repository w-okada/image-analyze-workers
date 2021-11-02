import { BrowserType, getBrowserType } from "./BrowserUtil";
import { BarcodeScannerConfig, BarcodeScannerOperationParams, TFLite, WorkerCommand, WorkerResponse, BarcodeInfo, ScanModes, ScanScales } from "./const";

export { BarcodeScannerConfig, BarcodeScannerOperationParams, TFLite, WorkerCommand, WorkerResponse, BarcodeInfo };

// @ts-ignore
import workerJs from "worker-loader?inline=no-fallback!./barcode-scanner-worker-worker.ts";

// @ts-ignore
import tfliteModel from "../resources/tflite_models/barcode172_light.tflite.bin";

// @ts-ignore
import barcodeWasm from "../resources/wasm/tflite.wasm";
// @ts-ignore
import barcodeWasmSimd from "../resources/wasm/tflite-simd.wasm";

export const generateBarcodeScannerDefaultConfig = (): BarcodeScannerConfig => {
    const defaultConf: BarcodeScannerConfig = {
        browserType: getBrowserType(),
        processOnLocal: false,
        modelTFLites: {
            tflite: tfliteModel.split(",")[1],
        },
        modelKey: "tflite",
        wasmBase64: barcodeWasm.split(",")[1],
        wasmSimdBase64: barcodeWasmSimd.split(",")[1],
        useSimd: false,
        scanModes: ScanModes,
        scanScales: ScanScales,
    };
    return defaultConf;
};

export const generateDefaultBarcodeScannerParams = (): BarcodeScannerOperationParams => {
    const defaultParams: BarcodeScannerOperationParams = {
        type: ScanModes.original,
        scale: ScanScales["2x2"],
    };
    return defaultParams;
};

const calcProcessSize = (width: number, height: number) => {
    const max_size = 2000;
    if (Math.max(width, height) > max_size) {
        const ratio = max_size / Math.max(width, height);
        return [width * ratio, height * ratio];
    } else {
        return [width, height];
    }
};

export class LocalWorker {
    ready = false;
    tflite?: TFLite | null = null;
    orgCanvas = document.createElement("canvas");
    inputCanvas = document.createElement("canvas");

    resultArray: number[] = Array<number>(300 * 300);

    init = async (config: BarcodeScannerConfig) => {
        this.ready = false;
        this.tflite = null;

        const browserType = getBrowserType();
        if (config.useSimd && browserType !== BrowserType.SAFARI) {
            const modSimd = require("../resources/wasm/tflite-simd.js");
            const b = Buffer.from(config.wasmSimdBase64!, "base64");
            this.tflite = await modSimd({ wasmBinary: b });
        } else {
            const mod = require("../resources/wasm/tflite.js");
            const b = Buffer.from(config.wasmBase64!, "base64");
            this.tflite = await mod({ wasmBinary: b });
        }
        const modelBufferOffset = this.tflite!._getModelBufferMemoryOffset();
        const tfliteModel = Buffer.from(config.modelTFLites[config.modelKey], "base64");
        this.tflite!.HEAPU8.set(new Uint8Array(tfliteModel), modelBufferOffset);
        this.tflite!._loadModel(tfliteModel.byteLength);
        this.ready = true;
        console.log("[WORKER_MANAGER]: Loaded");
    };

    barcodeScan = (imageData: ImageData, config: BarcodeScannerConfig, params: BarcodeScannerOperationParams): BarcodeInfo[] => {
        const tflite = this.tflite!;
        //// (1) generate original canvas ctx
        this.orgCanvas.width = imageData.width;
        this.orgCanvas.height = imageData.height;
        const orgCanvasCtx = this.orgCanvas.getContext("2d")!;
        orgCanvasCtx.putImageData(imageData, 0, 0);

        //// (2) generate input data
        this.inputCanvas.width = 172 * params.scale;
        this.inputCanvas.height = 172 * params.scale;
        const inputCanvasCtx = this.inputCanvas.getContext("2d")!;
        inputCanvasCtx.drawImage(this.orgCanvas, 0, 0, this.inputCanvas.width, this.inputCanvas.height);
        const resizedImageData = inputCanvasCtx.getImageData(0, 0, this.inputCanvas.width, this.inputCanvas.height);

        ///// (2-2) input data
        const inputImageBufferOffset = tflite._getInputImageBufferOffset();
        tflite.HEAPU8.set(resizedImageData.data, inputImageBufferOffset);

        //// (3) detect barcode
        const barcodeInfos: BarcodeInfo[] = [];
        try {
            const barcode_num = tflite._detect(this.inputCanvas.width, this.inputCanvas.height, params.scale, 0); // last param is mode. this is not used currently.

            const barcodePointsOffset = tflite._getBarcodePointsOffset();
            for (let i = 0; i < barcode_num; i++) {
                const offset = barcodePointsOffset / 4 + 13 * i;
                const barcodeInfo: BarcodeInfo = {
                    p1_x: tflite.HEAPF32[offset + 0],
                    p1_y: tflite.HEAPF32[offset + 1],
                    p2_x: tflite.HEAPF32[offset + 2],
                    p2_y: tflite.HEAPF32[offset + 3],
                    p3_x: tflite.HEAPF32[offset + 4],
                    p3_y: tflite.HEAPF32[offset + 5],
                    p4_x: tflite.HEAPF32[offset + 6],
                    p4_y: tflite.HEAPF32[offset + 7],

                    angle: tflite.HEAPF32[offset + 8],

                    px_x: tflite.HEAPF32[offset + 9],
                    px_y: tflite.HEAPF32[offset + 10],
                    px_w: tflite.HEAPF32[offset + 11],
                    px_h: tflite.HEAPF32[offset + 12],
                    barcode_type: "",
                    barcode_data: "",
                    scan_type: ScanModes.original,
                };
                barcodeInfos.push(barcodeInfo);
            }
        } catch (e) {
            console.log(e);
        }

        //// (4) read barcode
        barcodeInfos.forEach((info) => {
            const imageData = orgCanvasCtx.getImageData(info.px_x * this.orgCanvas.width, info.px_y * this.orgCanvas.height, info.px_w * this.orgCanvas.width, info.px_h * this.orgCanvas.height);

            const inputBarcodeImageBufferOffset = tflite._getInputBarcodeImageBufferOffset();
            tflite.HEAPU8.set(imageData.data, inputBarcodeImageBufferOffset);

            const res = tflite._readBarcode(info.px_w * this.orgCanvas.width, info.px_h * this.orgCanvas.height, info.angle, 0);
            if (res === 0) {
                // バーコード未検出
                return;
            }

            const resOffset = tflite._getBarcodeDataOffset();

            const barcode_data_array = Array.from(tflite.HEAPU8.slice(resOffset, resOffset + 128 * 32));
            const barcode_data = String.fromCharCode(...barcode_data_array);
            const barcodes = barcode_data.split("\0");
            info.barcode_type = barcodes[0];
            info.barcode_data = barcodes[1];
            // console.log("barcode scanner returns: ", barcode_type, barcode_data )
        });

        return barcodeInfos;
    };

    scan_by_pure_zbar = (imageData: ImageData, config: BarcodeScannerConfig, params: BarcodeScannerOperationParams): BarcodeInfo[] => {
        const tflite = this.tflite!;
        //// (1) set data
        const inputBarcodeImageBufferOffset = tflite._getInputBarcodeImageBufferOffset();
        tflite.HEAPU8.set(imageData.data, inputBarcodeImageBufferOffset);

        //// (2) scan
        const res = tflite._readBarcode_pure_zbar(imageData.width, imageData.height);

        //// (3) get result
        const barcodeInfos: BarcodeInfo[] = [];
        ///////// offset for Point DATA
        const resPointOffset = tflite._getZbarScanPointsOffset();
        ///////// offset for data
        const resOffset = tflite._getBarcodeDataOffset();
        const barcode_data_array = Array.from(tflite.HEAPU8.slice(resOffset, resOffset + 128 * 32));
        const barcode_data = String.fromCharCode(...barcode_data_array);
        const barcodes = barcode_data.split("\0");
        ///////// set result
        for (let i = 0; i < res; i++) {
            const x = tflite.HEAPF32[resPointOffset / 4 + i * 2 + 0];
            const y = tflite.HEAPF32[resPointOffset / 4 + i * 2 + 1];
            const barcode_type = barcodes[i * 2 + 0];
            const barcode_data = barcodes[i * 2 + 1];

            const diff = 0.01;
            const barcodeInfo: BarcodeInfo = {
                p1_x: x,
                p1_y: y,
                p2_x: x + diff,
                p2_y: y,
                p3_x: x + diff,
                p3_y: y + diff,
                p4_x: x,
                p4_y: y + diff,

                angle: 0,

                px_x: x,
                px_y: y,
                px_w: diff,
                px_h: diff,
                barcode_type: barcode_type,
                barcode_data: barcode_data,
                scan_type: ScanModes.pure_zbar,
            };
            barcodeInfos.push(barcodeInfo);
        }
        return barcodeInfos;
    };

    scan_by_pure_zxing = (imageData: ImageData, config: BarcodeScannerConfig, params: BarcodeScannerOperationParams): BarcodeInfo[] => {
        const tflite = this.tflite!;
        //// (1) set data
        const inputBarcodeImageBufferOffset = tflite._getInputBarcodeImageBufferOffset();
        tflite.HEAPU8.set(imageData.data, inputBarcodeImageBufferOffset);

        //// (2) scan
        const res = tflite._readBarcode_pure_zxing(imageData.width, imageData.height);

        //// (3) get result
        const barcodeInfos: BarcodeInfo[] = [];
        ///////// offset for Point DATA
        const resPointOffset = tflite._getZbarScanPointsOffset();
        ///////// offset for data
        const resOffset = tflite._getBarcodeDataOffset();
        const barcode_data_array = Array.from(tflite.HEAPU8.slice(resOffset, resOffset + 128 * 32));
        const barcode_data = String.fromCharCode(...barcode_data_array);
        const barcodes = barcode_data.split("\0");
        ///////// set result
        for (let i = 0; i < res; i++) {
            const x = tflite.HEAPF32[resPointOffset / 4 + i * 2 + 0];
            const y = tflite.HEAPF32[resPointOffset / 4 + i * 2 + 1];
            const barcode_type = barcodes[i * 2 + 0];
            const barcode_data = barcodes[i * 2 + 1];

            const diff = 0.01;

            const barcodeInfo: BarcodeInfo = {
                p1_x: x,
                p1_y: y,
                p2_x: x + diff,
                p2_y: y,
                p3_x: x + diff,
                p3_y: y + diff,
                p4_x: x,
                p4_y: y + diff,

                angle: 0,

                px_x: x,
                px_y: y,
                px_w: diff,
                px_h: diff,
                barcode_type: barcode_type,
                barcode_data: barcode_data,
                scan_type: ScanModes.pure_zxing,
            };
            barcodeInfos.push(barcodeInfo);
        }
        return barcodeInfos;
    };

    predict = async (imageData: ImageData, config: BarcodeScannerConfig, params: BarcodeScannerOperationParams) => {
        if (this.ready) {
            if (!this.tflite) {
                return [];
            }
            switch (params.type) {
                case ScanModes.original:
                    return this.barcodeScan(imageData, config, params);
                case ScanModes.pure_zbar:
                    return this.scan_by_pure_zbar(imageData, config, params);
                case ScanModes.pure_zxing:
                    return this.scan_by_pure_zxing(imageData, config, params);
                default:
                    return [];
            }
        }
        return [];
    };
}

export class BarcodeScannerWorkerManager {
    private workerBSL: Worker | null = null;
    orgCanvas = document.createElement("canvas"); // to resize canvas for WebWorker

    private config = generateBarcodeScannerDefaultConfig();
    private localWorker = new LocalWorker();
    init = async (config: BarcodeScannerConfig | null) => {
        if (config != null) {
            this.config = config;
        }
        if (this.workerBSL) {
            this.workerBSL.terminate();
        }
        this.workerBSL = null;

        //// Local
        if (this.config.processOnLocal == true) {
            await this.localWorker.init(this.config!);
            return;
        }

        //// Remote
        const workerBSL: Worker = new workerJs();
        console.log("[manager] send initialize request");
        workerBSL!.postMessage({ message: WorkerCommand.INITIALIZE, config: this.config });
        const p = new Promise<void>((onResolve, onFail) => {
            workerBSL!.onmessage = (event) => {
                console.log("[manager] receive event", event);
                if (event.data.message === WorkerResponse.INITIALIZED) {
                    console.log("WORKERSS INITIALIZED");
                    this.workerBSL = workerBSL;
                    onResolve();
                } else {
                    console.log("opencv Initialization something wrong..");
                    onFail(event);
                }
            };
        });
        await p;
        return;
    };

    predict = async (src: HTMLCanvasElement | HTMLImageElement | HTMLVideoElement, params = generateDefaultBarcodeScannerParams()) => {
        //// (1) generate original canvas
        let processWidth, processHeight;
        if (src instanceof HTMLImageElement) {
            [processWidth, processHeight] = calcProcessSize(src.naturalWidth, src.naturalHeight);
        }
        if (src instanceof HTMLVideoElement) {
            [processWidth, processHeight] = calcProcessSize(src.videoWidth, src.videoHeight);
        }
        if (src instanceof HTMLCanvasElement) {
            processWidth = src.width;
            processHeight = src.height;
        }
        if (processWidth === 0 || processHeight === 0 || !processWidth || !processHeight) {
            return [];
        }
        this.orgCanvas.width = processWidth;
        this.orgCanvas.height = processHeight;
        const orgCanvasCtx = this.orgCanvas.getContext("2d")!;
        orgCanvasCtx.drawImage(src, 0, 0, this.orgCanvas.width, this.orgCanvas.height);
        const imageData = orgCanvasCtx.getImageData(0, 0, this.orgCanvas.width, this.orgCanvas.height);

        //// (2) Local or Safari
        if (this.config.processOnLocal == true || this.config.browserType === BrowserType.SAFARI) {
            const res = await this.localWorker.predict(imageData, this.config, params);
            return res;
        }

        //// (3) WebWorker
        /////// (3-1) Not initilaized return.
        if (!this.workerBSL) {
            return [];
        }
        /////// worker is initialized.
        ///// (3-2) post message
        const uid = performance.now();
        this.workerBSL!.postMessage(
            {
                message: WorkerCommand.PREDICT,
                uid: uid,
                config: this.config,
                params: params,
                imageData: imageData,
            },
            [imageData.data.buffer]
        );

        ///// (3-3) recevie message
        const p = new Promise<BarcodeInfo[]>((resolve, reject) => {
            this.workerBSL!.onmessage = (event) => {
                if (event.data.message === WorkerResponse.PREDICTED && event.data.uid === uid) {
                    const prediction = event.data.prediction as BarcodeInfo[];
                    resolve(prediction);
                } else {
                    //// Only Drop the request...
                    console.log("something wrong..", event, event.data.message);
                    const prediction = event.data.prediction as BarcodeInfo[];
                    resolve(prediction);
                    // reject()
                }
            };
        });
        const res = await p;
        return res;
    };
}
