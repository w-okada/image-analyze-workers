import { GoogleMeetSegmentationConfig,  GoogleMeetSegmentationOperationParams,  WorkerCommand, WorkerResponse, } from './const'
import * as tf from '@tensorflow/tfjs';
import { BrowserType } from './BrowserUtil';
import {setWasmPath} from '@tensorflow/tfjs-backend-wasm';
const ctx: Worker = self as any  // eslint-disable-line no-restricted-globals

let model:tf.GraphModel|null

const load_module = async (config: GoogleMeetSegmentationConfig) => {
    if(config.useTFWasmBackend || config.browserType === BrowserType.SAFARI){
      console.log("use cpu backend, wasm doesnot support enough function")
      require('@tensorflow/tfjs-backend-wasm')
      setWasmPath(config.wasmPath)
      //await tf.setBackend("wasm")
      await tf.setBackend("cpu")
    }else{
      console.log("use webgl backend")
      require('@tensorflow/tfjs-backend-webgl')
      await tf.setBackend("webgl")
    }
  }

// Case.1 Use ImageBitmap (for Chrome default)
const predict = async (image:ImageBitmap, config: GoogleMeetSegmentationConfig, params: GoogleMeetSegmentationOperationParams):Promise<number[][][]>=> {
    // const off = new OffscreenCanvas(params.processWidth, params.processHeight)
    // const ctx = off.getContext("2d")!
    // ctx.drawImage(image, 0, 0, off.width, off.height)
    // const imageData = ctx.getImageData(0, 0, off.width, off.height)
    //console.log(image.width, image.height)
    const off = new OffscreenCanvas(image.width, image.height)
    const ctx = off.getContext("2d")!
    ctx.drawImage(image, 0, 0, off.width, off.height)
    const imageData = ctx.getImageData(0, 0, off.width, off.height)

    let bm:number[][][]|null = null
    tf.tidy(()=>{
        let tensor = tf.browser.fromPixels(imageData)
        tensor = tf.image.resizeBilinear(tensor,[params.processWidth, params.processHeight])
        tensor = tensor.expandDims(0)
        tensor = tf.cast(tensor, 'float32')
        // tensor = tensor.div(tf.max(tensor))
        // tensor = tensor.sub(0.485).div(0.229)

        // tensor = tensor.div(tf.max(tensor).div(2))
        // tensor = tensor.sub(1.0)

        tensor = tensor.div(255.0)

        let prediction = model!.predict(tensor) as tf.Tensor
        // console.log("Max!",tf.max(prediction).arraySync(), "Min!",tf.min(prediction).arraySync(), )
        // console.log(prediction)
        prediction = prediction.softmax()
        prediction = prediction.squeeze()
        bm = prediction.arraySync() as number[][][]
    }) 
    // console.log(bm)
    return bm!
}

// Case.2 Use ImageBitmap (for Safari or special intent)
const predictWithData = async (data: Uint8ClampedArray , config: GoogleMeetSegmentationConfig, params: GoogleMeetSegmentationOperationParams):Promise<number[][][]> => {
    const imageData = new ImageData(data, params.processWidth, params.processHeight)

    let bm:number[][][]|null = null
    tf.tidy(()=>{
        let tensor = tf.browser.fromPixels(imageData)
        tensor = tensor.expandDims(0)
        tensor = tf.cast(tensor, 'float32')
        // tensor = tensor.div(tf.max(tensor))
        // tensor = tensor.sub(0.485).div(0.229)

        // tensor = tensor.div(tf.max(tensor).div(2))
        // tensor = tensor.sub(1.0)

        tensor = tensor.div(255.0)

        let prediction = model!.predict(tensor) as tf.Tensor
        prediction = prediction.softmax()
        prediction = prediction.squeeze()
        bm = prediction.arraySync() as number[][][]
    })
    return bm!
}

onmessage = async (event) => {
    //  console.log("event", event)
    if (event.data.message === WorkerCommand.INITIALIZE) {
        const config = event.data.config as GoogleMeetSegmentationConfig
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
        const config: GoogleMeetSegmentationConfig = event.data.config
        const params: GoogleMeetSegmentationOperationParams = event.data.params
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
