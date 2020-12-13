import { ModelConfig, PersonInferenceConfig, MultiPersonInstanceInferenceConfig } from '@tensorflow-models/body-pix/dist/body_pix_model';
import { BrowserType } from './BrowserUtil';


export const WorkerCommand = {
    INITIALIZE   : 'initialize',
    PREDICT : 'predict',
}

export const WorkerResponse = {
    INITIALIZED      : 'initialized',
    PREDICTED   : 'predicted',
}

export interface BodyPixConfig{
    browserType         : BrowserType
    model               : ModelConfig
    processOnLocal      : boolean
    workerPath          : string

}

export const ModelConfigResNet: ModelConfig = {
    architecture: 'ResNet50',
    outputStride: 32,
    quantBytes: 2
}
export const ModelConfigMobileNetV1: ModelConfig = {
    architecture: 'MobileNetV1',
    outputStride: 16,
    multiplier: 0.75,
    quantBytes: 2
}
export const ModelConfigMobileNetV1_05: ModelConfig = {
    architecture: 'MobileNetV1',
    outputStride: 16,
    multiplier: 0.5,
    quantBytes: 2
}

export interface BodyPixOperatipnParams{
    type: BodypixFunctionType
    segmentPersonParams: PersonInferenceConfig
    segmentPersonPartsParams: PersonInferenceConfig
    segmentMultiPersonParams: MultiPersonInstanceInferenceConfig
    segmentMultiPersonPartsParams: MultiPersonInstanceInferenceConfig
    processWidth        : number
    processHeight       : number

}

export enum BodypixFunctionType{
    SegmentPerson,
    SegmentMultiPerson,
    SegmentPersonParts,
    SegmentMultiPersonParts
}

