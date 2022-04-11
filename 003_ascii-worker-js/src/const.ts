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

export const AsciiFunctionTypes = {
    AsciiArt: "AsciiArt",
} as const;
export type AsciiFunctionTypes = typeof AsciiFunctionTypes[keyof typeof AsciiFunctionTypes];

export interface AsciiConfig {
    browserType: BrowserTypes;
    processOnLocal: boolean;
}

export interface AsciiOperationParams {
    type: AsciiFunctionTypes;
    processWidth: number;
    processHeight: number;
    asciiStr: string;
    fontSize: number;
}
