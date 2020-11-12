import { WorkerCommand, WorkerResponse, CartoonConfig, CartoonOperatipnParams } from './const'
import * as tf from '@tensorflow/tfjs';
import { BrowserType } from './BrowserUtil';

const ctx: Worker = self as any  // eslint-disable-line no-restricted-globals

let model:tf.GraphModel|null

const load_module = async (config: CartoonConfig) => {
    if(config.useTFWasmBackend || config.browserType === BrowserType.SAFARI){
      console.log("use wasm backend")
      require('@tensorflow/tfjs-backend-wasm')
      await tf.setBackend("wasm")
    }else{
      console.log("use webgl backend")
      require('@tensorflow/tfjs-backend-webgl')
      await tf.setBackend("webgl")
    }
  }

// Case.1 Use ImageBitmap (for Chrome default)
const predict = async (image:ImageBitmap, config: CartoonConfig, params: CartoonOperatipnParams) => {
    const off = new OffscreenCanvas(params.processWidth, params.processHeight)
    const ctx = off.getContext("2d")!
    ctx.drawImage(image, 0, 0, off.width, off.height)
    const imageData = ctx.getImageData(0, 0, off.width, off.height)

    tf.tidy(()=>{
        let tensor = tf.browser.fromPixels(imageData)
        tensor = tf.sub(tensor.expandDims(0).div(127.5), 1)
        let prediction = model!.predict(tensor) as tf.Tensor
    
        const alpha = tf.ones([1,params.processWidth,params.processHeight,1])
        prediction = tf.concat([prediction, alpha], 3)
        prediction = tf.add(prediction, 1)
        prediction = tf.mul(prediction, 127.5)
        prediction = prediction.flatten()
        prediction = tf.cast(prediction, "int32")
        prediction = tf.squeeze(prediction as tf.Tensor)    
        let imgArray = prediction.arraySync() as number[]
        let imgArray2 = new Uint8ClampedArray(imgArray.length)
        imgArray2.set(imgArray)
        const  outputImage = new ImageData(imgArray2, params.processWidth, params.processHeight)
        ctx.putImageData(outputImage, 0, 0)
    })
    return off.transferToImageBitmap()
}

// Case.2 Use ImageBitmap (for Safari or special intent)
const predictWithData = async (data: Uint8ClampedArray , config: CartoonConfig, params: CartoonOperatipnParams) => {
    const imageData = new ImageData(data, params.processWidth, params.processHeight)

    let imgArray2:Uint8ClampedArray
    tf.tidy(()=>{
        let tensor = tf.browser.fromPixels(imageData)
        tensor = tf.sub(tensor.expandDims(0).div(127.5), 1)
        let prediction = model!.predict(tensor) as tf.Tensor
    
        const alpha = tf.ones([1, params.processWidth, params.processHeight,1])
        prediction = tf.concat([prediction, alpha], 3)
        prediction = tf.add(prediction, 1)
        prediction = tf.mul(prediction, 127.5)
        prediction = prediction.flatten()
        prediction = tf.cast(prediction, "int32")
        prediction = tf.squeeze(prediction as tf.Tensor)    
        let imgArray = prediction.arraySync() as number[]
        let imgArray2 = new Uint8ClampedArray(imgArray.length)
        imgArray2.set(imgArray)
    })
    return imgArray2!
}

onmessage = async (event) => {
    //  console.log("event", event)
    if (event.data.message === WorkerCommand.INITIALIZE) {
        const config = event.data.config as CartoonConfig
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
        const config: CartoonConfig = event.data.config
        const params: CartoonOperatipnParams = event.data.params
        const uid: number = event.data.uid

        console.log("current backend[worker thread]:",tf.getBackend())
        if(data){ // Case.2
            console.log("Browser SAFARI")
            const dataArray = await predictWithData(data, config, params)
            ctx.postMessage({ message: WorkerResponse.PREDICTED, uid: uid, converted: dataArray }, [dataArray.buffer])
        }else{ // Case.1
            const imageData = await predict(image, config, params)
            ctx.postMessage({ message: WorkerResponse.PREDICTED, uid: uid, converted: imageData }, [imageData])
        }
    }
}
