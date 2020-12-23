import { BrowserType } from './BrowserUtil';

export const WorkerCommand = {
    INITIALIZE   : 'initialize',
    PREDICT : 'predict',
}

export const WorkerResponse = {
    INITIALIZED      : 'initialized',
    PREDICTED   : 'predicted',
}

export interface MODNetConfig{
    browserType         : BrowserType
    processOnLocal      : boolean
    useTFWasmBackend    : boolean
    wasmPath            : string
    modelPath           : string
    workerPath          : string
}


export interface MODNetOperationParams{
    type        : MODNetFunctionType
    processWidth        : number
    processHeight       : number
}

export enum MODNetFunctionType{
    Segmentation,
    xxx, // Not implemented
}

