import { WorkerCommand, WorkerResponse, BodypixFunctionType, BodyPixConfig, BodyPixOperatipnParams } from './const'
import * as bodyPix from '@tensorflow-models/body-pix'
import * as tf from '@tensorflow/tfjs';

const ctx: Worker = self as any  // eslint-disable-line no-restricted-globals

let model: bodyPix.BodyPix | null

const generateImage = (image:ImageBitmap, prediction: bodyPix.SemanticPersonSegmentation) => {

  // generate maskImage from prediction
  const pixelData = new Uint8ClampedArray(prediction.width * prediction.height * 4)
  for (let rowIndex = 0; rowIndex < prediction.height; rowIndex++) {
    for (let colIndex = 0; colIndex < prediction.width; colIndex++) {
      const seg_offset = ((rowIndex * prediction.width) + colIndex)
      const pix_offset = ((rowIndex * prediction.width) + colIndex) * 4
      if (prediction.data[seg_offset] === 0) {
        pixelData[pix_offset] = 0
        pixelData[pix_offset + 1] = 0
        pixelData[pix_offset + 2] = 0
        pixelData[pix_offset + 3] = 0
      } else {
        pixelData[pix_offset] = 255
        pixelData[pix_offset + 1] = 255
        pixelData[pix_offset + 2] = 255
        pixelData[pix_offset + 3] = 255
      }
    }
  }
  const maskImage = new ImageData(pixelData, prediction.width, prediction.height);

  // generate maskImage Canvas
  const maskOffscreen = new OffscreenCanvas(prediction.width, prediction.height)
  maskOffscreen.getContext("2d")!.putImageData(maskImage, 0, 0)

  // resize mask Image
  const resizedMaskOffscreen = new OffscreenCanvas(image.width, image.height)
  const ctx = resizedMaskOffscreen.getContext("2d")!
  ctx.drawImage(maskOffscreen, 0, 0, image.width, image.height)
  ctx.globalCompositeOperation = 'source-in'; 
  ctx.drawImage(image, 0, 0, image.width, image.height)
  return resizedMaskOffscreen
}

const predict = async (image: ImageBitmap, config: BodyPixConfig, params:BodyPixOperatipnParams) => {
  // ImageData作成
  const processWidth = (params.processWidth <= 0 || params.processHeight <= 0) ? image.width : params.processWidth
  const processHeight = (params.processWidth <= 0 || params.processHeight <= 0) ? image.height : params.processHeight  

  //console.log("process image size:", processWidth, processHeight)
  const offscreen = new OffscreenCanvas(processWidth, processHeight)
  const ctx = offscreen.getContext("2d")!
  ctx.drawImage(image, 0, 0, processWidth, processHeight)
  const newImg = ctx.getImageData(0, 0, processWidth, processHeight)

  let prediction
  if(params.type === BodypixFunctionType.SegmentPerson){
    prediction = await model!.segmentPerson(newImg, params.segmentPersonParams)
  }else if(params.type === BodypixFunctionType.SegmentPersonParts){
    prediction = await model!.segmentPersonParts(newImg, params.segmentPersonPartsParams)
  }else if(params.type === BodypixFunctionType.SegmentMultiPerson){
    prediction = await model!.segmentMultiPerson(newImg, params.segmentMultiPersonParams)
  }else if(params.type === BodypixFunctionType.SegmentMultiPersonParts){
    prediction = await model!.segmentMultiPersonParts(newImg, params.segmentMultiPersonPartsParams)
  }else{// segmentPersonに倒す
    prediction = await model!.segmentPerson(newImg, params.segmentPersonParams)
  }
  return prediction
}


onmessage = async (event) => {
  if (event.data.message === WorkerCommand.INITIALIZE) {
    bodyPix.load(event.data.config.model).then(res => {
      console.log("bodypix loaded default", event.data.config)
      model = res
      ctx.postMessage({ message: WorkerResponse.INITIALIZED })
    })
  } else if (event.data.message === WorkerCommand.PREDICT) {
    const config:BodyPixConfig = event.data.config
    const image: ImageBitmap = event.data.image
    const uid: number = event.data.uid
    const params:BodyPixOperatipnParams = event.data.params

    const prediction = await predict(image, config, params)
    ctx.postMessage({ message: WorkerResponse.PREDICTED, uid: uid, prediction: prediction})
  }
}