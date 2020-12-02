import { BrowserType } from './BrowserUtil';

export const WorkerCommand = {
    INITIALIZE   : 'initialize',
    PREDICT : 'predict',
}

export const WorkerResponse = {
    INITIALIZED      : 'initialized',
    PREDICTED   : 'predicted',
}

export interface U2NetPortraitConfig{
    browserType         : BrowserType
    processOnLocal      : boolean
    useTFWasmBackend    : boolean
    wasmPath            : string
    modelPath           : string
    workerPath          : string
}


export interface U2NetPortraitOperationParams{
    type        : U2NetPortraitFunctionType
    processWidth        : number
    processHeight       : number
}

export enum U2NetPortraitFunctionType{
    Portrait,
    xxx, // Not implemented
}

