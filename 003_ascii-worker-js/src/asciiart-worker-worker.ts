import { WorkerCommand, WorkerResponse, AsciiOperatipnParams} from './const'

const ctx: Worker = self as any  // eslint-disable-line no-restricted-globals

// const _asciiStr = " .,:;i1tfLCG08@"
// const _asciiCharacters = (_asciiStr).split("");
// const _fontSize = 6
const contrastFactor = (259 * (128 + 255)) / (255 * (259 - 128));


const convert = async (image: ImageBitmap, params:AsciiOperatipnParams) => {
  const asciiStr = params.asciiStr
  const fontSize = params.fontSize
  const asciiCharacters = (asciiStr).split("");  
  // ImageData作成
  const offscreen = new OffscreenCanvas(image.width, image.height)
  const ctx = offscreen.getContext("2d")!
  ctx.font = fontSize + 'px "Courier New", monospace'
  ctx.textBaseline = "top"
  const m = ctx.measureText(asciiStr)
  const charWidth = Math.floor(m.width / asciiCharacters.length)
  const tmpWidth  = Math.ceil(image.width  / charWidth)
  const tmpHeight = Math.ceil(image.height / fontSize)

  // Generate Image for Brightness
  const offscreenForBrightness = new OffscreenCanvas(tmpWidth, tmpHeight)
  const brCtx = offscreenForBrightness.getContext("2d")!
  brCtx.drawImage(image, 0, 0, tmpWidth, tmpHeight)
  const brImageData = brCtx.getImageData(0, 0, tmpWidth, tmpHeight)

  // generate chars agaist the each dot
  const lines = []
  let maxWidth = 0
  for(let y = 0; y < tmpHeight; y++){
      let line =""
      for(let x = 0; x < tmpWidth; x++){
          const offset = (y * tmpWidth + x) * 4
          const r = Math.max(0, Math.min((Math.floor((brImageData.data[offset + 0] - 128 ) * contrastFactor) + 128), 255))
          const g = Math.max(0, Math.min((Math.floor((brImageData.data[offset + 1] - 128 ) * contrastFactor) + 128), 255))
          const b = Math.max(0, Math.min((Math.floor((brImageData.data[offset + 2] - 128 ) * contrastFactor) + 128), 255))

          var brightness = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
          var character = asciiCharacters[
              (asciiCharacters.length - 1) - Math.round(brightness * (asciiCharacters.length - 1))
          ]
          line += character
      }
      lines.push(line)
      maxWidth = ctx.measureText(line).width > maxWidth ? ctx.measureText(line).width : maxWidth
  }

  // create offscreencanvas to draw text
//  const drawingOffscreen = new OffscreenCanvas(ctx.measureText(lines[0]).width, tmpHeight * _fontSize)
  const drawingOffscreen = new OffscreenCanvas(maxWidth, tmpHeight * fontSize)
  const drCtx = drawingOffscreen.getContext("2d")!
  drCtx.fillStyle = "rgb(255, 255, 255)";
  drCtx.fillRect(0, 0, drawingOffscreen.width, drawingOffscreen.height)
  drCtx.fillStyle = "rgb(0, 0, 0)";
  drCtx.font = fontSize + 'px "Courier New", monospace'
  for(let n=0; n<lines.length; n++){
      drCtx.fillText(lines[n], 0, n * fontSize)
  }

  // draw to output offscreen
  ctx.drawImage(drawingOffscreen,0,0,offscreen.width,offscreen.height)
  return offscreen
}


onmessage = async (event) => {
  //  console.log("event", event)
  if (event.data.message === WorkerCommand.INITIALIZE) {
    ctx.postMessage({ message: WorkerResponse.INITIALIZED })
  } else if (event.data.message === WorkerCommand.PREDICT) {
    //    console.log("requested predict bodypix.")
    const image: ImageBitmap = event.data.image
    const uid: number = event.data.uid
    const params = event.data.params as AsciiOperatipnParams

    const offscreen = await convert(image, params)
    const imageBitmap = offscreen.transferToImageBitmap()
    ctx.postMessage({ message: WorkerResponse.PREDICTED, uid: uid, image: imageBitmap },[imageBitmap])
    image.close()
  } else {
    console.log("not implemented")
  }
  
}