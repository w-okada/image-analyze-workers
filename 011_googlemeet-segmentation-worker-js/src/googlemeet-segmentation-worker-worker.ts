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
    const off = new OffscreenCanvas(params.processWidth, params.processWidth)
    const ctx = off.getContext("2d")!
    ctx.drawImage(image, 0, 0, off.width, off.height)
    const imageData = ctx.getImageData(0, 0, off.width, off.height)


    let bm:number[][][]|null = null
    tf.tidy(()=>{
        let tensor = tf.browser.fromPixels(imageData)
        // tensor = tf.image.resizeBilinear(tensor,[params.processWidth, params.processHeight])
        tensor = tensor.expandDims(0)
        tensor = tf.cast(tensor, 'float32')
        // tensor = tensor.div(tf.max(tensor))
        // tensor = tensor.sub(0.485).div(0.229)

        // tensor = tensor.div(tf.max(tensor).div(2))
        // tensor = tensor.sub(1.0)

        tensor = tensor.div(255.0)

        let prediction = model!.predict(tensor) as tf.Tensor
        // console.log("Max!",tf.max(prediction).arraySync(), "Min!",tf.min(prediction).arraySync(), )
        console.log(prediction)
        prediction = prediction.squeeze()
        prediction = prediction.softmax()
        let [predTensor0, predTensor1] = tf.split(prediction, 2, 2)
        bm = predTensor0.arraySync() as number[][][]
    }) 
    // console.log(bm)
    return bm!
}


// // 
// // 特に高速化しない！！(fin.arraySyncで処理時間が爆発する)
// const tiles:{[key:string]:tf.Tensor} = {}
// const tile_zeros:{[key:string]:tf.Tensor} = {}
// const tile_ones:{[key:string]:tf.Tensor} = {}

// const predict_nouse = async (image:ImageBitmap, config: GoogleMeetSegmentationConfig, params: GoogleMeetSegmentationOperationParams):Promise<number[][][]>=> {
//     const off = new OffscreenCanvas(image.width, image.height)
//     const ctx = off.getContext("2d")!
//     ctx.drawImage(image, 0, 0, off.width, off.height)
//     const imageData = ctx.getImageData(0, 0, off.width, off.height)

//     const th_key = `{params.processWidth}x{params.processHeight}`
//     if(!tiles[th_key]){
//         console.log("create threshold1")
//         tiles[th_key] = tf.ones([params.processHeight, params.processWidth, 1]).mul(0.5)
//     }
//     if(!tile_ones[th_key]){
//         console.log("create threshold2")
//         tile_ones[th_key] = tf.ones([params.processHeight, params.processWidth, 1]).mul(255)
//     }
//     if(!tile_zeros[th_key]){
//         console.log("create threshold3")
//         tile_zeros[th_key] = tf.zeros([params.processHeight, params.processWidth, 1])
//     }
//     const th = tiles[th_key]
//     const tile_one = tile_ones[th_key]
//     const tile_zero = tile_zeros[th_key]

//     let bm:number[][][]|null = null
//     tf.tidy(()=>{
//         let orgTensor = tf.browser.fromPixels(imageData)
//         let tensor = tf.image.resizeBilinear(orgTensor, [params.processWidth, params.processHeight])
//         tensor = tensor.expandDims(0)
//         tensor = tf.cast(tensor, 'float32')
//         tensor = tensor.div(255.0)

//         let prediction = model!.predict(tensor) as tf.Tensor
//         console.log(prediction)
//         prediction = prediction.softmax()
//         prediction = prediction.squeeze()

//         let [predTensor0, predTensor1] = tf.split(prediction, 2, 2)

//         const cond = tf.less(predTensor0, th)
//         predTensor0 = tf.where(cond, tile_zero, tile_one)

//         let predTensor = tf.image.resizeBilinear(predTensor0 as tf.Tensor<tf.Rank.R3>,[image.height, image.width])
//         const fin = tf.concat([orgTensor, predTensor], 2)

//         bm = fin.arraySync() as number[][][]
//     }) 
//     return bm!
// }



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
        let [predTensor0, predTensor1] = tf.split(prediction, 2, 2)
        bm = predTensor0.arraySync() as number[][][]
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
