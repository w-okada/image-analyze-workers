import { getBrowserType, BrowserType } from "./BrowserUtil";
import * as tf from '@tensorflow/tfjs';
import { GoogleMeetSegmentationConfig, GoogleMeetSegmentationFunctionType, GoogleMeetSegmentationOperationParams, WorkerCommand, WorkerResponse } from "./const";
import {setWasmPath} from '@tensorflow/tfjs-backend-wasm';

export const generateGoogleMeetSegmentationDefaultConfig = ():GoogleMeetSegmentationConfig => {
    const defaultConf:GoogleMeetSegmentationConfig = {
        browserType         : getBrowserType(),
        processOnLocal      : false,
        useTFWasmBackend    : false,
        modelPath           : "/googlemeet-segmentation_128/model.json",
        wasmPath            : "/tfjs-backend-wasm.wasm",
        workerPath          : "./googlemeet-segmentation-worker-worker.js"
    }
    return defaultConf
}


export const generateDefaultGoogleMeetSegmentationParams = ():GoogleMeetSegmentationOperationParams => {
    const defaultParams:GoogleMeetSegmentationOperationParams = {
        type                : GoogleMeetSegmentationFunctionType.Segmentation,
        processWidth        : 128,
        processHeight       : 128,
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

    init = (config: GoogleMeetSegmentationConfig) => {
        const p = new Promise<void>((onResolve, onFail) => {
            load_module(config).then(()=>{
                tf.ready().then(async()=>{
                    tf.env().set('WEBGL_CPU_FORWARD', false)
                    this.model = await tf.loadGraphModel(config.modelPath)
                    onResolve()                    
                })
            })
        })
        return p
    }

    predict = async (targetCanvas:HTMLCanvasElement, config: GoogleMeetSegmentationConfig, params: GoogleMeetSegmentationOperationParams):Promise<number[][][]> => {
        console.log("current backend[main thread]:",tf.getBackend())
        // // ImageData作成
        // this.canvas.width  = params.processWidth
        // this.canvas.height = params.processHeight
        // const ctx = this.canvas.getContext("2d")!
        // ctx.drawImage(targetCanvas, 0, 0, this.canvas.width, this.canvas.height)
        let bm:number[][][]|null = null
        tf.tidy(()=>{
            let tensor = tf.browser.fromPixels(targetCanvas)
            tensor = tf.image.resizeBilinear(tensor,[params.processWidth, params.processHeight])
            tensor = tensor.expandDims(0)
            tensor = tf.cast(tensor, 'float32')
            // tensor = tensor.div(tf.max(tensor).div(2))
            // tensor = tensor.sub(1.0)
            tensor = tensor.div(255)

            let prediction = this.model!.predict(tensor) as tf.Tensor
            prediction = prediction.softmax()
            prediction = prediction.squeeze()
            bm = prediction.arraySync() as number[][][]

        })
        return bm!
    }
}



export class GoogleMeetSegmentationWorkerManager{
    private workerGM:Worker|null = null
    private canvasOut = document.createElement("canvas")
    private canvas = document.createElement("canvas")
    private config = generateGoogleMeetSegmentationDefaultConfig()
    private localWorker = new LocalWorker()
    init(config: GoogleMeetSegmentationConfig|null){
        if(config != null){
            this.config = config
        }
        if(this.workerGM){
            this.workerGM.terminate()
        }

        if(this.config.processOnLocal == true){
            return new Promise<void>((onResolve, onFail) => {
                this.localWorker.init(this.config!).then(() => {
                    onResolve()
                })
            })
        }

        // Bodypix 用ワーカー
        this.workerGM = new Worker(this.config.workerPath, { type: 'module' })
        this.workerGM!.postMessage({message: WorkerCommand.INITIALIZE, config:this.config})
        const p = new Promise<void>((onResolve, onFail)=>{
            this.workerGM!.onmessage = (event) => {
                if (event.data.message === WorkerResponse.INITIALIZED) {
                    console.log("WORKERSS INITIALIZED")
                    onResolve()
                }else{
                    console.log("celeb a mask Initialization something wrong..")
                    onFail(event)
                }
            }
        })
        return p
    }

    predict(targetCanvas:HTMLCanvasElement, params = generateDefaultGoogleMeetSegmentationParams()):Promise<number[][][]>{
        if(this.config.processOnLocal == true){
            // Case.1 Process on local thread.
            const p = new Promise(async(onResolve:(v:number[][][])=>void, onFail)=>{
                const prediction = await this.localWorker.predict(targetCanvas, this.config, params)
                onResolve(prediction)
            })
            return p            
//            return null
        }else if(this.config.browserType === BrowserType.SAFARI){
            // Case.2 Process on worker thread, Safari (Send dataArray) 
            this.canvas.width = params.processWidth
            this.canvas.height = params.processHeight
            const ctx = this.canvas.getContext("2d")!
            ctx.drawImage(targetCanvas, 0, 0, this.canvas.width, this.canvas.height)
            const imageData = ctx.getImageData(0, 0, this.canvas.width, this.canvas.height)
            const dataArray = imageData.data
            const uid = performance.now()

            this.workerGM!.postMessage({ 
                message: WorkerCommand.PREDICT, uid:uid,
                config: this.config, params: params,
                data: dataArray
            }, [dataArray.buffer])
            const p = new Promise((onResolve:(v:number[][][])=>void, onFail)=>{
                this.workerGM!.onmessage = (event) => {
                    if(event.data.message === WorkerResponse.PREDICTED && event.data.uid === uid){
                        const prediction = event.data.prediction
                        onResolve(prediction)
                    }else{
                        console.log("celeb a mask Prediction something wrong..")
                        onFail(event)
                    }
                }        
            })
            return p
        }else{
            // Case.3 Process on worker thread, Chrome (Send ImageBitmap)
            //console.log("WORKER:",targetCanvas.width, targetCanvas.height)
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
            const p = new Promise((onResolve:(v:number[][][])=>void, onFail)=>{
                this.workerGM!.onmessage = (event) => {
                    if(event.data.message === WorkerResponse.PREDICTED && event.data.uid === uid){
                        const prediction = event.data.prediction
                        onResolve(prediction)
                    }else{
                        console.log("celeb a mask Prediction something wrong..")
                        onFail(event)
                    }
                }        
            })
            return p
        }
    }
}




//// Utility for Demo

export const createForegroundImage = (srcCanvas:HTMLCanvasElement, prediction:number[][][]) =>{
    const tmpCanvas = document.createElement("canvas")
    tmpCanvas.width = prediction[0].length
    tmpCanvas.height = prediction.length    
    const imageData = tmpCanvas.getContext("2d")!.getImageData(0, 0, tmpCanvas.width, tmpCanvas.height)
    const data = imageData.data

    const useIndex = 0

    for (let rowIndex = 0; rowIndex < tmpCanvas.height; rowIndex++) {
      for (let colIndex = 0; colIndex < tmpCanvas.width; colIndex++) {
        const seg_offset = ((rowIndex * tmpCanvas.width) + colIndex)
        const pix_offset = ((rowIndex * tmpCanvas.width) + colIndex) * 4
        if(prediction[rowIndex][colIndex][useIndex]>0.5){
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



  