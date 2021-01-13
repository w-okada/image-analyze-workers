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
    processWidth        : number
    processHeight       : number
    smoothingS          : number
    smoothingR          : number
    jbfWidth            : number
    jbfHeight           : number

    staticMemory        : boolean
    lightWrapping       : boolean
    smoothingType       : GoogleMeetSegmentationSmoothingType

    originalWidth       : number
    originalHeight      : number
    
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

