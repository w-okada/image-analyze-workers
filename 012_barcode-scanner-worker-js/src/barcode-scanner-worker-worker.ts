import { BrowserType, getBrowserType } from "./BrowserUtil";
import {  BarcodeInfo, BarcodeScannerConfig, BarcodeScannerOperationParams, BarcodeScannerType, TFLite, WorkerCommand, WorkerResponse } from "./const";

const ctx: Worker = self as any  // eslint-disable-line no-restricted-globals
let tflite:TFLite | null = null
let tfliteSIMD:TFLite | null = null
let ready:boolean = false


const barcodeScan = (tflite:TFLite, org:OffscreenCanvas, config: BarcodeScannerConfig, params: BarcodeScannerOperationParams):BarcodeInfo[]  => {

    //// (1) generate input data
    const inputCanvas = new OffscreenCanvas(172*params.scale, 172*params.scale)
    const inputCanvasCtx = inputCanvas.getContext("2d")!
    inputCanvasCtx.drawImage(org, 0, 0, inputCanvas.width, inputCanvas.height)
    const imageData = inputCanvasCtx.getImageData(0, 0, inputCanvas.width, inputCanvas.height)

    ///// (1-2) input data
    const inputImageBufferOffset = tflite._getInputImageBufferOffset()
    tflite.HEAPU8.set(imageData.data, inputImageBufferOffset);        

    //// (2) generate original canvas ctx
    const orgCanvasCtx = org.getContext("2d")!        


    //// (3) detect barcode
    const barcodeInfos: BarcodeInfo[] = []
    try {
        const barcode_num = tflite._detect(inputCanvas.width, inputCanvas.height, params.scale, 0) // last param is mode. this is not used currently.
        // console.log("BARCODE NUM", barcode_num)

        const barcodePointsOffset = tflite._getBarcodePointsOffset()
        for (let i = 0; i < barcode_num; i++) {
            const offset = barcodePointsOffset / 4 + (13 * i)
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
                barcode_type:"",
                barcode_data:"",
                scan_type: BarcodeScannerType.original
            }
            barcodeInfos.push(barcodeInfo)
        }           
    } catch (e) {
        console.log(e)
    }


    //// (4) read barcode
    barcodeInfos.forEach(info => {
        const imageData = orgCanvasCtx.getImageData(info.px_x*org.width, info.px_y*org.height, info.px_w*org.width, info.px_h*org.height)

        const inputBarcodeImageBufferOffset = tflite._getInputBarcodeImageBufferOffset()
        tflite.HEAPU8.set(imageData.data, inputBarcodeImageBufferOffset);

        const res = tflite._readBarcode(info.px_w*org.width, info.px_h*org.height, info.angle, 0)
        if(res===0){ // バーコード未検出
            return;
        }
        
        const resOffset = tflite._getBarcodeDataOffset()

        const barcode_data_array = Array.from( tflite.HEAPU8.slice(resOffset, resOffset + 128*32)  );
        const barcode_data = String.fromCharCode( ...barcode_data_array)
        const barcodes = barcode_data.split("\0")
        info.barcode_type = barcodes[0]
        info.barcode_data = barcodes[1]
        // console.log("barcode scanner returns: ", barcode_type, barcode_data )
    })

    return barcodeInfos
}



const scan_by_pure_zbar = (tflite:TFLite, org:OffscreenCanvas, config: BarcodeScannerConfig, params: BarcodeScannerOperationParams):BarcodeInfo[]  => {
    //// (1) generate original canvasCtx
    const orgCanvasCtx = org.getContext("2d")!        


    //// (2) Input data
    const imageData = orgCanvasCtx.getImageData(0, 0, org.width, org.height)
    const inputBarcodeImageBufferOffset = tflite._getInputBarcodeImageBufferOffset()
    tflite.HEAPU8.set(imageData.data, inputBarcodeImageBufferOffset);

    //// (3) scan
    const res = tflite._readBarcode_pure_zbar(org.width, org.height)


    //// (4) get result
    const barcodeInfos: BarcodeInfo[] = []
    ///////// offset for Point DATA
    const resPointOffset = tflite._getZbarScanPointsOffset()
    ///////// offset for data
    const resOffset = tflite._getBarcodeDataOffset()
    const barcode_data_array = Array.from(  tflite.HEAPU8.slice(resOffset, resOffset + 128*32)  );
    const barcode_data = String.fromCharCode( ...barcode_data_array)
    const barcodes = barcode_data.split("\0")
    ///////// set result
    for(let i=0;i<res;i++){
        const x = tflite.HEAPF32[resPointOffset/4 + i*2 + 0]
        const y = tflite.HEAPF32[resPointOffset/4 + i*2 + 1]
        const barcode_type = barcodes[i*2 +0]
        const barcode_data = barcodes[i*2 +1]

        const diff = 0.01
        const barcodeInfo: BarcodeInfo = {
            p1_x: x,
            p1_y: y,
            p2_x: x+diff,
            p2_y: y,
            p3_x: x+diff,
            p3_y: y+diff,
            p4_x: x,
            p4_y: y+diff,

            angle: 0,

            px_x: x,
            px_y: y,
            px_w: diff,
            px_h: diff,
            barcode_type: barcode_type,
            barcode_data: barcode_data,
            scan_type: BarcodeScannerType.original
        }
        barcodeInfos.push(barcodeInfo)
    }
    return barcodeInfos

}


const scan_by_pure_zxing = (tflite:TFLite, org:OffscreenCanvas, config: BarcodeScannerConfig, params: BarcodeScannerOperationParams):BarcodeInfo[]  => {
    //// (1) generate original canvasCtx
    const orgCanvasCtx = org.getContext("2d")!        


    //// (2) Input data
    const imageData = orgCanvasCtx.getImageData(0, 0, org.width, org.height)
    const inputBarcodeImageBufferOffset = tflite._getInputBarcodeImageBufferOffset()
    tflite.HEAPU8.set(imageData.data, inputBarcodeImageBufferOffset);

    //// (3) scan
    const res = tflite._readBarcode_pure_zxing(org.width, org.height)


    //// (4) get result
    const barcodeInfos: BarcodeInfo[] = []
    ///////// offset for Point DATA
    const resPointOffset = tflite._getZbarScanPointsOffset()
    ///////// offset for data
    const resOffset = tflite._getBarcodeDataOffset()
    const barcode_data_array = Array.from(  tflite.HEAPU8.slice(resOffset, resOffset + 128*32)  );
    const barcode_data = String.fromCharCode( ...barcode_data_array)
    const barcodes = barcode_data.split("\0")
    ///////// set result
    for(let i=0;i<res;i++){
        const x = tflite.HEAPF32[resPointOffset/4 + i*2 + 0]
        const y = tflite.HEAPF32[resPointOffset/4 + i*2 + 1]
        const barcode_type = barcodes[i*2 +0]
        const barcode_data = barcodes[i*2 +1]

        const diff = 0.01

        const barcodeInfo: BarcodeInfo = {
            p1_x: x,
            p1_y: y,
            p2_x: x+diff,
            p2_y: y,
            p3_x: x+diff,
            p3_y: y+diff,
            p4_x: x,
            p4_y: y+diff,

            angle: 0,

            px_x: x,
            px_y: y,
            px_w: diff,
            px_h: diff,
            barcode_type: barcode_type,
            barcode_data: barcode_data,
            scan_type: BarcodeScannerType.original
        }
        barcodeInfos.push(barcodeInfo)
    }
    return barcodeInfos

}

const predict = async (src:OffscreenCanvas, config: BarcodeScannerConfig, params: BarcodeScannerOperationParams) => {

    let currentTFLite 
    if(params.useSIMD){
        currentTFLite = tfliteSIMD
    }else{
        currentTFLite = tflite
    }

    switch(params.type){
        case BarcodeScannerType.original:
            return barcodeScan(tflite!, src, config, params)
        case BarcodeScannerType.zbar:
            return scan_by_pure_zbar(tflite!, src, config, params)
        case BarcodeScannerType.zxing:
            return scan_by_pure_zxing(tflite!, src, config, params)
        default:
            return []
    }
}

onmessage = async (event) => {
    if (event.data.message === WorkerCommand.INITIALIZE) {
        ready = false
        const config = event.data.config as BarcodeScannerConfig

        console.log("[WORKER] module initializing...")

        let mod;
        const browserType = config.browserType
        if(!mod && browserType == BrowserType.SAFARI){
            mod = require('../resources/tflite_for_safari.js');
        }else if(!mod &&  browserType != BrowserType.SAFARI){
            mod = require('../resources/tflite.js');
        }


        tflite = await mod()
        // console.log("[WORKER]: mod", mod)
        console.log("[WORKER]: Test Access", tflite, tflite!._getInputImageBufferOffset())

        const modelResponse = await fetch(config.modelPath)
        console.log("[model]", config.modelPath)
        const model = await modelResponse.arrayBuffer()
        console.log('[WORKER]: Model Size:', model.byteLength);
        const modelBufferOffset = tflite!._getModelBufferMemoryOffset()
        tflite!.HEAPU8.set(new Uint8Array(model), modelBufferOffset)
        const res = tflite!._loadModel(model.byteLength)
        console.log('[WORKER]: Load Result:', res)

        if(config.enableSIMD){
            console.log("[WORKER_MANAGER]: LOAD SIMD_MOD")
            let modSIMD ;

            if(browserType == BrowserType.SAFARI){
                modSIMD = require('../resources/tflite_for_safari.js');
            }else{
                modSIMD = require('../resources/tflite-simd.js');
            }


            // console.log("[WORKER_MANAGER]:", modSIMD)
            tfliteSIMD  = await modSIMD()
            const modelSIMDBufferOffset = tfliteSIMD!._getModelBufferMemoryOffset()
            tfliteSIMD!.HEAPU8.set(new Uint8Array(model), modelSIMDBufferOffset)
            const res = tfliteSIMD!._loadModel(model.byteLength)
            console.log("[WORKER_MANAGER]: LOAD SIMD_MOD DONE")
        }

        ready = true
        ctx.postMessage({ message: WorkerResponse.INITIALIZED })

    } else if (event.data.message === WorkerCommand.PREDICT) {
        const uid: number = event.data.uid
        const config: BarcodeScannerConfig = event.data.config
        const params: BarcodeScannerOperationParams = event.data.params
        const image: ImageBitmap = event.data.image;
        const canvas = new OffscreenCanvas(image.width, image.height)
        canvas.getContext("2d")!.drawImage(image, 0, 0)

        if(ready === false) {
            console.log("NOTREADY!!",WorkerResponse.NOT_READY)
            ctx.postMessage({ message: WorkerResponse.NOT_READY , uid: uid})
        }else{
            const prediction = await predict(canvas, config, params)
    
            ctx.postMessage({ message: WorkerResponse.PREDICTED, uid: uid, prediction: prediction })
        }
    }
}

module.exports = [
    ctx
]