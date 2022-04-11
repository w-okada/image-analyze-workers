import { BrowserTypes } from "@dannadori/000_WorkerBase";
import { ModelConfig, MultiPersonInferenceConfig, SinglePersonInterfaceConfig } from "@tensorflow-models/posenet";
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

export const PoseNetFunctionTypes = {
    SinglePerson: "SinglePerson",
    MultiPerson: "MultiPerson", // Not implemented
} as const;
export type PoseNetFunctionTypes = typeof PoseNetFunctionTypes[keyof typeof PoseNetFunctionTypes];

export const BackendTypes = {
    WebGL: "WebGL",
    wasm: "wasm",
    cpu: "cpu",
} as const;
export type BackendTypes = typeof BackendTypes[keyof typeof BackendTypes];

export const ModelConfigs = {
    ModelConfigResNet: {
        architecture: "ResNet50",
        outputStride: 32,
        inputResolution: { width: 257, height: 257 },
        quantBytes: 2,
    },
    ModelConfigMobileNetV1: {
        architecture: "MobileNetV1",
        outputStride: 16,
        inputResolution: { width: 257, height: 257 },
        multiplier: 0.75,
    },
} as const;
export type ModelConfigs = typeof ModelConfigs[keyof typeof ModelConfigs];

export interface PoseNetConfig {
    browserType: BrowserTypes;
    model: ModelConfig;
    processOnLocal: boolean;
    backendType: BackendTypes;
    wasmPaths: { [key: string]: string };
    pageUrl: string;
}

export interface PoseNetOperationParams {
    type: PoseNetFunctionTypes;
    singlePersonParams: SinglePersonInterfaceConfig;
    multiPersonParams: MultiPersonInferenceConfig;
    processWidth: number;
    processHeight: number;
}
