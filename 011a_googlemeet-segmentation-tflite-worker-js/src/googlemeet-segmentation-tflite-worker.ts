import { getBrowserType } from "./BrowserUtil"
import { GoogleMeetSegmentationTFLiteConfig, GoogleMeetSegmentationTFLiteFunctionType, GoogleMeetSegmentationTFLiteOperationParams, TFLite, WorkerCommand, WorkerResponse } from "./const"

export const generateGoogleMeetSegmentationTFLiteDefaultConfig = ():GoogleMeetSegmentationTFLiteConfig => {
    const defaultConf:GoogleMeetSegmentationTFLiteConfig = {
        browserType         : getBrowserType(),
        processOnLocal      : false,
        modelPath           : "/segm_lite_v681.tflite",
        workerPath          : "./googlemeet-segmentation-tflite-worker-worker.js",
    }
    return defaultConf
}


export const generateDefaultGoogleMeetSegmentationTFLiteParams = ():GoogleMeetSegmentationTFLiteOperationParams => {
    const defaultParams:GoogleMeetSegmentationTFLiteOperationParams = {
        type                : GoogleMeetSegmentationTFLiteFunctionType.Segmentation,
        processWidth        : 256,
        processHeight       : 256,
        kernelSize          : 2,
        useSoftmax          : true,
        usePadding          : false,
        threshold           : 0.1,
        useSIMD             : false,
        interpolation       : 1
    }
    return defaultParams
}

export class LocalWorker{
    mod:any
    tflite?:TFLite
    tfliteLoaded = false
    tmpCanvas = document.createElement("canvas")
    resultArray:number[] = Array<number>(300*300)

    ready = false
    init = async (config: GoogleMeetSegmentationTFLiteConfig) => {
        this.ready = false
        if(!this.mod){
            this.mod = require('../resources/tflite.js');
        }
        this.tflite = await this.mod()
        console.log("[WORKER_MANAGER]:", this.mod)
        console.log("[WORKER_MANAGER]: Test Access", this.tflite, this.tflite!._getInputImageBufferOffset())
        const modelResponse = await fetch(config.modelPath)
        const model = await modelResponse.arrayBuffer()
        console.log('[WORKER_MANAGER]: Model Size:', model.byteLength);
        const modelBufferOffset = this.tflite!._getModelBufferMemoryOffset()
        this.tflite!.HEAPU8.set(new Uint8Array(model), modelBufferOffset)
        const res = this.tflite!._loadModel(model.byteLength)
        this.ready = true
        console.log('[WORKER_MANAGER]: Load Result:', res)
    }

    

    predict = async (src:HTMLCanvasElement | HTMLImageElement | HTMLVideoElement, config: GoogleMeetSegmentationTFLiteConfig, params: GoogleMeetSegmentationTFLiteOperationParams) => {
        if(this.ready){
            this.tmpCanvas.width = params.processWidth
            this.tmpCanvas.height = params.processHeight
            this.tflite!._setKernelSize(params.kernelSize)
            this.tflite!._setUseSoftmax(params.useSoftmax?1:0)
            this.tflite!._setUsePadding(params.usePadding?1:0)
            this.tflite!._setThresholdWithoutSoftmax(params.threshold)
            this.tflite!._setInterpolation(params.interpolation)

            
            const tmpCtx = this.tmpCanvas.getContext("2d")!
            tmpCtx.drawImage(src, 0, 0, this.tmpCanvas.width, this.tmpCanvas.height)
            const imageData = tmpCtx.getImageData(0, 0, this.tmpCanvas.width, this.tmpCanvas.height)
            const inputImageBufferOffset = this.tflite!._getInputImageBufferOffset()
            for (let i = 0; i < this.tmpCanvas.width * this.tmpCanvas.height; i++) {
                this.tflite!.HEAPU8[inputImageBufferOffset + i * 3 + 0] = imageData.data[i * 4 + 0]
                this.tflite!.HEAPU8[inputImageBufferOffset + i * 3 + 1] = imageData.data[i * 4 + 1]
                this.tflite!.HEAPU8[inputImageBufferOffset + i * 3 + 2] = imageData.data[i * 4 + 2]
            }
    
            this.tflite!._exec(this.tmpCanvas.width, this.tmpCanvas.height)
    
            const outputLength = this.tmpCanvas.width * this.tmpCanvas.height
            if(this.resultArray.length !== outputLength){
                this.resultArray = Array<number>(outputLength)
            }
            const outputImageBufferOffset = this.tflite!._getOutputImageBufferOffset() 
            for(let i = 0; i < outputLength; i++){
                this.resultArray[i] = this.tflite!.HEAPU8[outputImageBufferOffset + i ]
            }
    
        }
        return this.resultArray
    }

}



export class GoogleMeetSegmentationTFLiteWorkerManager{
    private workerGML:Worker|null = null
    tmpCanvas = document.createElement("canvas") // to resize canvas for WebWorker  

    private config = generateGoogleMeetSegmentationTFLiteDefaultConfig()
    private localWorker = new LocalWorker()
    init = async (config: GoogleMeetSegmentationTFLiteConfig|null) => {
        if(config != null){
            this.config = config
        }
        if(this.workerGML){
            this.workerGML.terminate()
        }

        //// Local
        if(this.config.processOnLocal == true){
            await this.localWorker.init(this.config!)
            return 
        }

        //// Remote
        this.workerGML = new Worker(this.config.workerPath, { type: 'module' })
        console.log("[manager] send initialize request")
        this.workerGML!.postMessage({message: WorkerCommand.INITIALIZE, config:this.config})
        const p = new Promise<void>((onResolve, onFail)=>{
            this.workerGML!.onmessage = (event) => {
                console.log("[manager] receive event", event)
                if (event.data.message === WorkerResponse.INITIALIZED) {
                    console.log("WORKERSS INITIALIZED")
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

    async predict(src:HTMLCanvasElement | HTMLImageElement | HTMLVideoElement, params = generateDefaultGoogleMeetSegmentationTFLiteParams()){
        if(this.config.processOnLocal == true){
            const res = await this.localWorker.predict(src, this.config, params)
            return res
        }else{
            this.tmpCanvas.width = params.processWidth
            this.tmpCanvas.height = params.processHeight
            const tmpCtx = this.tmpCanvas.getContext("2d")!
            tmpCtx.drawImage(src, 0, 0, this.tmpCanvas.width, this.tmpCanvas.height)
            const data = tmpCtx.getImageData(0, 0, this.tmpCanvas.width, this.tmpCanvas.height)

            const uid = performance.now()
            this.workerGML!.postMessage({ 
                message: WorkerCommand.PREDICT, uid:uid,
                config: this.config, params: params,
                data: data.data.buffer,
            }, [data.data.buffer])

            const p = new Promise((onResolve:(v:Uint8Array)=>void, onFail)=>{
                this.workerGML!.onmessage = (event) => {
                    if(event.data.message === WorkerResponse.PREDICTED && event.data.uid === uid){
                        const prediction = event.data.prediction as number[]
                        onResolve(new Uint8Array(prediction))
                    }else{
                        //// Only Drop the request...
                        console.log("something wrong..", event, event.data.message)
                        const prediction = event.data.prediction as number[]
                        onResolve(new Uint8Array(prediction))
                    }
                }        
            })
            const res = await p
            return res
        }
    }
}




  