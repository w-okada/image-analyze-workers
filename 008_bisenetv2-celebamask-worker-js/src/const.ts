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
    pageUrl             : string
    modelJson           : string
    modelWeight1         : string    
    modelWeight2         : string    
    modelWeight3         : string    
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

