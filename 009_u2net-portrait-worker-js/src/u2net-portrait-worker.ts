import { getBrowserType, BrowserType } from "./BrowserUtil";
import * as tf from '@tensorflow/tfjs';
import { U2NetPortraitConfig, U2NetPortraitOperationParams, U2NetPortraitFunctionType, WorkerCommand, WorkerResponse } from "./const";
import {setWasmPath} from '@tensorflow/tfjs-backend-wasm';

export const generateU2NetPortraitDefaultConfig = ():U2NetPortraitConfig => {
    const defaultConf:U2NetPortraitConfig = {
        browserType         : getBrowserType(),
        processOnLocal      : false,
        useTFWasmBackend    : false,
        modelPath           : "/u2net-portrait/model.json",
        wasmPath            : "/tfjs-backend-wasm.wasm",
        workerPath          : "/u2net-portrait-worker-worker.js"

    }
    return defaultConf
}


export const generateDefaultU2NetPortraitParams = ():U2NetPortraitOperationParams => {
    const defaultParams:U2NetPortraitOperationParams = {
        type                : U2NetPortraitFunctionType.Portrait,
        processWidth        : 256,
        processHeight       : 256,
    }
    return defaultParams
}

const load_module = async (config: U2NetPortraitConfig) => {
    if(config.useTFWasmBackend){
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

export class LocalWorker{
    model:tf.GraphModel|null = null
    canvas = document.createElement("canvas")

    init = (config: U2NetPortraitConfig) => {
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

    predict = async (targetCanvas:HTMLCanvasElement, config: U2NetPortraitConfig, params: U2NetPortraitOperationParams):Promise<number[][]> => {
        console.log("current backend[main thread]:",tf.getBackend())
        // ImageData作成
        this.canvas.width  = params.processWidth
        this.canvas.height = params.processHeight
        const ctx = this.canvas.getContext("2d")!
        ctx.drawImage(targetCanvas, 0, 0, this.canvas.width, this.canvas.height)
        let bm:number[][]
        tf.tidy(()=>{
            let tensor = tf.browser.fromPixels(this.canvas)
            tensor = tf.sub(tensor.expandDims(0).div(127.5), 1)
            let prediction = this.model!.predict(tensor) as tf.Tensor
            console.log(prediction)
            bm = prediction.arraySync() as number[][]
        })
        return bm!
    }
}



export class U2NetPortraitWorkerManager{
    private workerCT:Worker|null = null
    private canvasOut = document.createElement("canvas")
    private canvas = document.createElement("canvas")
    private config = generateU2NetPortraitDefaultConfig()
    private localWorker = new LocalWorker()
    init(config: U2NetPortraitConfig|null){
        if(config != null){
            this.config = config
        }
        if(this.workerCT){
            this.workerCT.terminate()
        }

        if(this.config.processOnLocal == true){
            return new Promise((onResolve, onFail) => {
                this.localWorker.init(this.config!).then(() => {
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
                    console.log("celeb a mask Initialization something wrong..")
                    onFail(event)
                }
            }
        })
        return p
    }

    predict(targetCanvas:HTMLCanvasElement, params = generateDefaultU2NetPortraitParams()):Promise<number[][]>{
        if(this.config.processOnLocal == true){
            // Case.1 Process on local thread.
            const p = new Promise(async(onResolve:(v:number[][])=>void, onFail)=>{
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

            this.workerCT!.postMessage({ 
                message: WorkerCommand.PREDICT, uid:uid,
                config: this.config, params: params,
                data: dataArray
            }, [dataArray.buffer])
            const p = new Promise((onResolve:(v:number[][])=>void, onFail)=>{
                this.workerCT!.onmessage = (event) => {
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
            const p = new Promise((onResolve:(v:number[][])=>void, onFail)=>{
                this.workerCT!.onmessage = (event) => {
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


