import { WorkerCommand, WorkerResponse } from './const'
import { PoseNetConfig, PoseNetFunctionType, PoseNetOperatipnParams } from './const'
import * as poseNet from '@tensorflow-models/posenet'
import { BrowserType } from './BrowserUtil'
import * as tf from '@tensorflow/tfjs';

const ctx: Worker = self as any  // eslint-disable-line no-restricted-globals

let model: poseNet.PoseNet | null


const predict = async (image: ImageBitmap, config:PoseNetConfig, params:PoseNetOperatipnParams):Promise<poseNet.Pose[]>=> {
    // ImageData作成
    //// input resolutionにリサイズするのでここでのリサイズは不要
    // const processWidth = (config.processWidth <= 0 || config.processHeight <= 0) ? image.width : config.processWidth
    // const processHeight = (config.processWidth <= 0 || config.processHeight <= 0) ? image.height : config.processHeight
    const processWidth = image.width
    const processHeight = image.height

    //console.log("process image size:", processWidth, processHeight)
    const offscreen = new OffscreenCanvas(processWidth, processHeight)
    const ctx = offscreen.getContext("2d")!
    ctx.drawImage(image, 0, 0, processWidth, processHeight)
    const newImg = ctx.getImageData(0, 0, processWidth, processHeight)

    if(params.type === PoseNetFunctionType.SinglePerson){
        const prediction = await model!.estimateSinglePose(newImg, params.singlePersonParams!)
        return [prediction]
    }else if(params.type === PoseNetFunctionType.MultiPerson){
        const prediction = await model!.estimateMultiplePoses(newImg, params.multiPersonParams!)
        return prediction
    }else{ // multi に倒す
        const prediction = await model!.estimateMultiplePoses(newImg, params.multiPersonParams!)
        return prediction
    }

}

const predictForSafari = async (data: Uint8ClampedArray, width: number, height: number, config: PoseNetConfig, params: PoseNetOperatipnParams) => {
    console.log("for safari!!!!!!!!!!!!!!!!!!!!!!!")
    // ImageData作成  
    // const processWidth = (config.processWidth <= 0 || config.processHeight <= 0) ? width : config.processWidth
    // const processHeight = (config.processWidth <= 0 || config.processHeight <= 0) ? height : config.processHeight

    const inImageData = new ImageData(new Uint8ClampedArray(data), width, height)
    const prediction = await model!.estimateSinglePose(inImageData, params.singlePersonParams!)
    return prediction
}

onmessage = async (event) => {
    if (event.data.message === WorkerCommand.INITIALIZE) {
        const config: PoseNetConfig = event.data.config
        if(config.browserType === BrowserType.SAFARI){
            // This code work with mobilenet but too slow(about 1sec) (ofcourse faster than cpu-backend(about10sec))
            // And with resenet, doesn't work(maxpooling not support?).
            // So currently I don't intent this code.  ( also (*1)line)
            // require('@tensorflow/tfjs-backend-wasm')
            // tf.setBackend("wasm")
        }
        console.log("backend: ",tf.getBackend())
        tf.ready().then(()=>{
            tf.env().set('WEBGL_CPU_FORWARD', false)
            poseNet.load(event.data.config.model).then(res => {
                console.log("bodypix loaded default", event.data.config)
                model = res
                ctx.postMessage({ message: WorkerResponse.INITIALIZED })
            })
        })
    } else if (event.data.message === WorkerCommand.PREDICT) {
        //    console.log("requested predict bodypix.")
        const config: PoseNetConfig = event.data.config
        const params: PoseNetOperatipnParams = event.data.params
        const image: ImageBitmap = event.data.image
        const data: Uint8ClampedArray = event.data.data
        const width = event.data.width
        const height = event.data.height
        const uid: number = event.data.uid
        const functionType = event.data.functionType
        //    console.log("functionType:", functionType)
        if (params.type === PoseNetFunctionType.SinglePerson) {
            //      const start = performance.now()
            let prediction
            if (data) {
                prediction = await predictForSafari(data, width, height, config, params)
                ctx.postMessage({ message: WorkerResponse.PREDICTED, uid: uid, prediction: prediction })
            } else {
                prediction = await predict(image, config, params)
                ctx.postMessage({ message: WorkerResponse.PREDICTED, uid: uid, prediction: prediction })
                image.close()
            }

        }else if(params.type === PoseNetFunctionType.MultiPerson){
            let prediction
            if (data) {
                prediction = await predictForSafari(data, width, height, config, params)
                ctx.postMessage({ message: WorkerResponse.PREDICTED, uid: uid, prediction: prediction })
            } else {
                prediction = await predict(image, config, params)
                ctx.postMessage({ message: WorkerResponse.PREDICTED, uid: uid, prediction: prediction })
                image.close()
            }
        } else {
            console.log("not implemented", functionType)
        }
    }
}