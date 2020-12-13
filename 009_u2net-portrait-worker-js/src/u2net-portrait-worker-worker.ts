import { WorkerCommand, WorkerResponse, U2NetPortraitConfig, U2NetPortraitOperationParams } from './const'
import * as tf from '@tensorflow/tfjs';
import { BrowserType } from './BrowserUtil';
import {setWasmPath} from '@tensorflow/tfjs-backend-wasm';
const ctx: Worker = self as any  // eslint-disable-line no-restricted-globals

let model:tf.GraphModel|null

const load_module = async (config: U2NetPortraitConfig) => {
    if(config.useTFWasmBackend || config.browserType === BrowserType.SAFARI){
      console.log("use wasm backend")
      require('@tensorflow/tfjs-backend-wasm')
      setWasmPath(config.wasmPath)
      await tf.setBackend("wasm")
    }else{
      console.log("use webgl backend")
      require('@tensorflow/tfjs-backend-webgl')
      await tf.setBackend("webgl")
    }
  }

// Case.1 Use ImageBitmap (for Chrome default)
const predict = async (image:ImageBitmap, config: U2NetPortraitConfig, params: U2NetPortraitOperationParams) => {
    const off = new OffscreenCanvas(params.processWidth, params.processHeight)
    const ctx = off.getContext("2d")!
    ctx.drawImage(image, 0, 0, off.width, off.height)
    const imageData = ctx.getImageData(0, 0, off.width, off.height)

    let bm:number[][]|null = null
    tf.tidy(()=>{
        let tensor = tf.browser.fromPixels(imageData)
        tensor = tf.sub(tensor.expandDims(0).div(127.5), 1)
//        tensor = tensor.expandDims(0).div(255)
        let prediction = model!.predict(tensor) as tf.Tensor
        console.log(prediction)
        bm = prediction.arraySync() as number[][]
    })
    return bm
}

// Case.2 Use ImageBitmap (for Safari or special intent)
const predictWithData = async (data: Uint8ClampedArray , config: U2NetPortraitConfig, params: U2NetPortraitOperationParams) => {
    const imageData = new ImageData(data, params.processWidth, params.processHeight)

    let bm:number[][]|null = null
    tf.tidy(()=>{
        let tensor = tf.browser.fromPixels(imageData)
        tensor = tf.sub(tensor.expandDims(0).div(127.5), 1)
        let prediction = model!.predict(tensor) as tf.Tensor
        bm = prediction.arraySync() as number[][]
    })
    return bm
}

onmessage = async (event) => {
    //  console.log("event", event)
    if (event.data.message === WorkerCommand.INITIALIZE) {
        const config = event.data.config as U2NetPortraitConfig
        await load_module(config)
        tf.ready().then(async()=>{
            tf.env().set('WEBGL_CPU_FORWARD', false)
            model = await tf.loadGraphModel(config.modelPath)
            console.log(model.inputs)
            console.log(model.inputNodes)
            console.log(model.outputs)
            console.log(model.outputNodes)
            ctx.postMessage({ message: WorkerResponse.INITIALIZED})
        })
    } else if (event.data.message === WorkerCommand.PREDICT) {
        //    console.log("requested predict bodypix.")
        const image: ImageBitmap = event.data.image
        const data = event.data.data
        const config: U2NetPortraitConfig = event.data.config
        const params: U2NetPortraitOperationParams = event.data.params
        const uid: number = event.data.uid

        console.log("current backend[worker thread]:",tf.getBackend())
        if(data){ // Case.2
            console.log("Browser SAFARI")
            const prediction  = await predictWithData(data, config, params)
            ctx.postMessage({ message: WorkerResponse.PREDICTED, uid: uid, prediction: prediction })
        }else{ // Case.1
            const prediction = await predict(image, config, params)
            ctx.postMessage({ message: WorkerResponse.PREDICTED, uid: uid, prediction: prediction })
        }
    }
}
