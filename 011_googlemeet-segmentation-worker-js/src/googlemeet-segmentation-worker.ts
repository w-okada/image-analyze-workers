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
    }
    return defaultParams
}


class JBFWasm {
    private static _instance:JBFWasm
    private constructor(){}
    private mod?:any

    private sm?:WebAssembly.Memory
    srcMemory?:Float32Array 
    segMemory?:Float32Array 
    outMemory?:Float32Array

    public static async getInstance():Promise<JBFWasm>{
        if(!this._instance){
            console.log("create instance")
            this._instance = new JBFWasm()
            const promise = await import("../crate/pkg")
            this._instance.mod = await promise['default']
            console.log("module loeded",this._instance.mod)
            const res = this._instance.mod.get_config()
            this._instance.sm = this._instance.mod?.shared_memory() as WebAssembly.Memory
            this._instance.srcMemory = new Float32Array(this._instance.sm.buffer, res[0]);
            this._instance.segMemory = new Float32Array(this._instance.sm.buffer, res[1]);
            this._instance.outMemory = new Float32Array(this._instance.sm.buffer, res[2]);
        }
        return this._instance
    }

    doFilter = (w:number, h:number, sp:number, range:number) =>{
        this.mod.do_filter(w, h ,sp, range)
    }
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
            console.log("load module")
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

    //// (1) Only Google Meet Segmentation (not Joint Bilateral Filter)
    predict = async (targetCanvas:HTMLCanvasElement, config: GoogleMeetSegmentationConfig, params: GoogleMeetSegmentationOperationParams):Promise<number[][][]> => {
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
            tensor = tensor.div(255)
            let prediction = this.model!.predict(tensor) as tf.Tensor
            prediction = prediction.softmax()
            prediction = prediction.squeeze()
            let [predTensor0, predTensor1] = tf.split(prediction, 2, 2)
            predTensor0 = tf.cast(predTensor0.mul(255),'float32')
            bm = predTensor0.arraySync() as number[][][]
        })
        return bm!
    }

    //// (2) With GPU JBF
    ///// Not implement


    //// (3) With JS JBF, Only BJF (resize and greyscale, padding are done in gpu)
    matrix_js_map:{[key:string]:any} = {}
    output_memory_map:{[key:string]:any} = {}
    predict_jbf_js = async (targetCanvas:HTMLCanvasElement, config: GoogleMeetSegmentationConfig, params: GoogleMeetSegmentationOperationParams):Promise<number[][][]> => {

        const spatialKern = params.smoothingS
        let seg:number[][]|null = null
        let img:number[][]|null = null
        tf.tidy(()=>{
            let orgTensor = tf.browser.fromPixels(targetCanvas)
            let tensor = tf.image.resizeBilinear(orgTensor,[params.processHeight, params.processWidth])

            tensor = tensor.expandDims(0)        
            tensor = tf.cast(tensor, 'float32')
            tensor = tensor.div(255.0)
            let prediction = this.model!.predict(tensor) as tf.Tensor
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
        if(!this.matrix_js_map[matrix_js_map_key]){
            const gaussianRange   = 1 / Math.sqrt(2*Math.PI * (params.smoothingR*params.smoothingR))
            this.matrix_js_map[matrix_js_map_key] = Array.from(new Array(256)).map((v,i) => Math.exp(i*i*-1*gaussianRange))
        }
    
        const output_memory_map_key = `${width}x${height}`
        if(!this.output_memory_map[output_memory_map_key] || params.staticMemory === false){
            this.output_memory_map[output_memory_map_key] = Array.from(new Array(height), () => new Array(width).fill(0))
        }
    
        const matrix_js = this.matrix_js_map[matrix_js_map_key]
        const result    = this.output_memory_map[output_memory_map_key]
    
    
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

    
    //// (4) With WASM JBF, Only BJF (resize and greyscale, padding are done in gpu)
    predict_jbf_wasm = async (targetCanvas:HTMLCanvasElement, config: GoogleMeetSegmentationConfig, params: GoogleMeetSegmentationOperationParams):Promise<number[][][]> => {
        const jbf = await JBFWasm.getInstance()

        const spatialKern = params.smoothingS
        let seg:number[][]|null = null
        let img:number[][]|null = null
        tf.tidy(()=>{
            let orgTensor = tf.browser.fromPixels(targetCanvas)
            let tensor = tf.image.resizeBilinear(orgTensor,[params.processHeight, params.processWidth])

            tensor = tensor.expandDims(0)        
            tensor = tf.cast(tensor, 'float32')
            tensor = tensor.div(255.0)
            let prediction = this.model!.predict(tensor) as tf.Tensor
            prediction = prediction.squeeze()
            prediction = prediction.softmax()
            let [predTensor0, predTensor1] = tf.split(prediction, 2, 2)
    
            orgTensor = tf.image.resizeBilinear(orgTensor, [params.jbfWidth, params.jbfHeight])
            predTensor0 = tf.image.resizeBilinear(predTensor0, [params.jbfWidth, params.jbfHeight])
            let newTensor = orgTensor.mean(2).toFloat()
            predTensor0 = predTensor0.squeeze()
            newTensor   = newTensor.mirrorPad([[spatialKern,spatialKern],[spatialKern,spatialKern]], 'symmetric')
            predTensor0 = predTensor0.mirrorPad([[spatialKern,spatialKern],[spatialKern,spatialKern]], 'symmetric')        
    
            // predTensor0 = predTensor0.squeeze().flatten()
            // predTensor0 = tf.cast(predTensor0.mul(255),'float32').flatten()
    
            seg = predTensor0.arraySync() as number[][]
            img = newTensor.arraySync()  as number[][]

        })

        const width  = params.jbfWidth
        const height = params.jbfHeight
        ////// !!!!!! This Copy is bottle neck!!!
        jbf.srcMemory?.set(img!.flat())
        jbf.segMemory?.set(seg!.flat())
    
    
        const output_memory_map_key = `${width}x${height}`
        if(!this.output_memory_map[output_memory_map_key] || params.staticMemory === false){
            this.output_memory_map[output_memory_map_key] = Array.from(new Array(height), () => new Array(width).fill(0))
        }
        const result    = this.output_memory_map[output_memory_map_key]
    
        jbf.doFilter(width, height, spatialKern, params.smoothingR)
    
        for(let i=0; i<height; i++){
            for(let j=0; j<width; j++){
                result[i][j] = jbf.outMemory![i*width + j]
            }
        }
        return result
    }

    //// (5) With JS JBF, JBF and resize and greyscale, padding
    segCanvas = document.createElement("canvas")
    segResizedCanvas = document.createElement("canvas")
    imgResizedCanvas = document.createElement("canvas")
    predict_jbf_js_canvas = async (targetCanvas:HTMLCanvasElement, config: GoogleMeetSegmentationConfig, params: GoogleMeetSegmentationOperationParams):Promise<number[][][]> => {
        const spatialKern = params.smoothingS
        let seg:number[][]|null = null
        let img:number[][]|null = null
        tf.tidy(()=>{
            let orgTensor = tf.browser.fromPixels(targetCanvas)
            let tensor = tf.image.resizeBilinear(orgTensor,[params.processHeight, params.processWidth])

            tensor = tensor.expandDims(0)        
            tensor = tf.cast(tensor, 'float32')
            tensor = tensor.div(255.0)
            let prediction = this.model!.predict(tensor) as tf.Tensor
            prediction = prediction.squeeze()
            prediction = prediction.softmax()
            let [predTensor0, predTensor1] = tf.split(prediction, 2, 2)
    
            predTensor0 = predTensor0.squeeze()
            seg = predTensor0.arraySync() as number[][]
        })

        const width  = params.jbfWidth
        const height = params.jbfHeight
        drawArrayToCanvas(seg!, this.segCanvas)
        this.segResizedCanvas.width  = width
        this.segResizedCanvas.height = height
        const segCtx = this.segResizedCanvas.getContext("2d")!
   
        segCtx.drawImage(this.segCanvas, 0, 0, width, height)
        const segImg = segCtx.getImageData(0, 0, width, height)
        seg = imageToGrayScaleArray(segImg)
        seg = padSymmetricImage(seg, spatialKern, spatialKern, spatialKern, spatialKern)
        this.imgResizedCanvas.width  = width
        this.imgResizedCanvas.height = height
        const imgCtx = this.segResizedCanvas.getContext("2d")!
        imgCtx.drawImage(targetCanvas, 0, 0, width, height)
        const imgImg = imgCtx.getImageData(0, 0, width, height)
        img = imageToGrayScaleArray(imgImg)
        img = padSymmetricImage(img, spatialKern, spatialKern, spatialKern, spatialKern)
            
        const matrix_js_map_key = `${params.smoothingR}`
        if(!this.matrix_js_map[matrix_js_map_key]){
            const gaussianRange   = 1 / Math.sqrt(2*Math.PI * (params.smoothingR*params.smoothingR))
            this.matrix_js_map[matrix_js_map_key] = Array.from(new Array(256)).map((v,i) => Math.exp(i*i*-1*gaussianRange))
        }
        const matrix_js = this.matrix_js_map[`${params.smoothingR}`]
    
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
            console.log("current backend[main thread]:",tf.getBackend())
            // Case.1 Process on local thread.
            const p = new Promise(async(onResolve:(v:number[][][])=>void, onFail)=>{
                let prediction
                if(params.smoothingS == 0 && params.smoothingR == 0){
                    prediction = await this.localWorker.predict(targetCanvas, this.config, params)
                }else{
                    switch(params.smoothingType){
                        case GoogleMeetSegmentationSmoothingType.JS:
                            prediction = await this.localWorker.predict_jbf_js(targetCanvas, this.config, params)
                            break
                        case GoogleMeetSegmentationSmoothingType.WASM: // Wasm for Local Works is currently not available(because not supported Multi Worker.)
                            prediction = await this.localWorker.predict_jbf_js(targetCanvas, this.config, params)
                            // prediction = await this.localWorker.predict_jbf_wasm(targetCanvas, this.config, params)
                            break
                        case GoogleMeetSegmentationSmoothingType.JS_CANVAS:
                            prediction = await this.localWorker.predict_jbf_js_canvas(targetCanvas, this.config, params)
                            break
                        default:
                            prediction = await this.localWorker.predict_jbf_js(targetCanvas, this.config, params)
                            break

                    }
                }
                onResolve(prediction)
            })
            return p            
//            return null
        }else if(this.config.browserType === BrowserType.SAFARI){
            // Case.2 Process on worker thread, Safari (Send dataArray) 
            // this.canvas.width = params.processWidth
            // this.canvas.height = params.processHeight
            // const ctx = this.canvas.getContext("2d")!
            // ctx.drawImage(targetCanvas, 0, 0, this.canvas.width, this.canvas.height)
            // const imageData = ctx.getImageData(0, 0, this.canvas.width, this.canvas.height)
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



  