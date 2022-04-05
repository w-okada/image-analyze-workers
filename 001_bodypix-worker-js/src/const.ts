import { ModelConfig, PersonInferenceConfig, MultiPersonInstanceInferenceConfig } from "@tensorflow-models/body-pix/dist/body_pix_model";
import { BrowserTypes } from "@dannadori/000_WorkerBase";
export const WorkerCommand = {
    INITIALIZE: "initialize",
    PREDICT: "predict",
} as const;
export type WorkerCommand = typeof WorkerCommand[keyof typeof WorkerCommand];

export const WorkerResponse = {
    INITIALIZED: "initialized",
    PREDICTED: "predicted",
} as const;
export type WorkerResponse = typeof WorkerResponse[keyof typeof WorkerResponse];

export const BodypixFunctionTypes = {
    SegmentPerson: "SegmentPerson",
    SegmentMultiPerson: "SegmentMultiPerson",
    SegmentPersonParts: "SegmentPersonParts",
    SegmentMultiPersonParts: "SegmentMultiPersonParts",
} as const;
export type BodypixFunctionTypes = typeof BodypixFunctionTypes[keyof typeof BodypixFunctionTypes];

export const ModelConfigs = {
    ModelConfigResNet: {
        architecture: "ResNet50",
        outputStride: 32,
        quantBytes: 2,
    },
    ModelConfigMobileNetV1: {
        architecture: "MobileNetV1",
        outputStride: 16,
        multiplier: 0.75,
        quantBytes: 2,
    },
    ModelConfigMobileNetV1_05: {
        architecture: "MobileNetV1",
        outputStride: 16,
        multiplier: 0.5,
        quantBytes: 2,
    },
} as const;
export type ModelConfigs = typeof ModelConfigs[keyof typeof ModelConfigs];

export type BodyPixConfig = {
    browserType: BrowserTypes;
    model: ModelConfig;
    processOnLocal: boolean;
    useTFWasmBackend: boolean;
};

export interface BodyPixOperatipnParams {
    type: BodypixFunctionTypes;
    segmentPersonParams: PersonInferenceConfig;
    segmentPersonPartsParams: PersonInferenceConfig;
    segmentMultiPersonParams: MultiPersonInstanceInferenceConfig;
    segmentMultiPersonPartsParams: MultiPersonInstanceInferenceConfig;
    processWidth: number;
    processHeight: number;
}
