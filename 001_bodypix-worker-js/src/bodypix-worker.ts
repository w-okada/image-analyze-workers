import { WorkerResponse, WorkerCommand, BodypixFunctionType, BodyPixConfig, ModelConfigMobileNetV1_05, BodyPixOperatipnParams } from "./const"
import * as bodyPix from '@tensorflow-models/body-pix'
import { BrowserType, getBrowserType } from "./BrowserUtil";
import { SemanticPersonSegmentation } from "@tensorflow-models/body-pix";

export { ModelConfigResNet, ModelConfigMobileNetV1, ModelConfigMobileNetV1_05, BodypixFunctionType } from './const'
export { BrowserType, getBrowserType} from './BrowserUtil';
export { IMAGE_PATH } from "./DemoUtil"
export {SemanticPersonSegmentation, SemanticPartSegmentation, PersonSegmentation, PartSegmentation} from '@tensorflow-models/body-pix'
export { BodyPixInternalResolution } from '@tensorflow-models/body-pix/dist/types';

export const generateBodyPixDefaultConfig = ():BodyPixConfig => {
    const defaultConf:BodyPixConfig = {
        browserType         : getBrowserType(),
        model               : ModelConfigMobileNetV1_05,
        processOnLocal      : false,
        workerPath          : "/bodypix-worker-worker.js"
    }
    return defaultConf
}

export const generateDefaultBodyPixParams = () =>{
    const defaultParams: BodyPixOperatipnParams = {
        type: BodypixFunctionType.SegmentPerson,
        segmentPersonParams:{
            flipHorizontal : false,
            internalResolution: "medium",
            segmentationThreshold: 0.7,
            maxDetections: 10,
            scoreThreshold: 0.3,
            nmsRadius: 20,
        },
        segmentPersonPartsParams:{
            flipHorizontal : false,
            internalResolution: "medium",
            segmentationThreshold: 0.7,
            maxDetections: 10,
            scoreThreshold: 0.3,
            nmsRadius: 20,
        },
        segmentMultiPersonParams:{
            flipHorizontal : false,
            internalResolution: "medium",
            segmentationThreshold: 0.7,
            maxDetections: 10,
            scoreThreshold: 0.3,
            nmsRadius: 20,
            minKeypointScore: 0.3,
            refineSteps:10
        },
        segmentMultiPersonPartsParams:{
            flipHorizontal : false,
            internalResolution: "medium",
            segmentationThreshold: 0.7,
            maxDetections: 10,
            scoreThreshold: 0.3,
            nmsRadius: 20,
            minKeypointScore: 0.3,
            refineSteps:10
        },
        processWidth        : 300,
        processHeight       : 300,

    }
    return defaultParams
}

class LocalBP {
    model: bodyPix.BodyPix | null = null
    canvas: HTMLCanvasElement = (()=>{
        const newCanvas = document.createElement("canvas")
        newCanvas.style.display="none"
        return newCanvas
    })()
    
    init = (config: BodyPixConfig) => {
        return bodyPix.load(config.model).then(res => {
            console.log("bodypix loaded locally", config)
            this.model = res
            return
        })
    }


    predict = async (targetCanvas: HTMLCanvasElement, config:BodyPixConfig, params:BodyPixOperatipnParams) => {
        // ImageData作成
        const processWidth = (params.processWidth <= 0 || params.processHeight <= 0) ? targetCanvas.width : params.processWidth
        const processHeight = (params.processWidth <= 0 || params.processHeight <= 0) ? targetCanvas.height : params.processHeight

        //console.log("process image size:", processWidth, processHeight)
        this.canvas.width = processWidth
        this.canvas.height = processHeight
        const ctx = this.canvas.getContext("2d")!
        ctx.drawImage(targetCanvas, 0, 0, processWidth, processHeight)
        const newImg = ctx.getImageData(0, 0, processWidth, processHeight)
      
        let prediction
        if(params.type === BodypixFunctionType.SegmentPerson){
          prediction = await this.model!.segmentPerson(newImg, params.segmentPersonParams)
        }else if(params.type === BodypixFunctionType.SegmentPersonParts){
          prediction = await this.model!.segmentPersonParts(newImg, params.segmentPersonPartsParams)
        }else if(params.type === BodypixFunctionType.SegmentMultiPerson){
          prediction = await this.model!.segmentMultiPerson(newImg, params.segmentMultiPersonParams)
        }else if(params.type === BodypixFunctionType.SegmentMultiPersonParts){
          prediction = await this.model!.segmentMultiPersonParts(newImg, params.segmentMultiPersonPartsParams)
        }else{// segmentPersonに倒す
          prediction = await this.model!.segmentPerson(newImg, params.segmentPersonParams)
        }
        return prediction
      }
}

export class BodypixWorkerManager {
    private workerBP: Worker | null = null

    config:BodyPixConfig = generateBodyPixDefaultConfig()
    private localBP = new LocalBP()

    init(config:BodyPixConfig|null = null) {
        if(config != null){
            this.config = config
        }
        if(this.workerBP){
            this.workerBP.terminate()
        }

        if(this.config.browserType === BrowserType.SAFARI || this.config.processOnLocal == true){
            // safariはwebworkerでWebGLが使えないのでworkerは使わない。
            return new Promise((onResolve, onFail) => {
                this.localBP.init(this.config!).then(() => {
                    onResolve()
                })
            })
        }
        

        this.workerBP = new Worker(this.config.workerPath, { type: 'module' })

        this.workerBP!.postMessage({ message: WorkerCommand.INITIALIZE, config: this.config })
        return new Promise((onResolve, onFail) => {
            this.workerBP!.onmessage = (event) => {
                if (event.data.message === WorkerResponse.INITIALIZED) {
                    console.log("WORKERSS INITIALIZED")
                    onResolve()
                } else {
                    console.log("Bodypix Initialization something wrong..")
                    onFail(event)
                }
            }
        })
    }

    predict(targetCanvas: HTMLCanvasElement, params:BodyPixOperatipnParams) {
        if(this.config.browserType === BrowserType.SAFARI || this.config.processOnLocal == true){
            const p = new Promise(async (onResolve: (v: any) => void, onFail) => {
                const prediction = await this.localBP.predict(targetCanvas, this.config, params)
                onResolve(prediction)
            })
            return p
        }else{
            const offscreen = new OffscreenCanvas(targetCanvas.width, targetCanvas.height)
            const offctx = offscreen.getContext("2d")!
            offctx.drawImage(targetCanvas, 0, 0, targetCanvas.width, targetCanvas.height)
            const imageBitmap = offscreen.transferToImageBitmap()
            const uid = performance.now()
            const p = new Promise((onResolve: (v:any) => void, onFail) => {
                this.workerBP!.postMessage({
                    message: WorkerCommand.PREDICT, uid: uid,
                    params:params, image: imageBitmap,
                    config:this.config
                }, [imageBitmap])

                this.workerBP!.onmessage = (event) => {
                    if (event.data.message === WorkerResponse.PREDICTED && event.data.uid === uid) {
                        onResolve(event.data.prediction)
                    } else {
                        console.log("Bodypix Prediction something wrong..")
                        onFail(event)
                    }
                }
            })
            return p
        }
    }
}



//// Utility for Demo
export const createForegroundImage = (srcCanvas:HTMLCanvasElement, prediction:SemanticPersonSegmentation) =>{
    const tmpCanvas = document.createElement("canvas")
    tmpCanvas.width = prediction.width
    tmpCanvas.height = prediction.height
    const imageData = tmpCanvas.getContext("2d")!.getImageData(0, 0, tmpCanvas.width, tmpCanvas.height)
    const data = imageData.data
    for (let rowIndex = 0; rowIndex < prediction.height; rowIndex++) {
      for (let colIndex = 0; colIndex < prediction.width; colIndex++) {
        const seg_offset = ((rowIndex * prediction.width) + colIndex)
        const pix_offset = ((rowIndex * prediction.width) + colIndex) * 4
  
        if (prediction.data[seg_offset] === 0) {
          data[pix_offset] = 0
          data[pix_offset + 1] = 0
          data[pix_offset + 2] = 0
          data[pix_offset + 3] = 0
        } else {
          data[pix_offset] = 255
          data[pix_offset + 1] = 255
          data[pix_offset + 2] = 255
          data[pix_offset + 3] = 255
        }
      }
    }
    const imageDataTransparent = new ImageData(data, prediction.width, prediction.height);
    tmpCanvas.getContext("2d")!.putImageData(imageDataTransparent, 0, 0)
  
    const outputCanvas = document.createElement("canvas")
  
    outputCanvas.width = srcCanvas.width
    outputCanvas.height = srcCanvas.height
    const ctx = outputCanvas.getContext("2d")!
    ctx.drawImage(tmpCanvas, 0, 0, outputCanvas.width, outputCanvas.height)
    ctx.globalCompositeOperation = 'source-in';
    ctx.drawImage(srcCanvas, 0, 0, outputCanvas.width, outputCanvas.height)
    const outputImage = outputCanvas.getContext("2d")!.getImageData(0, 0, outputCanvas.width, outputCanvas.height)
    tmpCanvas.remove()
    outputCanvas.remove()  
    return outputImage
  }