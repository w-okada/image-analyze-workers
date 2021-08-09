import { BrowserType } from "./BrowserUtil";
import { SuperResolutionConfig, SuperResolutionOperationParams, TFLite, WorkerCommand, WorkerResponse } from "./const";
import {setWasmPath} from '@tensorflow/tfjs-backend-wasm';
import * as tf from '@tensorflow/tfjs';
const ctx: Worker = self as any  // eslint-disable-line no-restricted-globals
let tflite:TFLite | null = null
let tfliteSIMD:TFLite | null = null
let ready:boolean = false
let tfjsModel:tf.LayersModel

const load_module = async (config: SuperResolutionConfig) => {
    if(config.useTFWasmBackend || config.browserType === BrowserType.SAFARI){
      console.log("use cpu backend, wasm doesnot support enough function")
      require('@tensorflow/tfjs-backend-wasm')
      setWasmPath(config.wasmPath)
      await tf.setBackend("cpu")
    }else{
      console.log("use webgl backend")
      require('@tensorflow/tfjs-backend-webgl')
      await tf.setBackend("webgl")
    }
  }

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

    if(params.useTensorflowjs){
        const imageData = src.getContext("2d")!.getImageData(0, 0, params.inputWidth, params.inputHeight)
        tflite!.HEAPU8.set(imageData.data, tflite!._getInputImageBufferOffset())
        tflite!._extractY(params.inputWidth, params.inputHeight)
        const YBufferOffset = tflite!._getYBufferOffset()
        const Y = tflite!.HEAPU8.slice(YBufferOffset, YBufferOffset + params.inputWidth * params.inputHeight)

        const resizedWidth = params.inputWidth * params.scaleFactor
        const resizedHeight = params.inputHeight * params.scaleFactor      
        let bm = [0]
        try{
            tf.tidy(()=>{
                let tensor = tf.tensor1d(Y)
                tensor = tensor.reshape([1, params.inputHeight, params.inputWidth, 1])
                tensor = tf.cast(tensor, 'float32')
                tensor = tensor.div(255.0)
                // console.log(tensor)
                let prediction = tfjsModel!.predict(tensor) as tf.Tensor
                //console.log(prediction)
                prediction = prediction.reshape([1, params.inputHeight, params.inputWidth, params.scaleFactor, params.scaleFactor, 1])
                // console.log(prediction)
                const prediction2 = prediction.split(params.inputHeight, 1)
                // console.log(prediction2)
                for(let i = 0;i < params.inputHeight; i++){
                    prediction2[i] = prediction2[i].squeeze([1])
                }
                const prediction3 = tf.concat(prediction2, 2)
                const prediction4 = prediction3.split(params.inputWidth, 1)
                for(let i = 0;i < params.inputWidth; i++){
                    prediction4[i] = prediction4[i].squeeze([1])
                }
                const prediction5 = tf.concat(prediction4, 2)
                // console.log(prediction5)
                bm = prediction5.reshape([resizedWidth*resizedHeight]).mul(255).cast('int32').arraySync() as number[]

                // console.log(bm)
            })
        }catch(exception){
            console.log(exception)
            return null
        }
        const scaledY = new Uint8ClampedArray(bm)

        const scaledYBufferOffset = tflite!._getScaledYBufferOffset()
        tflite!.HEAPU8.set(scaledY, scaledYBufferOffset)
        tflite!._mergeY(params.inputWidth, params.inputHeight, resizedWidth, resizedHeight)
        const outputImageBufferOffset = tflite!._getOutputImageBufferOffset() 
        return tflite!.HEAPU8.slice(outputImageBufferOffset, outputImageBufferOffset + resizedWidth * resizedHeight * 4)
    }else{
        const imageData = src.getContext("2d")!.getImageData(0, 0, params.inputWidth, params.inputHeight)
        tflite!.HEAPU8.set(imageData.data, tflite!._getInputImageBufferOffset())
        tflite!._exec(params.inputWidth, params.inputHeight, params.interpolation)
        const outputImageBufferOffset = tflite!._getOutputImageBufferOffset() 
        const resizedWidth = params.inputWidth * params.scaleFactor
        const resizedHeight = params.inputHeight * params.scaleFactor
        return tflite!.HEAPU8.slice(outputImageBufferOffset, outputImageBufferOffset + resizedWidth * resizedHeight * 4)
    }
}

onmessage = async (event) => {
    if (event.data.message === WorkerCommand.INITIALIZE) {
        ready = false
        const config = event.data.config as SuperResolutionConfig

        console.log("[WORKER] module initializing...")

        /// (x) TensorflowJS
        await load_module(config)
        await tf.ready()
        tf.env().set('WEBGL_CPU_FORWARD', false)
        tfjsModel = await tf.loadLayersModel(config.tfjsModelPath)


        /// (x) TensorflowLite
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