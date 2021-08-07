import { BrowserType } from "./BrowserUtil";
import { SuperResolutionConfig, SuperResolutionOperationParams, TFLite, WorkerCommand, WorkerResponse } from "./const";

const ctx: Worker = self as any  // eslint-disable-line no-restricted-globals
let tflite:TFLite | null = null
let tfliteSIMD:TFLite | null = null
let ready:boolean = false


const predict = async (src:OffscreenCanvas, config: SuperResolutionConfig, params: SuperResolutionOperationParams) => {
    let currentTFLite 
    if(params.useSIMD){
        currentTFLite = tfliteSIMD
    }else{
        currentTFLite = tflite
    }
    if(!currentTFLite){
        return null
    }

    const imageData = src.getContext("2d")!.getImageData(0, 0, params.inputWidth, params.inputHeight)
    tflite!.HEAPU8.set(imageData.data, tflite!._getInputImageBufferOffset())
    tflite!._exec(params.inputWidth, params.inputHeight, params.interpolation)
    const outputImageBufferOffset = tflite!._getOutputImageBufferOffset() 
    const resizedWidth = params.inputWidth * params.scaleFactor
    const resizedHeight = params.inputHeight * params.scaleFactor
    return tflite!.HEAPU8.slice(outputImageBufferOffset, outputImageBufferOffset + resizedWidth * resizedHeight * 4)
}

onmessage = async (event) => {
    if (event.data.message === WorkerCommand.INITIALIZE) {
        ready = false
        const config = event.data.config as SuperResolutionConfig

        console.log("[WORKER] module initializing...")

        let mod;
        const browserType = config.browserType
        mod = require('../resources/tflite.js');

        tflite = await mod()
        // console.log("[WORKER]: mod", mod)
        console.log("[WORKER]: Test Access", tflite, tflite!._getInputImageBufferOffset())

        const modelResponse = await fetch(config.modelPath)
        console.log("[model]", config.modelPath)
        const model = await modelResponse.arrayBuffer()
        console.log('[WORKER]: Model Size:', model.byteLength);
        const modelBufferOffset = tflite!._getModelBufferMemoryOffset()
        tflite!.HEAPU8.set(new Uint8Array(model), modelBufferOffset)
        const res = tflite!._loadModel(model.byteLength)
        console.log('[WORKER]: Load Result:', res)

        if(config.enableSIMD){
            console.log("[WORKER_MANAGER]: LOAD SIMD_MOD")
            let modSIMD ;

            if(browserType == BrowserType.SAFARI){
                modSIMD = require('../resources/tflite.js');
            }else{
                modSIMD = require('../resources/tflite-simd.js');
            }


            // console.log("[WORKER_MANAGER]:", modSIMD)
            tfliteSIMD  = await modSIMD()
            const modelSIMDBufferOffset = tfliteSIMD!._getModelBufferMemoryOffset()
            tfliteSIMD!.HEAPU8.set(new Uint8Array(model), modelSIMDBufferOffset)
            const res = tfliteSIMD!._loadModel(model.byteLength)
            console.log("[WORKER_MANAGER]: LOAD SIMD_MOD DONE")
        }

        ready = true
        ctx.postMessage({ message: WorkerResponse.INITIALIZED })

    } else if (event.data.message === WorkerCommand.PREDICT) {
        const uid: number = event.data.uid
        const config: SuperResolutionConfig = event.data.config
        const params: SuperResolutionOperationParams = event.data.params
        const image: ImageBitmap = event.data.image;
        const canvas = new OffscreenCanvas(image.width, image.height)
        canvas.getContext("2d")!.drawImage(image, 0, 0)

        if(ready === false) {
            console.log("NOTREADY!!",WorkerResponse.NOT_READY)
            ctx.postMessage({ message: WorkerResponse.NOT_READY , uid: uid})
        }else{
            const prediction = await predict(canvas, config, params)
    
            ctx.postMessage({ message: WorkerResponse.PREDICTED, uid: uid, prediction: prediction })
        }
    }
}

module.exports = [
    ctx
]