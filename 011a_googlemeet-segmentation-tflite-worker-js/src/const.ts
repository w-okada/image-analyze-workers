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

export interface GoogleMeetSegmentationTFLiteConfig{
    browserType         : BrowserType
    processOnLocal      : boolean
    modelPath           : string
    workerPath          : string
}


export interface GoogleMeetSegmentationTFLiteOperationParams{
    type                : GoogleMeetSegmentationTFLiteFunctionType
    processWidth        : number
    processHeight       : number
    kernelSize          : number
    useSoftmax          : boolean
    usePadding          : boolean
    threshold           : number
    useSIMD             : boolean
}

export enum GoogleMeetSegmentationTFLiteFunctionType{
    Segmentation,
    xxx, // Not implemented
}

export interface TFLite{
    /// TFLite Model Properties
    _getModelBufferMemoryOffset(): number

    /// TFLite Model Loader
    _loadModel(bufferSize: number): number

    /// Custom Parameter and exec
    _setKernelSize(int: number): number
    _setSmoothingR(int: number): number
    _setUseSoftmax(int: number): number
    _setUsePadding(int: number): number
    _setThresholdWithoutSoftmax(float: number): number

    _getInputImageBufferOffset(): number
    _getOutputImageBufferOffset(): number
    _exec(widht: number, height: number): number

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