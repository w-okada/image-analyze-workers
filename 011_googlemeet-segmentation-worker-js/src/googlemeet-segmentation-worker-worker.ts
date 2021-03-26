import { GoogleMeetSegmentationConfig,  GoogleMeetSegmentationOperationParams,  GoogleMeetSegmentationSmoothingType,  WorkerCommand, WorkerResponse, } from './const'
import * as tf from '@tensorflow/tfjs';
import { BrowserType } from './BrowserUtil';
import {setWasmPath} from '@tensorflow/tfjs-backend-wasm';
import { drawArrayToCanvas, imageToGrayScaleArray, padSymmetricImage } from './utils';
import { browser } from '@tensorflow/tfjs';

const ctx: Worker = self as any  // eslint-disable-line no-restricted-globals

let model:tf.GraphModel|null

const load_module = async (config: GoogleMeetSegmentationConfig) => {
    console.log(config.browserType)
    if(config.useTFWasmBackend || config.browserType === BrowserType.SAFARI){
      console.log("use cpu backend, wasm doesnot support enough function")
      require('@tensorflow/tfjs-backend-wasm')
      setWasmPath(config.wasmPath)
      await tf.setBackend("wasm")
    //   await tf.setBackend("cpu")
    }else{
      console.log("use webgl backend")
      require('@tensorflow/tfjs-backend-webgl')
      try{
        await tf.setBackend("webgl")
      }catch{
        await tf.setBackend("cpu")
      }
    }
}


const matrix_js_map:{[key:string]:any} = {}
const output_memory_map:{[key:string]:any} = {}

const segCanvas = new OffscreenCanvas(100,100)
const segResizedCanvas = new OffscreenCanvas(100,100)
const imgResizedCanvas = new OffscreenCanvas(100,100)
const predict_jbf_js_canvas = async (image:ImageBitmap, config: GoogleMeetSegmentationConfig, params: GoogleMeetSegmentationOperationParams):Promise<number[][][]>=> {
    const off = new OffscreenCanvas(params.processWidth, params.processHeight)
    const ctx = off.getContext("2d")!
    ctx.drawImage(image, 0, 0, off.width, off.height)
    const imageData = ctx.getImageData(0, 0, off.width, off.height)

    const spatialKern = params.smoothingS

    let seg:number[][]|null = null
    let img:number[][]|null = null
    tf.tidy(()=>{
        let orgTensor = tf.browser.fromPixels(imageData)
        // let tensor = tf.image.resizeBilinear(orgTensor,[params.processHeight, params.processWidth])
        let tensor = orgTensor.expandDims(0)        
        tensor = tf.cast(tensor, 'float32')
        tensor = tensor.div(255.0)
        let prediction = model!.predict(tensor) as tf.Tensor
        prediction = prediction.squeeze()
        prediction = prediction.softmax()
        let [predTensor0, predTensor1] = tf.split(prediction, 2, 2)

        predTensor0 = predTensor0.squeeze()
        seg = predTensor0.arraySync() as number[][]
    })

    const width  = params.jbfWidth
    const height = params.jbfHeight
    drawArrayToCanvas(seg!, segCanvas)
    segResizedCanvas.width  = width
    segResizedCanvas.height = height
    const segCtx = segResizedCanvas.getContext("2d")!
    // segCtx.imageSmoothingEnabled = true;
    // segCtx.imageSmoothingQuality = "low"
    // //@ts-ignore
    // segCtx.mozImageSmoothingEnabled = true;
    // //@ts-ignore
    // segCtx.webkitImageSmoothingEnabled = true;
    // //@ts-ignore
    // segCtx.msImageSmoothingEnabled = true;

    segCtx.drawImage(segCanvas, 0, 0, width, height)
    const segImg = segCtx.getImageData(0, 0, width, height)
    seg = imageToGrayScaleArray(segImg)
    seg = padSymmetricImage(seg, spatialKern, spatialKern, spatialKern, spatialKern)
    imgResizedCanvas.width  = width
    imgResizedCanvas.height = height
    const imgCtx = segResizedCanvas.getContext("2d")!
    imgCtx.drawImage(image, 0, 0, width, height)
    const imgImg = imgCtx.getImageData(0, 0, width, height)
    img = imageToGrayScaleArray(imgImg)
    img = padSymmetricImage(img, spatialKern, spatialKern, spatialKern, spatialKern)


    const matrix_js_map_key = `${params.smoothingR}`
    if(!matrix_js_map[matrix_js_map_key]){
        const gaussianRange   = 1 / Math.sqrt(2*Math.PI * (params.smoothingR*params.smoothingR))
        matrix_js_map[matrix_js_map_key] = Array.from(new Array(256)).map((v,i) => Math.exp(i*i*-1*gaussianRange))
    }
    const matrix_js = matrix_js_map[`${params.smoothingR}`]

    const result = Array.from(new Array(height), () => new Array(width).fill(0));
    for(let i=spatialKern; i<spatialKern+height; i++){
        for(let j=spatialKern; j<spatialKern+width; j++){
            const centerVal = img![i][j]
            let norm = 0
            let sum  = 0
            for(let ki = 0 ; ki < spatialKern*2+1; ki++){
                for(let kj = 0 ; kj < spatialKern*2+1; kj++){
                    const index = Math.floor(Math.abs(img![i - spatialKern + ki][j-spatialKern + kj] - centerVal))
                    const val = matrix_js[index]
                    norm += val
                    sum += seg![i - spatialKern + ki][j-spatialKern + kj] * val
                }
            }
            result[i - spatialKern][j - spatialKern] = sum/norm
        }
    }
    return result
}



const predict_jbf_js_WithData = async (data: Uint8ClampedArray, config: GoogleMeetSegmentationConfig, params: GoogleMeetSegmentationOperationParams):Promise<number[][][]>=> {
    const imageData = new ImageData(data, params.originalWidth, params.originalHeight)

    const spatialKern = params.smoothingS
    let seg:number[][]|null = null
    let img:number[][]|null = null
    tf.tidy(()=>{
        let orgTensor = tf.browser.fromPixels(imageData)
        let tensor = tf.image.resizeBilinear(orgTensor,[params.processHeight, params.processWidth])
        tensor = tensor.expandDims(0)        
        tensor = tf.cast(tensor, 'float32')
        tensor = tensor.div(255.0)
        let prediction = model!.predict(tensor) as tf.Tensor
        prediction = prediction.squeeze()
        prediction = prediction.softmax()
        let [predTensor0, predTensor1] = tf.split(prediction, 2, 2)

        orgTensor = tf.image.resizeBilinear(orgTensor, [params.jbfWidth, params.jbfHeight])
        predTensor0 = tf.image.resizeBilinear(predTensor0, [params.jbfWidth, params.jbfHeight])
        let newTensor = orgTensor.mean(2).toFloat()
        predTensor0 = predTensor0.squeeze()
        newTensor   = newTensor.mirrorPad([[spatialKern,spatialKern],[spatialKern,spatialKern]], 'symmetric')
        predTensor0 = predTensor0.mirrorPad([[spatialKern,spatialKern],[spatialKern,spatialKern]], 'symmetric')        

        predTensor0 = predTensor0.squeeze()
        predTensor0 = tf.cast(predTensor0.mul(255),'float32')

        seg = predTensor0.arraySync() as number[][]
        img = newTensor.arraySync()  as number[][]
    })

    const width  = params.jbfWidth
    const height = params.jbfHeight

    const matrix_js_map_key = `${params.smoothingR}`
    if(!matrix_js_map[matrix_js_map_key]){
        const gaussianRange   = 1 / Math.sqrt(2*Math.PI * (params.smoothingR*params.smoothingR))
        matrix_js_map[matrix_js_map_key] = Array.from(new Array(256)).map((v,i) => Math.exp(i*i*-1*gaussianRange))
        // matrix_js_map[matrix_js_map_key] = Array.from(new Array(256)).map((v,i) => Math.exp(i*i*-1*params.smoothingR))
    }

    const output_memory_map_key = `${width}x${height}`
    if(!output_memory_map[output_memory_map_key] || params.staticMemory === false){
        output_memory_map[output_memory_map_key] = Array.from(new Array(height), () => new Array(width).fill(0))
    }

    const matrix_js = matrix_js_map[matrix_js_map_key]
    const result    = output_memory_map[output_memory_map_key]

    for(let i=spatialKern; i<spatialKern+height; i++){
        for(let j=spatialKern; j<spatialKern+width; j++){
            const centerVal = img![i][j]
            let norm = 0
            let sum  = 0
            for(let ki = 0 ; ki < spatialKern*2+1; ki++){
                for(let kj = 0 ; kj < spatialKern*2+1; kj++){
                    const index = Math.floor(Math.abs(img![i - spatialKern + ki][j-spatialKern + kj] - centerVal))
                    const val = matrix_js[index]
                    norm += val
                    sum += seg![i - spatialKern + ki][j-spatialKern + kj] * val
                }
            }
            result[i - spatialKern][j - spatialKern] = sum/norm
        }
    }
    return result
}



onmessage = async (event) => {
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
            let prediction
            prediction = await predict_jbf_js_WithData(data, config, params)
            ctx.postMessage({ message: WorkerResponse.PREDICTED, uid: uid, prediction: prediction })
        }else{ // Case.1
            let prediction
            prediction = await predict_jbf_js_canvas(image, config, params)
            ctx.postMessage({ message: WorkerResponse.PREDICTED, uid: uid, prediction: prediction })
        }
    }
}
