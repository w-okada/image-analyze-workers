import { WorkerCommand, WorkerResponse } from './const'
import { PoseNetConfig, PoseNetFunctionType, PoseNetOperatipnParams } from './const'
import * as poseNet from '@tensorflow-models/posenet'
import * as tf from '@tensorflow/tfjs';

const ctx: Worker = self as any  // eslint-disable-line no-restricted-globals

let model: poseNet.PoseNet | null


//// we can not use posenet with wasm...
//// https://github.com/tensorflow/tfjs/issues/2724
// const load_module = async (config: PoseNetConfig) => {
//     if(config.useTFWasmBackend || config.browserType === BrowserType.SAFARI){
//       console.log("use wasm backend" ,config.wasmPath)
//       require('@tensorflow/tfjs-backend-wasm')
//       setWasmPath(config.wasmPath)
//       await tf.setBackend("wasm")
//     }else{
//       console.log("use webgl backend")
//       require('@tensorflow/tfjs-backend-webgl')
//       await tf.setBackend("webgl")
//     }
// }


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
    console.log("for safari")
    // ImageData作成  
    const newImg = new ImageData(new Uint8ClampedArray(data), width, height)
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

onmessage = async (event) => {
    if (event.data.message === WorkerCommand.INITIALIZE) {
        console.log("Initialize model!.", event)
        // await load_module(event.data.config as PoseNetConfig)
        tf.ready().then(()=>{
            tf.env().set('WEBGL_CPU_FORWARD', false)
            poseNet.load(event.data.config.model).then(res => {
                console.log("new model:",res)
                model = res
                ctx.postMessage({ message: WorkerResponse.INITIALIZED })
            })
        })
    } else if (event.data.message === WorkerCommand.PREDICT) {

        const config: PoseNetConfig = event.data.config
        const params: PoseNetOperatipnParams = event.data.params
        const image: ImageBitmap = event.data.image
        const data: Uint8ClampedArray = event.data.data
        const width = event.data.width
        const height = event.data.height
        const uid: number = event.data.uid
        const functionType = event.data.functionType
        //    console.log("functionType:", functionType)
        console.log("current backend[worker thread]:", tf.getBackend())
        if (params.type === PoseNetFunctionType.SinglePerson) {
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