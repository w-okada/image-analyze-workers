import { BrowserType } from './BrowserUtil';
export const WorkerCommand = {
    INITIALIZE   : 'initialize',
    PREDICT : 'predict',
}

export const WorkerResponse = {
    INITIALIZED      : 'initialized',
    PREDICTED   : 'predicted',
}

// ModelConfig is not provided from officail. So create originally.
export interface ModelConfig{
    maxContinuousChecks: number;
    detectionConfidence: number;
    maxFaces: number;
    iouThreshold: number;
    scoreThreshold: number;
}

export interface FacemeshConfig{
    browserType           : BrowserType
    useTFWasmBackend      : boolean 
    useTFCPUBackend       : boolean 
    wasmPath              : string
    modelReloadInterval   : number // if not reload, set zero
    model                 : ModelConfig
    processOnLocal        : boolean
}


export interface FacemeshOperatipnParams{
    type                : FacemeshFunctionType
    processWidth        : number
    processHeight       : number
    predictIrises       : boolean
}

export enum FacemeshFunctionType{
    DetectMesh,
}