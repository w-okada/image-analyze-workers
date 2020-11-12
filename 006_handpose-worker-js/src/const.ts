import { BrowserType } from './BrowserUtil';

export const WorkerCommand = {
    INITIALIZE   : 'initialize',
    PREDICT : 'predict',
}

export const WorkerResponse = {
    INITIALIZED      : 'initialized',
    PREDICTED   : 'predicted',
}

// interface AnnotatedPrediction extends Prediction {
//     annotations: {
//         [key: string]: Array<[number, number, number]>;
//     };
// }

export interface HandPoseConfig{
    browserType           : BrowserType
    model                 : ModelConfig
    useTFWasmBackend      : boolean
    wasmPath              : string
    processOnLocal        : boolean
    modelReloadInterval   : number // if not reload, set zero   
    workerPath            : string 
}

export interface ModelConfig{
    maxContinuousChecks?: number;
    detectionConfidence?: number;
    iouThreshold?: number;
    scoreThreshold?: number;
}

export enum HandPoseFunctionType{
    EstimateHands,
}


export interface HandPoseOperatipnParams{
    type                : HandPoseFunctionType
    estimateHands       : EstimateHandsParams
    processWidth        : number
    processHeight       : number
}

export interface EstimateHandsParams{
    flipHorizontal: boolean
}