import { BrowserTypes } from "@dannadori/worker-base";
import { BarcodeInfo, BarcodeScannerConfig, BarcodeScannerOperationParams, ScanModes, TFLite, WorkerCommand, WorkerResponse } from "./const";

const ctx: Worker = self as any; // eslint-disable-line no-restricted-globals
let tflite: TFLite | null = null;
let ready: boolean = false;
let config: BarcodeScannerConfig | null = null
const barcodeScan = (imageData: ImageData, config: BarcodeScannerConfig, params: BarcodeScannerOperationParams): BarcodeInfo[] => {
    //// (1) generate original canvas ctx
    const orgCanvas = new OffscreenCanvas(imageData.width, imageData.height);
    const orgCanvasCtx = orgCanvas.getContext("2d")!;
    orgCanvasCtx.putImageData(imageData, 0, 0);

    //// (2) generate input data
    const inputCanvas = new OffscreenCanvas(172 * params.scale, 172 * params.scale);
    const inputCanvasCtx = inputCanvas.getContext("2d")!;
    inputCanvasCtx.drawImage(orgCanvas, 0, 0, inputCanvas.width, inputCanvas.height);
    const resizedImageData = inputCanvasCtx.getImageData(0, 0, inputCanvas.width, inputCanvas.height);

    ///// (2-2) input data
    const inputImageBufferOffset = tflite!._getInputImageBufferOffset();
    tflite!.HEAPU8.set(resizedImageData.data, inputImageBufferOffset);

    //// (3) detect barcode
    const barcodeInfos: BarcodeInfo[] = [];
    try {
        const barcode_num = tflite!._detect(inputCanvas.width, inputCanvas.height, params.scale, 0); // last param is mode. this is not used currently.
        // console.log("BARCODE NUM", barcode_num)

        const barcodePointsOffset = tflite!._getBarcodePointsOffset();
        for (let i = 0; i < barcode_num; i++) {
            const offset = barcodePointsOffset / 4 + 13 * i;
            const barcodeInfo: BarcodeInfo = {
                p1_x: tflite!.HEAPF32[offset + 0],
                p1_y: tflite!.HEAPF32[offset + 1],
                p2_x: tflite!.HEAPF32[offset + 2],
                p2_y: tflite!.HEAPF32[offset + 3],
                p3_x: tflite!.HEAPF32[offset + 4],
                p3_y: tflite!.HEAPF32[offset + 5],
                p4_x: tflite!.HEAPF32[offset + 6],
                p4_y: tflite!.HEAPF32[offset + 7],

                angle: tflite!.HEAPF32[offset + 8],

                px_x: tflite!.HEAPF32[offset + 9],
                px_y: tflite!.HEAPF32[offset + 10],
                px_w: tflite!.HEAPF32[offset + 11],
                px_h: tflite!.HEAPF32[offset + 12],
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
        const imageData = orgCanvasCtx.getImageData(info.px_x * orgCanvas.width, info.px_y * orgCanvas.height, info.px_w * orgCanvas.width, info.px_h * orgCanvas.height);

        const inputBarcodeImageBufferOffset = tflite!._getInputBarcodeImageBufferOffset();
        tflite!.HEAPU8.set(imageData.data, inputBarcodeImageBufferOffset);

        const res = tflite!._readBarcode(info.px_w * orgCanvas.width, info.px_h * orgCanvas.height, info.angle, 0);
        if (res === 0) {
            // バーコード未検出
            return;
        }

        const resOffset = tflite!._getBarcodeDataOffset();

        const barcode_data_array = Array.from(tflite!.HEAPU8.slice(resOffset, resOffset + 128 * 32));
        const barcode_data = String.fromCharCode(...barcode_data_array);
        const barcodes = barcode_data.split("\0");
        info.barcode_type = barcodes[0];
        info.barcode_data = barcodes[1];
        // console.log("barcode scanner returns: ", barcode_type, barcode_data )
    });

    return barcodeInfos;
};

const scan_by_pure_zbar = (imageData: ImageData, config: BarcodeScannerConfig, params: BarcodeScannerOperationParams): BarcodeInfo[] => {
    //// (1) Input data
    const inputBarcodeImageBufferOffset = tflite!._getInputBarcodeImageBufferOffset();
    tflite!.HEAPU8.set(imageData.data, inputBarcodeImageBufferOffset);

    //// (3) scan
    const res = tflite!._readBarcode_pure_zbar(imageData.width, imageData.height);

    //// (4) get result
    const barcodeInfos: BarcodeInfo[] = [];
    ///////// offset for Point DATA
    const resPointOffset = tflite!._getZbarScanPointsOffset();
    ///////// offset for data
    const resOffset = tflite!._getBarcodeDataOffset();
    const barcode_data_array = Array.from(tflite!.HEAPU8.slice(resOffset, resOffset + 128 * 32));
    const barcode_data = String.fromCharCode(...barcode_data_array);
    const barcodes = barcode_data.split("\0");
    ///////// set result
    for (let i = 0; i < res; i++) {
        const x = tflite!.HEAPF32[resPointOffset / 4 + i * 2 + 0];
        const y = tflite!.HEAPF32[resPointOffset / 4 + i * 2 + 1];
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

const scan_by_pure_zxing = (imageData: ImageData, config: BarcodeScannerConfig, params: BarcodeScannerOperationParams): BarcodeInfo[] => {
    //// (1) Set data
    const inputBarcodeImageBufferOffset = tflite!._getInputBarcodeImageBufferOffset();
    tflite!.HEAPU8.set(imageData.data, inputBarcodeImageBufferOffset);

    //// (2) scan
    const res = tflite!._readBarcode_pure_zxing(imageData.width, imageData.height);

    //// (3) get result
    const barcodeInfos: BarcodeInfo[] = [];
    ///////// offset for Point DATA
    const resPointOffset = tflite!._getZbarScanPointsOffset();
    ///////// offset for data
    const resOffset = tflite!._getBarcodeDataOffset();
    const barcode_data_array = Array.from(tflite!.HEAPU8.slice(resOffset, resOffset + 128 * 32));
    const barcode_data = String.fromCharCode(...barcode_data_array);
    const barcodes = barcode_data.split("\0");
    ///////// set result
    for (let i = 0; i < res; i++) {
        const x = tflite!.HEAPF32[resPointOffset / 4 + i * 2 + 0];
        const y = tflite!.HEAPF32[resPointOffset / 4 + i * 2 + 1];
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

const predict = async (config: BarcodeScannerConfig, params: BarcodeScannerOperationParams, data: Uint8ClampedArray) => {
    if (!ready || !tflite) {
        return [];
    }
    const imageData = new ImageData(data, params.processWidth, params.processHeight);
    switch (params.type) {
        case ScanModes.original:
            return barcodeScan(imageData, config, params);
        case ScanModes.pure_zbar:
            return scan_by_pure_zbar(imageData, config, params);
        case ScanModes.pure_zxing:
            return scan_by_pure_zxing(imageData, config, params);
        default:
            return [];
    }
};

onmessage = async (event) => {
    if (event.data.message === WorkerCommand.INITIALIZE) {
        ready = false;
        config = event.data.config as BarcodeScannerConfig;
        tflite = null;
        console.log("[WORKER] module initializing...");
        if (config.useSimd && config.browserType !== BrowserTypes.SAFARI) {
            const modSimd = require("../resources/wasm/tflite-simd.js");
            const b = Buffer.from(config.wasmSimdBase64!, "base64");
            tflite = await modSimd({ wasmBinary: b });
        } else {
            const mod = require("../resources/wasm/tflite.js");
            const b = Buffer.from(config.wasmBase64!, "base64");
            tflite = await mod({ wasmBinary: b });
        }

        const modelBufferOffset = tflite!._getModelBufferMemoryOffset();
        const tfliteModel = Buffer.from(config.modelTFLites[config.modelKey], "base64");
        tflite!.HEAPU8.set(new Uint8Array(tfliteModel), modelBufferOffset);
        tflite!._loadModel(tfliteModel.byteLength);
        ready = true;
        ctx.postMessage({ message: WorkerResponse.INITIALIZED });
    } else if (event.data.message === WorkerCommand.PREDICT) {
        const params: BarcodeScannerOperationParams = event.data.params;
        const data: Uint8ClampedArray = event.data.data;

        if (ready === false) {
            console.log("NOTREADY!!", WorkerResponse.NOT_READY);
            ctx.postMessage({ message: WorkerResponse.NOT_READY });
        } else {
            const prediction = await predict(config!, params, data);
            ctx.postMessage({ message: WorkerResponse.PREDICTED, prediction: prediction });
        }
    }
};

module.exports = [ctx];
