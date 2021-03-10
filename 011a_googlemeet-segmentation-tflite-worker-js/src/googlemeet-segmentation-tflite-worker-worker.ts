import { GoogleMeetSegmentationTFLiteConfig, GoogleMeetSegmentationTFLiteOperationParams, TFLite, WorkerCommand, WorkerResponse } from "./const";

const ctx: Worker = self as any  // eslint-disable-line no-restricted-globals
let tflite:TFLite | null = null
let ready:boolean = false
let resultArray:number[] = Array<number>(300*300)

const predict = async (src:Uint8Array, config: GoogleMeetSegmentationTFLiteConfig, params: GoogleMeetSegmentationTFLiteOperationParams) => {

    tflite!._setKernelSize(params.kernelSize)
    tflite!._setUseSoftmax(params.useSoftmax?1:0)
    tflite!._setUsePadding(params.usePadding?1:0)
    tflite!._setThresholdWithoutSoftmax(params.threshold)

    const inputImageBufferOffset = tflite!._getInputImageBufferOffset()
    for (let i = 0; i < params.processWidth * params.processHeight; i++) {
        tflite!.HEAPU8[inputImageBufferOffset + i * 3 + 0] = src[i * 4 + 0]
        tflite!.HEAPU8[inputImageBufferOffset + i * 3 + 1] = src[i * 4 + 1]
        tflite!.HEAPU8[inputImageBufferOffset + i * 3 + 2] = src[i * 4 + 2]
    }

    tflite!._exec(params.processWidth, params.processHeight)

    const outputLength = params.processWidth * params.processHeight
    if(resultArray.length !== outputLength){
        resultArray = Array<number>(outputLength)
    }
    const outputImageBufferOffset = tflite!._getOutputImageBufferOffset() 
    for(let i = 0; i < outputLength; i++){
        resultArray[i] = tflite!.HEAPU8[outputImageBufferOffset + i ]
    }
    return resultArray
}


onmessage = async (event) => {
    if (event.data.message === WorkerCommand.INITIALIZE) {
        ready = false
        const config = event.data.config as GoogleMeetSegmentationTFLiteConfig

        const mod = require('../resources/tflite.js');
        console.log("[WORKER] module initializing...", mod)

        tflite = await mod()
        console.log("[WORKER]: mod", mod)
        console.log("[WORKER]: Test Access", tflite, tflite!._getInputImageBufferOffset())

        const modelResponse = await fetch(config.modelPath)
        console.log("[model]", config.modelPath)
        const model = await modelResponse.arrayBuffer()
        console.log('[WORKER]: Model Size:', model.byteLength);
        const modelBufferOffset = tflite!._getModelBufferMemoryOffset()
        tflite!.HEAPU8.set(new Uint8Array(model), modelBufferOffset)
        const res = tflite!._loadModel(model.byteLength)
        console.log('[WORKER]: Load Result:', res)

        ready = true
        ctx.postMessage({ message: WorkerResponse.INITIALIZED })

    } else if (event.data.message === WorkerCommand.PREDICT) {
        const data: Uint8ClampedArray = event.data.data
        const width = event.data.width
        const height = event.data.height
        const uid: number = event.data.uid
        const config: GoogleMeetSegmentationTFLiteConfig = event.data.config
        const params: GoogleMeetSegmentationTFLiteOperationParams = event.data.params

        if(ready === false) {
            console.log("NOTREADY!!",WorkerResponse.NOT_READY)
            ctx.postMessage({ message: WorkerResponse.NOT_READY , uid: uid})
        }else{
            const ar = new Uint8Array(event.data.data)
            const prediction = await predict(ar, config, params)
            const predBuffer = new Uint8ClampedArray(prediction)
    
            ctx.postMessage({ message: WorkerResponse.PREDICTED, uid: uid, prediction: predBuffer.buffer }, [predBuffer.buffer])
        }

        
    }
}

module.exports = [
    ctx
]