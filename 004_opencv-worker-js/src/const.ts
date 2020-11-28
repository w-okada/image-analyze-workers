import { BrowserType } from './BrowserUtil';

export const WorkerCommand = {
    INITIALIZE   : 'initialize',
    PREDICT : 'predict',
}

export const WorkerResponse = {
    INITIALIZED      : 'initialized',
    PREDICTED   : 'predicted',
}

export interface OpenCVConfig{
    browserType         : BrowserType
    processOnLocal      : boolean
    workerPath          : string
}


export interface OpenCVOperatipnParams{
    type         : OpenCVFunctionType
    cannyParams? : CannyParams|null
    blurParams?  : BlurParams|null
    processWidth        : number
    processHeight       : number
}

export enum OpenCVFunctionType{
    Canny,
    Blur,
}

export interface CannyParams{
    threshold1    : number
    threshold2    : number
    apertureSize  : number 
    L2gradient    : boolean
    bitwiseNot    : boolean
}

export interface BlurParams{
    kernelSize    : number[]
    anchorPoint   : number[] // [-1, -1]
}

