import { BrowserTypes } from "@dannadori/worker-base";

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

export const BackendTypes = {
    WebGL: "WebGL",
    wasm: "wasm",
    cpu: "cpu",
} as const;
export type BackendTypes = typeof BackendTypes[keyof typeof BackendTypes];

export const CartoonFunctionTypes = {
    Cartoon: "Cartoon",
} as const;
export type CartoonFunctionTypes = typeof CartoonFunctionTypes[keyof typeof CartoonFunctionTypes];

export interface CartoonConfig {
    browserType: BrowserTypes;
    processOnLocal: boolean;
    backendType: BackendTypes;
    wasmPaths: { [key: string]: string };
    pageUrl: string;
    modelJson: string;
    modelWeight: string;
}

export interface CartoonOperationParams {
    type: CartoonFunctionTypes;
    processWidth: number;
    processHeight: number;
}
