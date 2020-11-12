import { WorkerResponse, WorkerCommand, CartoonConfig, CartoonOperatipnParams, CartoonFunctionType } from "./const"
import { getBrowserType, BrowserType } from "./BrowserUtil";
import * as tf from '@tensorflow/tfjs';

export {  } from './const'
export { BrowserType, getBrowserType} from './BrowserUtil';

export const generateCartoonDefaultConfig = ():CartoonConfig => {
    const defaultConf:CartoonConfig = {
        browserType         : getBrowserType(),
        processOnLocal      : false,
        useTFWasmBackend    : false,
        modelPath           : "/white-box-cartoonization/model.json",
        wasmPath            : "/tfjs-backend-wasm.wasm",
        workerPath          : "/white-box-cartoonization-worker-worker.js"
    }
    return defaultConf
}


export const generateDefaultCartoonParams = ():CartoonOperatipnParams => {
    const defaultParams:CartoonOperatipnParams = {
        type                : CartoonFunctionType.Cartoon,
        processWidth        : 320,
        processHeight       : 320,
    }
    return defaultParams
}

const load_module = async (config: CartoonConfig) => {
//    if(config.useTFWasmBackend || config.browserType === BrowserType.SAFARI){
    if(config.useTFWasmBackend){
        console.log("use wasm backend")
      require('@tensorflow/tfjs-backend-wasm')
      await tf.setBackend("wasm")
    }else{
      console.log("use webgl backend")
      require('@tensorflow/tfjs-backend-webgl')
      await tf.setBackend("webgl")
    }
  }

export class LocalCT{
    model:tf.GraphModel|null = null
    canvas = document.createElement("canvas")

    init = (config: CartoonConfig) => {
        const p = new Promise((onResolve, onFail) => {
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

    predict = async (targetCanvas:HTMLCanvasElement, config: CartoonConfig, params: CartoonOperatipnParams) => {
        console.log("current backend[main thread]:",tf.getBackend())
        // ImageData作成
        this.canvas.width  = params.processWidth
        this.canvas.height = params.processHeight
        const ctx = this.canvas.getContext("2d")!
        ctx.drawImage(targetCanvas, 0, 0, this.canvas.width, this.canvas.height)
        
        tf.tidy(()=>{
            let tensor = tf.browser.fromPixels(this.canvas)
            tensor = tf.sub(tensor.expandDims(0).div(127.5), 1)
            let prediction = this.model!.predict(tensor) as tf.Tensor
        
            const alpha = tf.ones([1, params.processWidth, params.processHeight, 1])
            prediction = tf.concat([prediction, alpha], 3)
            prediction = tf.add(prediction, 1)
            prediction = tf.mul(prediction, 127.5)
            prediction = prediction.flatten()
            prediction = tf.cast(prediction, "int32")
            prediction = tf.squeeze(prediction as tf.Tensor)    
            let imgArray = prediction.arraySync() as number[]
            let imgArray2 = new Uint8ClampedArray(imgArray.length)
            imgArray2.set(imgArray)
            const outputImage = new ImageData(imgArray2, this.canvas.width, this.canvas.height)
            ctx.putImageData(outputImage, 0, 0)
        })

        return this.canvas
    
    }
}



export class CartoonWorkerManager{
    private workerCT:Worker|null = null
    private canvasOut = document.createElement("canvas")
    private canvas = document.createElement("canvas")
    private config = generateCartoonDefaultConfig()
    private localCT = new LocalCT()
    init(config: CartoonConfig|null){
        if(config != null){
            this.config = config
        }
        if(this.workerCT){
            this.workerCT.terminate()
        }

        if(this.config.processOnLocal == true){
            return new Promise((onResolve, onFail) => {
                this.localCT.init(this.config!).then(() => {
                    onResolve()
                })
            })
        }

        // Bodypix 用ワーカー
        this.workerCT = new Worker(this.config.workerPath, { type: 'module' })
        this.workerCT!.postMessage({message: WorkerCommand.INITIALIZE, config:this.config})
        const p = new Promise((onResolve, onFail)=>{
            this.workerCT!.onmessage = (event) => {
                if (event.data.message === WorkerResponse.INITIALIZED) {
                    console.log("WORKERSS INITIALIZED")
                    onResolve()
                }else{
                    console.log("cartoon Initialization something wrong..")
                    onFail(event)
                }
            }
        })
        return p
    }

    predict(targetCanvas:HTMLCanvasElement, params = generateDefaultCartoonParams()):Promise<HTMLCanvasElement>{
        if(this.config.processOnLocal == true){
            // Case.1 Process on local thread.
            const p = new Promise(async(onResolve:(v:HTMLCanvasElement)=>void, onFail)=>{
                const convertedCanvas = await this.localCT.predict(targetCanvas, this.config, params)
                this.canvasOut.width = targetCanvas.width
                this.canvasOut.height = targetCanvas.height
                const ctx = this.canvasOut.getContext("2d")!
                ctx.drawImage(convertedCanvas, 0, 0, this.canvasOut.width, this.canvasOut.height)
                onResolve(this.canvasOut)
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
            const width     = imageData.width
            const height    = imageData.height
            const uid = performance.now()

            this.workerCT!.postMessage({ 
                message: WorkerCommand.PREDICT, uid:uid,
                config: this.config, params: params,
                data: dataArray
            }, [dataArray.buffer])
            const p = new Promise((onResolve:(v:HTMLCanvasElement)=>void, onFail)=>{
                this.workerCT!.onmessage = (event) => {
                    if(event.data.message === WorkerResponse.PREDICTED && event.data.uid === uid){
                        const outDataArray = event.data.converted
                        const outImageData = new ImageData(outDataArray, imageData.width, imageData.height)
                        this.canvas.width = imageData.width
                        this.canvas.height = imageData.height
                        this.canvas.getContext("2d")!.putImageData(outImageData, 0, 0)
                        this.canvasOut.width = targetCanvas.width
                        this.canvasOut.height = targetCanvas.height
                        const ctx = this.canvasOut.getContext("2d")!
                        ctx.drawImage(this.canvas, 0, 0, this.canvasOut.width, this.canvasOut.height)
                        onResolve(this.canvasOut)
                    }else{
                        console.log("cartoon Prediction something wrong..")
                        onFail(event)
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
            this.workerCT!.postMessage({ 
                message: WorkerCommand.PREDICT, uid:uid,
                config: this.config, params: params,
                // data: data, width: inImageData.width, height:inImageData.height
                image: imageBitmap
            }, [imageBitmap])
            const p = new Promise((onResolve:(v:HTMLCanvasElement)=>void, onFail)=>{
                this.workerCT!.onmessage = (event) => {
                    if(event.data.message === WorkerResponse.PREDICTED && event.data.uid === uid){
                        const imagedata = event.data.converted
                        this.canvasOut.width = targetCanvas.width
                        this.canvasOut.height = targetCanvas.height
                        const ctx = this.canvasOut.getContext("2d")!
                        ctx.drawImage(imagedata, 0, 0, targetCanvas.width, targetCanvas.height)
                        onResolve(this.canvasOut)
//                        console.log("worker!!!!", imageBitmap.width, imageBitmap.height)
                    }else{
                        console.log("cartoon Prediction something wrong..")
                        onFail(event)
                    }
                }        
            })
            return p
        }
    }
}
