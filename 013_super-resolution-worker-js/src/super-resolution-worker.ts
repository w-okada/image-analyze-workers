import { BrowserType, getBrowserType } from './BrowserUtil'
import { InterpolationType, SuperResolutionConfig, SuperResolutionOperationParams, TFLite, WorkerCommand, WorkerResponse } from './const'
import {setWasmPath} from '@tensorflow/tfjs-backend-wasm';
export { SuperResolutionConfig, InterpolationType, SuperResolutionOperationParams  }
import * as tf from '@tensorflow/tfjs';

export const generateSuperResolutionDefaultConfig = ():SuperResolutionConfig => {
    const defaultConf:SuperResolutionConfig = {
        browserType         : getBrowserType(),
        processOnLocal      : true,
        modelPath           : "",
        workerPath          : "./super-resolution-worker-worker.js",
        enableSIMD          : true,
        useTFWasmBackend    : false,
        wasmPath            : "/tfjs-backend-wasm.wasm",
        tfjsModelPath       : "",
    }
    return defaultConf
}


export const generateDefaultSuperResolutionParams = ():SuperResolutionOperationParams => {
    const defaultParams:SuperResolutionOperationParams = {
        inputWidth          : 128,
        inputHeight         : 128,
        scaleFactor         : 2,
        interpolation       : InterpolationType.INTER_ESPCN,
        useSIMD             : true,
        useTensorflowjs     : false,
    }
    return defaultParams
}

const calcProcessSize = (width: number, height: number) => {
    const max_size = 2000
    if(Math.max(width, height) > max_size){
        const ratio = max_size / Math.max(width, height)
        return [width * ratio, height * ratio]
    }else{
        return [width, height]
    }
}


const load_module = async (config: SuperResolutionConfig) => {
    if(config.useTFWasmBackend){
        console.log("use wasm backend")
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
    mod:any
    modSIMD:any
    tflite?:TFLite
    tfliteSIMD?:TFLite
    tfliteLoaded = false
    inputCanvas = document.createElement("canvas")
    tfjsModel?:tf.LayersModel
    resultArray:number[] = Array<number>(300*300)

    ready = false
    init = async (config: SuperResolutionConfig) => {
        this.ready = false

        /// (x) Tensorflow JS 
        await load_module(config)
        await tf.ready()
        tf.env().set('WEBGL_CPU_FORWARD', false)
        this.tfjsModel = await tf.loadLayersModel(config.tfjsModelPath)

        /// (x) TensorflowLite
        const browserType = getBrowserType()
        this.mod = require('../resources/tflite.js');
        this.tflite = await this.mod()
        // console.log("[WORKER_MANAGER]:", this.mod)
        console.log("[WORKER_MANAGER]: Test Access", this.tflite, this.tflite!._getInputImageBufferOffset())
        const modelResponse = await fetch(config.modelPath)
        const model = await modelResponse.arrayBuffer()
        console.log('[WORKER_MANAGER]: Model Size:', model.byteLength);
        const modelBufferOffset = this.tflite!._getModelBufferMemoryOffset()
        this.tflite!.HEAPU8.set(new Uint8Array(model), modelBufferOffset)
        const res = this.tflite!._loadModel(model.byteLength)

        if(config.enableSIMD){
            console.log("[WORKER_MANAGER]: LOAD SIMD_MOD")
            if(browserType == BrowserType.SAFARI){
                this.modSIMD = require('../resources/tflite.js');
            }else{
                this.modSIMD = require('../resources/tflite-simd.js');
            }
            // console.log("[WORKER_MANAGER]:", this.modSIMD)
            this.tfliteSIMD  = await this.modSIMD()
            const modelSIMDBufferOffset = this.tfliteSIMD!._getModelBufferMemoryOffset()
            this.tfliteSIMD!.HEAPU8.set(new Uint8Array(model), modelSIMDBufferOffset)
            const res = this.tfliteSIMD!._loadModel(model.byteLength)
            console.log("[WORKER_MANAGER]: LOAD SIMD_MOD DONE")
        }
        console.log('[WORKER_MANAGER]: Load Result:', res)
        this.ready = true
    }

    predict = async (src:HTMLCanvasElement, config: SuperResolutionConfig, params: SuperResolutionOperationParams) => {
        let tflite
        if(params.useSIMD){
            tflite=this.tfliteSIMD
        }else{
            tflite=this.tflite
        }
        if(!tflite){
            return null
        }
        
        if(this.ready){
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
                        let prediction = this.tfjsModel!.predict(tensor) as tf.Tensor
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
        return null
    }
}

export class SuperResolutionWorkerManager{
    private workerBSL:Worker|null = null
    orgCanvas = document.createElement("canvas") // to resize canvas for WebWorker  

    private config = generateSuperResolutionDefaultConfig()
    private localWorker = new LocalWorker()
    init = async (config: SuperResolutionConfig|null) => {
        if(config != null){
            this.config = config
        }
        if(this.workerBSL){
            this.workerBSL.terminate()
        }
        this.workerBSL = null

        //// Local
        if(this.config.processOnLocal == true){
            await this.localWorker.init(this.config!)
            return 
        }

        //// Remote
        const workerBSL = new Worker(this.config.workerPath, { type: 'module' })
        console.log("[manager] send initialize request")
        workerBSL!.postMessage({message: WorkerCommand.INITIALIZE, config:this.config})
        const p = new Promise<void>((onResolve, onFail)=>{
            workerBSL!.onmessage = (event) => {
                console.log("[manager] receive event", event)
                if (event.data.message === WorkerResponse.INITIALIZED) {
                    console.log("WORKERSS INITIALIZED")
                    this.workerBSL = workerBSL
                    onResolve()
                }else{
                    console.log("opencv Initialization something wrong..")
                    onFail(event)
                }
            }
        })
        await p
        return
    }



    predict = async (src:HTMLCanvasElement | HTMLImageElement | HTMLVideoElement, params = generateDefaultSuperResolutionParams()) =>{
        //// (1) generate original canvas
        let processWidth, processHeight
        if(src instanceof HTMLImageElement){
            [processWidth, processHeight]= calcProcessSize(src.naturalWidth, src.naturalHeight)
        }
        if(src instanceof HTMLVideoElement){
            [processWidth, processHeight]= calcProcessSize(src.videoWidth, src.videoHeight)
        }
        if(src instanceof HTMLCanvasElement){
            processWidth  = src.width
            processHeight = src.height
        }
        if( processWidth === 0 ||  processHeight === 0 || !processWidth || !processHeight){
            return null
        }        

        //// (2) Local or Safari
        if(this.config.processOnLocal == true || this.config.browserType === BrowserType.SAFARI ){
            //// (2-1) generate original canvas
            this.orgCanvas.width = processWidth
            this.orgCanvas.height = processHeight

            const orgCanvasCtx = this.orgCanvas.getContext("2d")!        
            orgCanvasCtx.drawImage(src, 0, 0, this.orgCanvas.width, this.orgCanvas.height)
            
            //// (2-2) predict
            const res = await this.localWorker.predict(this.orgCanvas, this.config, params)            
            return res
        }

        //// (3) WebWorker
        /////// (3-1) Not initilaized return.
        if(!this.workerBSL){
            return null
        }

        /////// worker is initialized.
        ///// (3-2) geberate original canvas
        const offscreenCanvas = new OffscreenCanvas(processWidth, processHeight) 
        offscreenCanvas.getContext("2d")!.drawImage(src, 0, 0, processWidth, processHeight)
        const image = offscreenCanvas.transferToImageBitmap()
        ///// (3-3) post message 
        const uid = performance.now()
        this.workerBSL!.postMessage({
            message: WorkerCommand.PREDICT, uid:uid,
            config: this.config, params: params,
            image: image ,
        }, [image ])

        ///// (3-3) recevie message 
        const p = new Promise<Uint8Array>((resolve, reject)=>{
            this.workerBSL!.onmessage = (event) => {
                if(event.data.message === WorkerResponse.PREDICTED && event.data.uid === uid){
                    const prediction = event.data.prediction as Uint8Array
                    resolve(prediction)
                }else{
                    //// Only Drop the request...
                    console.log("something wrong..", event, event.data.message)
                    const prediction = event.data.prediction as Uint8Array
                    resolve(prediction)
                    // reject()
                }
            }        
        })
        const res = await p
        return res
    }
}




  