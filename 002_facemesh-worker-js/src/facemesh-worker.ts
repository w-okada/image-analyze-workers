import { WorkerResponse, WorkerCommand, FacemeshConfig, FacemeshFunctionType, FacemeshOperatipnParams, } from "./const"
import * as facemesh from '@tensorflow-models/facemesh'
import { getBrowserType, BrowserType } from "./BrowserUtil";
import * as tf from '@tensorflow/tfjs';

export { FacemeshConfig, FacemeshFunctionType, FacemeshOperatipnParams } from './const'
export { BrowserType, getBrowserType} from './BrowserUtil';
export { IMAGE_PATH } from "./DemoUtil"
export { AnnotatedPrediction } from "@tensorflow-models/facemesh" 
export { Coords3D } from '@tensorflow-models/facemesh/dist/util';
export const generateFacemeshDefaultConfig = ():FacemeshConfig => {
    const defaultConf:FacemeshConfig = {
        browserType           : getBrowserType(),
        useTFWasmBackend      : false,
        modelReloadInterval   : 1024 * 60,
        model                 :{
            maxContinuousChecks : 5,
            detectionConfidence : 0.9,
            maxFaces            : 10,
            iouThreshold        : 0.3,
            scoreThreshold      : 0.75
        },
        processOnLocal          : false
    }
    return defaultConf
}

export const generateDefaultFacemeshParams = () =>{
    const defaultParams: FacemeshOperatipnParams = {
        type          : FacemeshFunctionType.DetectMesh,
        processWidth  : 300,
        processHeight : 300,
    }
    return defaultParams
}

export class LocalFM{
    model: facemesh.FaceMesh|null = null
    canvas: HTMLCanvasElement = (()=>{
        const newCanvas = document.createElement("canvas")
        newCanvas.style.display="none"
        //document!.getRootNode()!.lastChild!.appendChild(newCanvas)
        return newCanvas
    })()

    init = (config: FacemeshConfig) => {
        return facemesh.load(config.model).then(res => {
            console.log("facemesh loaded locally", config)
            this.model = res
            
            return
        })
    }


    predict = async (targetCanvas: HTMLCanvasElement, config:FacemeshConfig, params:FacemeshOperatipnParams):Promise<any> => {
        // ImageData作成  
        const processWidth = (params.processWidth <= 0 || params.processHeight <= 0) ? targetCanvas.width : params.processWidth
        const processHeight = (params.processWidth <= 0 || params.processHeight <= 0) ? targetCanvas.height : params.processHeight 

        this.canvas.width = processWidth
        this.canvas.height = processHeight
        const ctx = this.canvas.getContext("2d")!
        ctx.drawImage(targetCanvas, 0, 0, processWidth, processHeight)
        const newImg = ctx.getImageData(0, 0, processWidth, processHeight)

        const  prediction = await this.model!.estimateFaces(newImg)
        return prediction
      }
}




export class FacemeshWorkerManager{
    private workerFM:Worker|null = null
    private canvas = document.createElement("canvas")

    private config = generateFacemeshDefaultConfig()
    private localFM = new LocalFM()

    private initializeModel_internal = () =>{
        this.workerFM = new Worker('./workerFM.ts', { type: 'module' })
        this.workerFM!.postMessage({message: WorkerCommand.INITIALIZE, config:this.config})
        const p = new Promise((onResolve, onFail)=>{
            this.workerFM!.onmessage = (event) => {
                if (event.data.message === WorkerResponse.INITIALIZED) {
                    console.log("WORKERSS INITIALIZED")
                    onResolve()
                }else{
                    console.log("Facemesh Initialization something wrong..")
                    onFail(event)
                }
            }
        })
        return p
    }

    // I afraid facemesh model invoke memory leak... 
    // For work around, set the model_reload_interval. If set 0, no reload.
    init = (config: FacemeshConfig|null) => {
        if(config != null){
            this.config = config
        }
        if(this.workerFM){
            this.workerFM.terminate()
        }


        if(this.config.processOnLocal === true){
            if(this.config.useTFWasmBackend){
                require('@tensorflow/tfjs-backend-wasm')
            }else{
                require('@tensorflow/tfjs-backend-webgl')
            }

            // safariはwebworkerでWebGLが使えないのでworkerは使わない。
            return new Promise((onResolve, onFail) => {
                tf.ready().then(()=>{
                    this.localFM!.init(this.config!).then(() => {
                        onResolve()
                    })
                })
            })
        }



        return this.initializeModel_internal()
    }

    model_reload_interval = 0
    model_refresh_counter = 0
    private liveCheck = async () =>{
        if(this.model_refresh_counter > this.config.modelReloadInterval && this.config.modelReloadInterval > 0){
            console.log("reload model! this is a work around for memory leak.")
            this.model_refresh_counter = 0
            if(this.config.browserType === BrowserType.SAFARI && this.config.processOnLocal === true){
                return new Promise((onResolve, onFail) => {
                    tf.ready().then(()=>{
                        this.localFM.init(this.config!).then(() => {
                            onResolve()
                        })
                    })
                })
            }else{
                this.workerFM?.terminate()
                return this.initializeModel_internal()
            }
        }else{
            this.model_refresh_counter += 1
        }
    }

    predict = (targetCanvas:HTMLCanvasElement, params:FacemeshOperatipnParams) => {
        if(this.config.processOnLocal===true){
            const p = new Promise(async (onResolve: (v: any) => void, onFail) => {
                await this.liveCheck()
                const prediction = await this.localFM.predict(targetCanvas, this.config, params)
                onResolve(prediction)
            })
            return p
        }else if(this.config.browserType == BrowserType.SAFARI){
            // safariはwebworkerでcanvas(offscreencanvas)が使えないので、縮小・拡大が面倒。ここでやっておく。
            let data:Uint8ClampedArray
            if(params.processHeight>0 && params.processWidth>0){
                this.canvas.width  = params.processWidth
                this.canvas.height = params.processHeight
                this.canvas.getContext("2d")!.drawImage(targetCanvas, 0, 0, params.processWidth, params.processHeight)
                data = this.canvas.getContext("2d")!.getImageData(0, 0, params.processWidth, params.processHeight).data
            }else{
                const ctx = targetCanvas.getContext("2d")!
                data = ctx.getImageData(0, 0, targetCanvas.width, targetCanvas.height)!.data
            }
            const uid = performance.now()

            const p = new Promise(async (onResolve: (v:facemesh.AnnotatedPrediction[]) => void, onFail) => {
                await this.liveCheck()
                
                this.workerFM!.postMessage({ 
                    message: WorkerCommand.PREDICT, uid:uid, 
                    config: this.config,
                    params: params,
                    data:data
                }, [data.buffer])

                this.workerFM!.onmessage = (event) => {
                    if(event.data.message === WorkerResponse.PREDICTED && event.data.uid === uid){
                        onResolve(event.data.prediction)
                    }else{
                        console.log("Facemesh Prediction something wrong..")
                        onFail(event)
                    }
                }
            })
            return p
        }else{
            const offscreen = new OffscreenCanvas(targetCanvas.width, targetCanvas.height)
            const offctx    = offscreen.getContext("2d")!
            offctx.drawImage(targetCanvas, 0, 0, targetCanvas.width, targetCanvas.height)
            const imageBitmap = offscreen.transferToImageBitmap()

            const uid = performance.now()
            const p = new Promise(async (onResolve:(v:facemesh.AnnotatedPrediction[])=>void, onFail)=>{
                await this.liveCheck()

                this.workerFM!.postMessage({ 
                    message: WorkerCommand.PREDICT, uid:uid, 
                    config: this.config,
                    params: params,
                    image: imageBitmap
                }, [imageBitmap])
                    this.workerFM!.onmessage = (event) => {
                    if(event.data.message === WorkerResponse.PREDICTED && event.data.uid === uid){
                        onResolve(event.data.prediction)
                    }else{
                        console.log("Facemesh Prediction something wrong..")
                        onFail(event)
                    }
                }        
            })
            return p
        }
    }
}
