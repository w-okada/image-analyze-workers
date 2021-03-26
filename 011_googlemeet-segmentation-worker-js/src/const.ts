import { BrowserType } from './BrowserUtil';

export const WorkerCommand = {
    INITIALIZE   : 'initialize',
    PREDICT : 'predict',
}

export const WorkerResponse = {
    INITIALIZED      : 'initialized',
    PREDICTED   : 'predicted',
}

export interface GoogleMeetSegmentationConfig{
    browserType         : BrowserType
    processOnLocal      : boolean
    useTFWasmBackend    : boolean
    wasmPath            : string
    modelPath           : string
    workerPath          : string
}


export interface GoogleMeetSegmentationOperationParams{
    type                : GoogleMeetSegmentationFunctionType
    processWidth        : number  // InputSize to Model (128x128, 144x256, 96x160)
    processHeight       : number  // InputSize to Model  (128x128, 144x256, 96x160)
    smoothingS          : number  // kernelSize(Depricated)
    // kernelSize          : number  // 
    smoothingR          : number  // 
    jbfWidth            : number  // JBFを適用するときのサイズ(大きいほど精度が上がる模様)
    jbfHeight           : number  // JBFを適用するときのサイズ(大きいほど精度が上がる模様)

    staticMemory        : boolean
    lightWrapping       : boolean
    smoothingType       : GoogleMeetSegmentationSmoothingType

    originalWidth       : number
    originalHeight      : number
    
    directToCanvs       : boolean
    toCanvas            : HTMLCanvasElement|null
}

export enum GoogleMeetSegmentationFunctionType{
    Segmentation,
    xxx, // Not implemented
}


export enum GoogleMeetSegmentationSmoothingType{
    GPU,
    JS,
    WASM,
    JS_CANVAS,
}

