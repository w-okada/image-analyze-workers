import { BrowserType } from './BrowserUtil';

export const WorkerCommand = {
    INITIALIZE   : 'initialize',
    PREDICT : 'predict',
}

export const WorkerResponse = {
    INITIALIZED      : 'initialized',
    PREDICTED   : 'predicted',
}

export interface AsciiConfig{
    browserType         : BrowserType
    processOnLocal      : boolean
    workerPath          : string
}


export interface AsciiOperatipnParams{
    type: AsciiFunctionType
    processWidth        : number
    processHeight       : number
    asciiStr            : string
    fontSize            : number
}

export enum AsciiFunctionType{
    AsciiArt
}

