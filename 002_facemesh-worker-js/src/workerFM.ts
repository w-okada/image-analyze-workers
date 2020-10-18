import * as facemesh from '@tensorflow-models/facemesh'
import { WorkerCommand, WorkerResponse, FacemeshConfig, FacemeshOperatipnParams } from './const'
import * as tf from '@tensorflow/tfjs';
import { BrowserType } from './BrowserUtil';
const ctx: Worker = self as any  // eslint-disable-line no-restricted-globals

let model: facemesh.FaceMesh | null

const load_module = (config: FacemeshConfig) => {
  if(config.useTFWasmBackend || config.browserType === BrowserType.SAFARI){
    console.log("use wasm backend")
    require('@tensorflow/tfjs-backend-wasm')
  }else{
    console.log("use webgl backend")
    require('@tensorflow/tfjs-backend-webgl')
  }
}

const predict = async (image: ImageBitmap, config: FacemeshConfig, params:FacemeshOperatipnParams): Promise<facemesh.AnnotatedPrediction[]> => {
  // ImageData作成  
  const processWidth = (params.processWidth <= 0 || params.processHeight <= 0) ? image.width : params.processWidth
  const processHeight = (params.processWidth <= 0 || params.processHeight <= 0) ? image.height : params.processHeight 
  
  //console.log("process image size:", processWidth, processHeight)
  const offscreen = new OffscreenCanvas(processWidth, processHeight)
  const ctx = offscreen.getContext("2d")!
  ctx.drawImage(image, 0, 0, processWidth, processHeight)
  const newImg = ctx.getImageData(0, 0, processWidth, processHeight)

  const  prediction = await model!.estimateFaces(newImg)
  return prediction
}

const predictForSafari = async (data: Uint8ClampedArray, config: FacemeshConfig, params:FacemeshOperatipnParams): Promise<facemesh.AnnotatedPrediction[]> => {
  // ImageData作成
  const imageData = new ImageData(data, params.processWidth, params.processHeight);
  const prediction = await model!.estimateFaces(imageData)

  return prediction
}

onmessage = async (event) => {
//  console.log("event", event)
  if (event.data.message === WorkerCommand.INITIALIZE) {
    console.log("Initialize model!.", event)
    load_module(event.data.config as FacemeshConfig)
    
    tf.ready().then(()=>{
      tf.env().set('WEBGL_CPU_FORWARD', false)
      facemesh.load().then(res => {
        console.log("new model:",res)
        model = res
        ctx.postMessage({ message: WorkerResponse.INITIALIZED })
      })
    })

  } else if (event.data.message === WorkerCommand.PREDICT) {
    //    console.log("requested predict facemesh.")
    const image: ImageBitmap = event.data.image
    const uid: number = event.data.uid
    const processWidth = event.data.processWidth
    const processHeight = event.data.processHeight
    const data = event.data.data
    const config = event.data.config as FacemeshConfig
    const params = event.data.params as FacemeshOperatipnParams

    if(config.browserType == BrowserType.SAFARI){
      const prediction = await predictForSafari(data, config, params)
      ctx.postMessage({ message: WorkerResponse.PREDICTED, uid: uid, prediction: prediction })
    }else{
      const prediction = await predict(image, config, params)
      ctx.postMessage({ message: WorkerResponse.PREDICTED, uid: uid, prediction: prediction })
      image.close()
    }


  }
}