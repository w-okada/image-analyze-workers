import { WorkerCommand, WorkerResponse, OpenCVFunctionType, OpenCVConfig, OpenCVOperatipnParams } from './const'

export let Module = {}

const ctx: Worker = self as any  // eslint-disable-line no-restricted-globals
const cv_asm = require('../resources/opencv.js');
let init_cv = false

cv_asm.onRuntimeInitialized = function () {
    console.log("initialized cv_asm")
    init_cv = true
}

const canny = async (data: Uint8ClampedArray, width: number, height: number, config: OpenCVConfig, params: OpenCVOperatipnParams) => {
    // ImageData作成  
    const processWidth = (params.processWidth <= 0 || params.processHeight <= 0) ? width : params.processWidth
    const processHeight = (params.processWidth <= 0 || params.processHeight <= 0) ? height : params.processHeight
    const cannyParams = params.cannyParams

    const inImageData = new ImageData(new Uint8ClampedArray(data), width, height)
    let src = cv_asm.matFromImageData(inImageData);
    let dst = new cv_asm.Mat();
    if (width !== processWidth || height !== processHeight) {
        let dsize = new cv_asm.Size(processWidth, processHeight);
        cv_asm.resize(src, src, dsize, 0, 0, cv_asm.INTER_AREA);
    }

    cv_asm.cvtColor(src, src, cv_asm.COLOR_RGB2GRAY, 0);
    cv_asm.Canny(src, dst, cannyParams!.threshold1, cannyParams!.threshold2, cannyParams!.apertureSize, cannyParams!.L2gradient);
    if(cannyParams!.bitwiseNot){
        cv_asm.bitwise_not(dst, dst);
    }
    cv_asm.cvtColor(dst, dst, cv_asm.COLOR_GRAY2RGBA, 0);
    if (width !== processWidth || height !== processHeight) {
        let dsize = new cv_asm.Size(width, height);
        cv_asm.resize(dst, dst, dsize, 0, 0, cv_asm.INTER_AREA);
    }
    const outImageData = new ImageData(new Uint8ClampedArray(dst.data), dst.cols, dst.rows)
    src.delete(); dst.delete();

    return outImageData
}

const blur = async (data: Uint8ClampedArray, width: number, height: number, config: OpenCVConfig, params: OpenCVOperatipnParams) => {
    // ImageData作成  
    const processWidth = (params.processWidth <= 0 || params.processHeight <= 0) ? width : params.processWidth
    const processHeight = (params.processWidth <= 0 || params.processHeight <= 0) ? height : params.processHeight
    const blurParams = params.blurParams

    const inImageData = new ImageData(new Uint8ClampedArray(data), width, height)
    let src = cv_asm.matFromImageData(inImageData);
    let dst = new cv_asm.Mat();
    if (width !== processWidth || height !== processHeight) {
        let dsize = new cv_asm.Size(processWidth, processHeight);
        cv_asm.resize(src, src, dsize, 0, 0, cv_asm.INTER_AREA);
    }

    const ksize = new cv_asm.Size(blurParams!.kernelSize[0], blurParams!.kernelSize[1]);
    const anchor = new cv_asm.Point(blurParams!.anchorPoint[0], blurParams!.anchorPoint[1]);    
    cv_asm.blur(src, dst, ksize, anchor, cv_asm.BORDER_DEFAULT);
    
    if (width !== processWidth || height !== processHeight) {
        let dsize = new cv_asm.Size(width, height);
        cv_asm.resize(dst, dst, dsize, 0, 0, cv_asm.INTER_AREA);
    }
    const outImageData = new ImageData(new Uint8ClampedArray(dst.data), dst.cols, dst.rows)
    src.delete(); dst.delete();

    return outImageData
}


onmessage = async (event) => {
    //  console.log("event", event)
    if (event.data.message === WorkerCommand.INITIALIZE) {
        const p = new Promise((onResolve, onFail) => {
            cv_asm.onRuntimeInitialized = function () {
                console.log("initialized cv_asm 1/2")
                onResolve()
            }
        })
        p.then(() => {
            console.log("initialized cv_asm 2/2")
            ctx.postMessage({ message: WorkerResponse.INITIALIZED })
        })
    } else if (event.data.message === WorkerCommand.PREDICT) {
        //    console.log("requested predict bodypix.")
        const data: Uint8ClampedArray = event.data.data
        const width = event.data.width
        const height = event.data.height
        const uid: number = event.data.uid
        const config: OpenCVConfig = event.data.config
        const params: OpenCVOperatipnParams = event.data.params
        let imageData:ImageData
        if (params.type === OpenCVFunctionType.Canny) {
            imageData = await canny(data, width, height, config, params)
        } else if(params.type === OpenCVFunctionType.Blur){
            imageData = await blur(data, width, height, config, params)
        } else {
            console.log("not implemented", params.type)
        }
        const outData = imageData!.data
        ctx.postMessage({ message: WorkerResponse.PREDICTED, uid: uid, converted: outData }, [outData.buffer])

    }
}

module.exports = [
    ctx
]