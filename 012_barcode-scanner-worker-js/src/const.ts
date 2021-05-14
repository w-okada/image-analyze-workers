import { BrowserType } from './BrowserUtil';

export const WorkerCommand = {
    INITIALIZE   : 'initialize',
    PREDICT : 'predict',
}

export const WorkerResponse = {
    INITIALIZED      : 'initialized',
    PREDICTED   : 'predicted',
    NOT_READY   : 'not_ready'
}

export interface BarcodeScannerConfig{
    browserType         : BrowserType
    processOnLocal      : boolean
    modelPath           : string
    workerPath          : string
    enableSIMD          : boolean

}


export interface BarcodeScannerOperationParams{
    type                : BarcodeScannerType
    processWidth        : number  // InputSize to Model (128x128, 144x256, 96x160)
    processHeight       : number  // InputSize to Model  (128x128, 144x256, 96x160)
    scale               : number
    sizeThresold        : number
    interpolation       : number
    useSIMD             : boolean

}

export enum BarcodeScannerType{
    original,
    zbar,
    zxing,
}


export interface TFLite{
    _getModelBufferMemoryOffset(): number
    _getInputImageBufferOffset(): number
    _getOutputImageBufferOffset(): number

    _getInputMemoryOffset():number
    _getOutputMemoryOffset():number

    _loadModel(bufferSize: number): number
    _exec(widht: number, height: number, scale:number, mode:number): number


    _detect(widht: number, height: number, scale:number, size_threshold:number): number
    _getBarcodePointsOffset():number
    _getInputBarcodeImageBufferOffset():number
    _readBarcode(width: number, height:number, angle:number, mode:number): number
    _readBarcode_pure_zbar(width:number, height:number):number
    _readBarcode_pure_zxing(width:number, height:number):number
    _getBarcodeDataOffset():number
    _getZbarScanPointsOffset():number

    ////HEAP
    HEAP8: Int8Array;
    HEAP16: Int16Array;
    HEAP32: Int32Array;
    HEAPU8: Uint8Array;
    HEAPU16: Uint16Array;
    HEAPU32: Uint32Array;
    HEAPF32: Float32Array;
    HEAPF64: Float64Array;

}


export type BarcodeInfo = {
    p1_x: number
    p1_y: number
    p2_x: number
    p2_y: number
    p3_x: number
    p3_y: number
    p4_x: number
    p4_y: number

    angle: number

    px_x: number
    px_y: number
    px_w: number
    px_h: number

    barcode_type: string
    barcode_data: string

    scan_type: BarcodeScannerType
}