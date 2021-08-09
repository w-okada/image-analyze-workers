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

export interface SuperResolutionConfig{
    browserType         : BrowserType
    processOnLocal      : boolean
    modelPath           : string
    workerPath          : string
    enableSIMD          : boolean
    useTFWasmBackend    : boolean
    wasmPath            : string
    tfjsModelPath       : string

}


export interface SuperResolutionOperationParams{
    inputWidth          : number
    inputHeight         : number
    scaleFactor         : number
    interpolation       : number
    useSIMD             : boolean
    useTensorflowjs     : boolean
}


export const InterpolationType = {
    INTER_NEAREST   :0,
    INTER_LINEAR    :1,
    INTER_AREA      :2,
    INTER_CUBIC     :3,
    INTER_LANCZOS4  :4,
    INTER_ESPCN     :100,
    CANVAS          :200,
}

export interface TFLite{
    _getModelBufferMemoryOffset(): number
    _getInputImageBufferOffset(): number
    _getOutputImageBufferOffset(): number

    _loadModel(bufferSize: number): number
    _exec(widht: number, height: number, interpolationType: number): number

    _extractY(width:number, height:number):number
    _mergeY(width:number, height:number, scaled_width:number, scaled_height:number):number
    _getYBufferOffset():number
    _getScaledYBufferOffset():number


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

