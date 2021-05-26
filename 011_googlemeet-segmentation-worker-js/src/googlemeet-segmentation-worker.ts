import { getBrowserType, BrowserType } from "./BrowserUtil";
import * as tf from '@tensorflow/tfjs';
import { GoogleMeetSegmentationConfig, GoogleMeetSegmentationFunctionType, GoogleMeetSegmentationOperationParams, GoogleMeetSegmentationSmoothingType, WorkerCommand, WorkerResponse } from "./const";
import {setWasmPath} from '@tensorflow/tfjs-backend-wasm';
import { drawArrayToCanvas, imageToGrayScaleArray, padSymmetricImage } from "./utils";

export { GoogleMeetSegmentationSmoothingType } from './const'

export const generateGoogleMeetSegmentationDefaultConfig = ():GoogleMeetSegmentationConfig => {
    const defaultConf:GoogleMeetSegmentationConfig = {
        browserType         : getBrowserType(),
        processOnLocal      : false,
        useTFWasmBackend    : false,
        modelPath           : "/googlemeet-segmentation_128/model.json",
        wasmPath            : "/tfjs-backend-wasm.wasm",
        workerPath          : "./googlemeet-segmentation-worker-worker.js",

    }
    return defaultConf
}


export const generateDefaultGoogleMeetSegmentationParams = ():GoogleMeetSegmentationOperationParams => {
    const defaultParams:GoogleMeetSegmentationOperationParams = {
        type                : GoogleMeetSegmentationFunctionType.Segmentation,
        processWidth        : 128,
        processHeight       : 128,
        smoothingS          : 0,
        smoothingR          : 0,
        jbfWidth            : 128,
        jbfHeight           : 128,

        staticMemory        : false,
        lightWrapping       : false,
        smoothingType       : GoogleMeetSegmentationSmoothingType.JS,

        
        originalWidth       : 0,
        originalHeight      : 0,


        directToCanvs: false,
        toCanvas: null,
    }
    return defaultParams
}

const load_module = async (config: GoogleMeetSegmentationConfig) => {
    if(config.useTFWasmBackend){
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

export class LocalWorker{
    model:tf.GraphModel|null = null
    canvas = document.createElement("canvas")

    init = async (config: GoogleMeetSegmentationConfig) => {
        await load_module(config)
        await tf.ready()
        await tf.env().set('WEBGL_CPU_FORWARD', false)
        this.model = await tf.loadGraphModel(config.modelPath)
    }

    segCanvas = document.createElement("canvas")
    segResizedCanvas = document.createElement("canvas")
    imgResizedCanvas = document.createElement("canvas")
    matrix_js_map:{[key:string]:any} = {}

    predict_jbf_js_canvas = async (targetCanvas:HTMLCanvasElement, config: GoogleMeetSegmentationConfig, params: GoogleMeetSegmentationOperationParams):Promise<number[][]> => {
        const spatialKern = params.smoothingS
        const rangeKern = params.smoothingR
        let seg:number[][]|null = null
        let img:number[][]|null = null

        const perf1_start = performance.now()
        let perf2_start = 0
        let perf2_end = 0

        tf.tidy(()=>{
            let orgTensor = tf.browser.fromPixels(targetCanvas)
            let tensor = tf.image.resizeBilinear(orgTensor,[params.processHeight, params.processWidth])

            tensor = tensor.expandDims(0)        
            tensor = tf.cast(tensor, 'float32')
            tensor = tensor.div(255.0)
            perf2_start = performance.now()
            let prediction = this.model!.predict(tensor) as tf.Tensor
            perf2_end = performance.now()
            prediction = prediction.softmax()
            prediction = prediction.squeeze()
            let [predTensor0, predTensor1] = tf.split(prediction, 2, 2)
    
            predTensor0 = predTensor0.squeeze()
            seg = predTensor0.arraySync() as number[][]
        })
        const perf1_end = performance.now()
        console.log("[WORKER] PERFORMANCE", `${perf1_end-perf1_start}`, `${perf2_end-perf2_start}`)

        if(spatialKern===0 && rangeKern===0){
            return seg!
        }

        const width  = params.jbfWidth
        const height = params.jbfHeight
        drawArrayToCanvas(seg!, this.segCanvas) // Segmentation情報をCanvasに画像として書き出し

        this.segResizedCanvas.width  = width
        this.segResizedCanvas.height = height
        const segCtx = this.segResizedCanvas.getContext("2d")!
        segCtx.drawImage(this.segCanvas, 0, 0, width, height) // Segmentationの画像をJBF処理サイズにリサイズ

        const segImg = segCtx.getImageData(0, 0, width, height)
        seg = imageToGrayScaleArray(segImg)
        seg = padSymmetricImage(seg, spatialKern, spatialKern, spatialKern, spatialKern) // パディング

        this.imgResizedCanvas.width  = width
        this.imgResizedCanvas.height = height
        const imgCtx = this.segResizedCanvas.getContext("2d")!
        imgCtx.drawImage(targetCanvas, 0, 0, width, height)  // インプット画像をJBF処理サイズにリサイズ

        const imgImg = imgCtx.getImageData(0, 0, width, height)
        img = imageToGrayScaleArray(imgImg)
        img = padSymmetricImage(img, spatialKern, spatialKern, spatialKern, spatialKern) // パディング

        const matrix_js_map_key = `${params.smoothingR}`
        if(!this.matrix_js_map[matrix_js_map_key]){
            const gaussianRange   = 1 / Math.sqrt(2*Math.PI * (params.smoothingR*params.smoothingR))
            this.matrix_js_map[matrix_js_map_key] = Array.from(new Array(256)).map((v,i) => Math.exp(i*i*-1*gaussianRange))
        }
        const matrix_js = this.matrix_js_map[`${params.smoothingR}`]

    
        const result:number[][] = Array.from(new Array(height), () => new Array(width).fill(0));
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
}

export class GoogleMeetSegmentationWorkerManager{
    private workerGM:Worker|null = null
    private canvasOut = document.createElement("canvas")
    private canvas = document.createElement("canvas")
    private config = generateGoogleMeetSegmentationDefaultConfig()
    private localWorker = new LocalWorker()
    init = async (config: GoogleMeetSegmentationConfig|null) => {
        if(config != null){
            this.config = config
        }
        if(this.workerGM){
            this.workerGM.terminate()
        }
        this.workerGM = null

        if(this.config.processOnLocal == true){
            await this.localWorker.init(this.config!)
            return
        }

        // Bodypix 用ワーカー
        const workerGM = new Worker(this.config.workerPath, { type: 'module' })
        const p = new Promise<void>((onResolve, onFail)=>{
            workerGM!.onmessage = (event) => {
                if (event.data.message === WorkerResponse.INITIALIZED) {
                    console.log("WORKERSS INITIALIZED")
                    this.workerGM = workerGM
                    onResolve()
                }else{
                    console.log("celeb a mask Initialization something wrong..")
                    onFail(event)
                }
            }
        })
        workerGM!.postMessage({message: WorkerCommand.INITIALIZE, config:this.config})
        return
    }

    predict = async (targetCanvas:HTMLCanvasElement, params = generateDefaultGoogleMeetSegmentationParams())=>{
        if(this.config.processOnLocal == true){
            console.log("current backend[main thread]:",tf.getBackend())
            // Case.1 Process on local thread.
            const prediction = await this.localWorker.predict_jbf_js_canvas(targetCanvas, this.config, params)
            return prediction
        }
        if(!this.workerGM){
            return null
        }
        if(this.config.browserType === BrowserType.SAFARI){
            const imageData = targetCanvas.getContext("2d")!.getImageData(0, 0, targetCanvas.width, targetCanvas.height)
            const dataArray = imageData.data
            const uid = performance.now()
            params.originalWidth = imageData.width
            params.originalHeight = imageData.height

            this.workerGM!.postMessage({ 
                message: WorkerCommand.PREDICT, uid:uid,
                config: this.config, params: params,
                data: dataArray
            }, [dataArray.buffer])
            const p = new Promise((onResolve:(v:number[][])=>void, onFail)=>{
                this.workerGM!.onmessage = (event) => {
                    if(event.data.message === WorkerResponse.PREDICTED && event.data.uid === uid){
                        const prediction = event.data.prediction
                        onResolve(prediction)
                    }else{
                        console.log("Bodypix Prediction something wrong..", event.data.message, WorkerResponse.PREDICTED, event.data.uid, uid)
//                        onFail(event)
                    }
                }        
            })
            return p
        }else{
            // Case.3 Process on worker thread, Chrome (Send ImageBitmap)
            const off = new OffscreenCanvas(targetCanvas.width, targetCanvas.height)
            off.getContext("2d")!.drawImage(targetCanvas, 0, 0, targetCanvas.width, targetCanvas.height)
            const imageBitmap = off.transferToImageBitmap()
            const uid = performance.now()
            this.workerGM!.postMessage({ 
                message: WorkerCommand.PREDICT, uid:uid,
                config: this.config, params: params,
                // data: data, width: inImageData.width, height:inImageData.height
                image: imageBitmap
            }, [imageBitmap])
            const p = new Promise((onResolve:(v:number[][])=>void, onFail)=>{
                this.workerGM!.onmessage = (event) => {
                    if(event.data.message === WorkerResponse.PREDICTED && event.data.uid === uid){
                        const prediction = event.data.prediction
                        onResolve(prediction)
                    }else{
                        console.log("Bodypix Prediction something wrong..", event.data.message, WorkerResponse.PREDICTED, event.data.uid, uid)
                        // onFail(event)
                    }
                }        
            })
            return p
        }
    }
}




//// Utility for Demo

export const createForegroundImage = (srcCanvas:HTMLCanvasElement, prediction:number[][]) =>{
    const tmpCanvas = document.createElement("canvas")
    tmpCanvas.width = prediction[0].length
    tmpCanvas.height = prediction.length    
    const imageData = tmpCanvas.getContext("2d")!.getImageData(0, 0, tmpCanvas.width, tmpCanvas.height)
    const data = imageData.data

    for (let rowIndex = 0; rowIndex < tmpCanvas.height; rowIndex++) {
      for (let colIndex = 0; colIndex < tmpCanvas.width; colIndex++) {
        const seg_offset = ((rowIndex * tmpCanvas.width) + colIndex)
        const pix_offset = ((rowIndex * tmpCanvas.width) + colIndex) * 4
        if(prediction[rowIndex][colIndex]>0.5){
            data[pix_offset + 0] = 70
            data[pix_offset + 1] = 30
            data[pix_offset + 2] = 30
            data[pix_offset + 3] = 200
          }else{
            data[pix_offset + 0] = 0
            data[pix_offset + 1] = 0
            data[pix_offset + 2] = 0
            data[pix_offset + 3] = 0
          }
      }
    }
    const imageDataTransparent = new ImageData(data, tmpCanvas.width, tmpCanvas.height);
    tmpCanvas.getContext("2d")!.putImageData(imageDataTransparent, 0, 0)

    const outputCanvas = document.createElement("canvas")

    outputCanvas.width = srcCanvas.width
    outputCanvas.height = srcCanvas.height
    const ctx = outputCanvas.getContext("2d")!
    ctx.drawImage(tmpCanvas, 0, 0, outputCanvas.width, outputCanvas.height)
    const outImageData = ctx.getImageData(0, 0, outputCanvas.width, outputCanvas.height)
    return  outImageData

}



  