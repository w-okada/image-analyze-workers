import { BrowserType } from './BrowserUtil';
import { ModelConfig, SinglePersonInterfaceConfig, MultiPersonInferenceConfig } from '@tensorflow-models/posenet/dist/posenet_model';

export const WorkerCommand = {
    INITIALIZE   : 'initialize',
    PREDICT : 'predict',
}

export const WorkerResponse = {
    INITIALIZED      : 'initialized',
    PREDICTED   : 'predicted',
}

export interface PoseNetConfig{
    browserType           : BrowserType
    model                 : ModelConfig
    processOnLocal        : boolean
    useTFWasmBackend      : boolean  // we can not use posenet with wasm. shouldn't be true.
    wasmPath              : string
    workerPath            : string
}

export const ModelConfigMobileNetV1: ModelConfig = {
    architecture: 'MobileNetV1',
    outputStride: 16,
    inputResolution: { width: 257, height: 257 },
    multiplier: 0.75
}

export const ModelConfigResNet50: ModelConfig = {
    architecture: 'ResNet50',
    outputStride: 32,
    inputResolution: { width: 257, height: 257 },
    quantBytes: 2
}


export enum PoseNetFunctionType{
    SinglePerson,
    MultiPerson,// Not implemented
}


export interface PoseNetOperatipnParams{
    type               : PoseNetFunctionType
    singlePersonParams : SinglePersonInterfaceConfig
    multiPersonParams  : MultiPersonInferenceConfig
}
