import { BrowserType } from './BrowserUtil';

export const WorkerCommand = {
    INITIALIZE   : 'initialize',
    PREDICT : 'predict',
}

export const WorkerResponse = {
    INITIALIZED      : 'initialized',
    PREDICTED   : 'predicted',
}

export interface BisenetV2CelebAMaskConfig{
    browserType         : BrowserType
    processOnLocal      : boolean
    useTFWasmBackend    : boolean
    wasmPath            : string
    modelPath           : string
    workerPath          : string
}


export interface BisenetV2CelebAMaskOperatipnParams{
    type        : BisenetV2CelebAMaskFunctionType
    processWidth        : number
    processHeight       : number
}

export enum BisenetV2CelebAMaskFunctionType{
    Mask,
    xxx, // Not implemented
}

