import './App.css';
import {
  BodypixWorkerManager, BodypixFunctionType, generateBodyPixDefaultConfig,
  SemanticPersonSegmentation, ModelConfigMobileNetV1, generateDefaultBodyPixParams,
  SemanticPartSegmentation, PersonSegmentation, BodyPixInternalResolution, PartSegmentation
} from '@dannadori/bodypix-worker-js'
import { BodyPixConfig } from '@dannadori/bodypix-worker-js/dist/const';
import DemoBase, { ControllerUIProp } from './DemoBase';


export const rainbow = [
  [110, 64, 170], [143, 61, 178], [178, 60, 178], [210, 62, 167],
  [238, 67, 149], [255, 78, 125], [255, 94, 99],  [255, 115, 75],
  [255, 140, 56], [239, 167, 47], [217, 194, 49], [194, 219, 64],
  [175, 240, 91], [135, 245, 87], [96, 247, 96],  [64, 243, 115],
  [40, 234, 141], [28, 219, 169], [26, 199, 194], [33, 176, 213],
  [47, 150, 224], [65, 125, 224], [84, 101, 214], [99, 81, 195]
];

export const warm = [
  [110, 64, 170], [106, 72, 183], [100, 81, 196], [92, 91, 206],
  [84, 101, 214], [75, 113, 221], [66, 125, 224], [56, 138, 226],
  [48, 150, 224], [40, 163, 220], [33, 176, 214], [29, 188, 205],
  [26, 199, 194], [26, 210, 182], [28, 219, 169], [33, 227, 155],
  [41, 234, 141], [51, 240, 128], [64, 243, 116], [79, 246, 105],
  [96, 247, 97],  [115, 246, 91], [134, 245, 88], [155, 243, 88]
];

export const spectral = [
  [158, 1, 66],    [181, 26, 71],   [202, 50, 74],   [219, 73, 74],
  [232, 94, 73],   [242, 117, 75],  [248, 142, 83],  [251, 167, 96],
  [253, 190, 112], [254, 210, 129], [254, 227, 149], [254, 240, 166],
  [251, 248, 176], [243, 249, 172], [231, 245, 163], [213, 238, 159],
  [190, 229, 160], [164, 218, 163], [137, 207, 165], [110, 192, 168],
  [86, 173, 174],  [70, 150, 179],  [67, 127, 180],  [77, 103, 173]
];

class App extends DemoBase {
  manager: BodypixWorkerManager = new BodypixWorkerManager()
  config: BodyPixConfig = (() => {
    const config = generateBodyPixDefaultConfig()
    config.model = ModelConfigMobileNetV1
    return config
  })()
  params = generateDefaultBodyPixParams()

  tmpCanvas = document.createElement("canvas")
  backgroundImage = document.createElement("img")
  backgroundCanvas = document.createElement("canvas")
  personCanvas = document.createElement("canvas")

  IMAGE_PATH = "./yuka_kawamura.jpg"
  RESULT_OVERLAY = true
  currentFunction: BodypixFunctionType = BodypixFunctionType.SegmentPerson



  getCustomMenu = () => {
    const menu: ControllerUIProp[] = [
      {
        title: "arch",
        currentIndexOrValue: 0,
        values: ["MobileNetV1", "ResNet50"],
        callback: (val: string | number | MediaStream) => { },
      },
      {
        title: "outputStride",
        currentIndexOrValue: 1,
        values: [8, 16, 32],
        callback: (val: string | number | MediaStream) => { },

      },
      {
        title: "multiplier",
        currentIndexOrValue: 0,
        values: [1.0, 0.75, 0.50],
        callback: (val: string | number | MediaStream) => { },
      },
      {
        title: "quantBytes",
        currentIndexOrValue: 0,
        values: [4, 2, 1],
        callback: (val: string | number | MediaStream) => { },
      },
      {
        title: "processOnLocal",
        currentIndexOrValue: 1,
        values: ["on", "off"],
        callback: (val: string | number | MediaStream) => { },
      },
      {
        title: "reload model",
        currentIndexOrValue: 0,
        callback: (val: string | number | MediaStream) => {
          const modelArch = this.controllerRef.current!.getCurrentValue("arch")
          const outputStride = this.controllerRef.current!.getCurrentValue("outputStride")
          const multiplier = this.controllerRef.current!.getCurrentValue("multiplier")
          const quantBytes = this.controllerRef.current!.getCurrentValue("quantBytes")
          const processOnLocal = this.controllerRef.current!.getCurrentValue("processOnLocal")
          
          this.config.model.architecture = modelArch as ('ResNet50' | 'MobileNetV1')
          this.config.model.outputStride = outputStride as (32 | 16 | 8)
          this.config.model.multiplier   = multiplier as (0.50 | 0.75 | 1.0)
          this.config.model.quantBytes   = quantBytes as (4 | 2 | 1)
          this.config.processOnLocal     = (processOnLocal === "on" ? true  : false) as boolean
          console.log("new mocdel.... ", this.config.model)
          this.requireReload()
        },
      },
      {
        title: "function",
        currentIndexOrValue: 0,
        values: ["segmentPerson", "segmentPersonParts", "segmentMultiPerson", "segmentMultiPersonParts"],
        callback: (val: string | number | MediaStream) => {
          if (val === "segmentPerson") {
            this.params.type = BodypixFunctionType.SegmentPerson
            this.currentFunction = BodypixFunctionType.SegmentPerson
          } else if (val === "segmentPersonParts") {
            this.params.type = BodypixFunctionType.SegmentPersonParts
            this.currentFunction = BodypixFunctionType.SegmentPersonParts
          } else if (val === "segmentMultiPerson") {
            this.params.type = BodypixFunctionType.SegmentMultiPerson
            this.currentFunction = BodypixFunctionType.SegmentMultiPerson
          } else {
            this.params.type = BodypixFunctionType.SegmentMultiPersonParts
            this.currentFunction = BodypixFunctionType.SegmentMultiPersonParts
          }
        },
      },
      {
        title: "flip",
        currentIndexOrValue: 0,
        values: ["on", "off"],
        callback: (val: string | number | MediaStream) => {
          if (val === "on") {
            this.params.segmentPersonParams!.flipHorizontal = true
            this.params.segmentPersonPartsParams!.flipHorizontal = true
            this.params.segmentMultiPersonParams!.flipHorizontal = true
            this.params.segmentMultiPersonPartsParams!.flipHorizontal = true
          } else {
            this.params.segmentPersonParams!.flipHorizontal = false
            this.params.segmentPersonPartsParams!.flipHorizontal = false
            this.params.segmentMultiPersonParams!.flipHorizontal = false
            this.params.segmentMultiPersonPartsParams!.flipHorizontal = false
          }
        },
      },
      {
        title: "internalResolution ",
        currentIndexOrValue: 1,
        values: ["low", "medium", "high", "full"],
        callback: (val: string | number | MediaStream) => {
          this.params.segmentPersonParams!.internalResolution = val as BodyPixInternalResolution
          this.params.segmentPersonPartsParams!.internalResolution = val as BodyPixInternalResolution
          this.params.segmentMultiPersonParams!.internalResolution = val as BodyPixInternalResolution
          this.params.segmentMultiPersonPartsParams!.internalResolution = val as BodyPixInternalResolution
        },
      },   
      {
        title: "segmentationThreshold",
        currentIndexOrValue: 0.7,
        range: [0, 1, 0.1],
        callback: (val: string | number | MediaStream) => {
          this.params.segmentPersonParams!.segmentationThreshold = val as number
          this.params.segmentPersonPartsParams!.segmentationThreshold = val as number
          this.params.segmentMultiPersonParams!.segmentationThreshold = val as number
          this.params.segmentMultiPersonPartsParams!.segmentationThreshold = val as number
        },
      },      
      {
        title: "max detection",
        currentIndexOrValue: 10,
        range: [1, 50, 1],
        callback: (val: string | number | MediaStream) => {
          this.params.segmentPersonParams!.maxDetections = val as number
          this.params.segmentPersonPartsParams!.maxDetections = val as number
          this.params.segmentMultiPersonParams!.maxDetections = val as number
          this.params.segmentMultiPersonPartsParams!.maxDetections = val as number
        },
      },
      {
        title: "score threshold",
        currentIndexOrValue: 0.3,
        range: [0, 1, 0.1],
        callback: (val: string | number | MediaStream) => {
          this.params.segmentPersonParams!.scoreThreshold = val as number
          this.params.segmentPersonPartsParams!.scoreThreshold = val as number
          this.params.segmentMultiPersonParams!.scoreThreshold = val as number
          this.params.segmentMultiPersonPartsParams!.scoreThreshold = val as number
        },
      },
      {
        title: "nms radius",
        currentIndexOrValue: 20,
        range: [1, 50, 1],
        callback: (val: string | number | MediaStream) => {
          this.params.segmentPersonParams!.nmsRadius = val as number
          this.params.segmentPersonPartsParams!.nmsRadius = val as number
          this.params.segmentMultiPersonParams!.nmsRadius = val as number
          this.params.segmentMultiPersonPartsParams!.nmsRadius = val as number
        },
      },
      {
        title: "minKeypointScore",
        currentIndexOrValue: 0.3,
        range: [0, 1, 0.1],
        callback: (val: string | number | MediaStream) => {
          this.params.segmentMultiPersonParams!.minKeypointScore = val as number
          this.params.segmentMultiPersonPartsParams!.minKeypointScore = val as number
        },
      },
      {
        title: "refineSteps",
        currentIndexOrValue: 10,
        range: [1, 50, 1],
        callback: (val: string | number | MediaStream) => {
          this.params.segmentMultiPersonParams!.refineSteps = val as number
          this.params.segmentMultiPersonPartsParams!.refineSteps = val as number
        },
      },
      {
        title: "ProcessWidth",
        currentIndexOrValue: 300,
        range: [100, 1024, 10],
        callback: (val: string | number | MediaStream) => {
          this.params.processWidth = val as number
        },
      },
      {
        title: "ProcessHeight",
        currentIndexOrValue: 300,
        range: [100, 1024, 10],
        callback: (val: string | number | MediaStream) => {
          this.params.processHeight = val as number
        },
      },      
      {
        title: "background",
        currentIndexOrValue: 0,
        values: ["image"],
        fileValue: ["image"],
        fileCallback:(fileType:string, path:string)=>{
            if(fileType.startsWith("image")){
              this.selectBackgroundImage(path)
            }
        },
        callback: ((val: string | number | MediaStream) => {
          console.log("unknwon input.", val)
        })
      },
    ]
    return menu
  }



  private selectBackgroundImage(path:string){
    this.backgroundImage.onload = () =>{
      this.backgroundCanvas.width = this.backgroundImage.width
      this.backgroundCanvas.height = this.backgroundImage.height
      const ctx = this.backgroundCanvas.getContext("2d")!
      ctx.drawImage(this.backgroundImage, 0, 0, this.backgroundCanvas.width, this.backgroundCanvas.height)
    }
    this.backgroundImage.src = path
  }


  drawSegmentation = (prediction: SemanticPersonSegmentation) => {
    this.tmpCanvas.width = prediction.width
    this.tmpCanvas.height = prediction.height
    const imageData = this.tmpCanvas.getContext("2d")!.getImageData(0, 0, prediction.width, prediction.height)
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
    this.tmpCanvas.getContext("2d")!.putImageData(imageDataTransparent, 0, 0)

    this.personCanvas.width  = this.originalCanvas.current!.width
    this.personCanvas.height = this.originalCanvas.current!.height
    const personCtx = this.personCanvas.getContext("2d")!
    personCtx.drawImage(this.tmpCanvas, 0, 0, this.personCanvas.width, this.personCanvas.height)
    personCtx.globalCompositeOperation = 'source-in';
    personCtx.drawImage(this.originalCanvas.current!, 0, 0, this.personCanvas.width, this.personCanvas.height)
    this.personCanvas.getContext("2d")!.globalCompositeOperation = "source-over";



    this.resultCanvasRef.current!.width = this.originalCanvas.current!.width
    this.resultCanvasRef.current!.height = this.originalCanvas.current!.height
    const ctx = this.resultCanvasRef.current!.getContext("2d")!
    ctx.drawImage(this.backgroundCanvas, 0, 0, this.resultCanvasRef.current!.width, this.resultCanvasRef.current!.height)
    ctx.drawImage(this.personCanvas, 0, 0, this.resultCanvasRef.current!.width, this.resultCanvasRef.current!.height)


  }
  
  drawMultiSegmentation = (prediction:PersonSegmentation[]) =>{
    this.resultCanvasRef.current!.width = this.originalCanvas.current!.width
    this.resultCanvasRef.current!.height = this.originalCanvas.current!.height
    const ctx = this.resultCanvasRef.current!.getContext("2d")!

    if(prediction.length > 0){
      this.tmpCanvas.width = prediction[0].width
      this.tmpCanvas.height = prediction[0].height
      const imageData = this.tmpCanvas.getContext("2d")!.getImageData(0, 0, this.tmpCanvas.width, this.tmpCanvas.height)
      const data = imageData.data
      // at first, make all data transparent
      for (let rowIndex = 0; rowIndex < this.tmpCanvas.height; rowIndex++) {
        for (let colIndex = 0; colIndex < this.tmpCanvas.width; colIndex++) {
          const pix_offset = ((rowIndex * this.tmpCanvas.width) + colIndex) * 4
          data[pix_offset] = 0
          data[pix_offset + 1] = 0
          data[pix_offset + 2] = 0
          data[pix_offset + 3] = 0
        }
      }

      // then draw each person segment
      prediction.forEach(x=>{
        for (let rowIndex = 0; rowIndex < this.tmpCanvas.height; rowIndex++) {
          for (let colIndex = 0; colIndex < this.tmpCanvas.width; colIndex++) {
            const seg_offset = ((rowIndex * this.tmpCanvas.width) + colIndex)
            const pix_offset = ((rowIndex * this.tmpCanvas.width) + colIndex) * 4
            if (x.data[seg_offset] !== 0) {
              data[pix_offset] = 255
              data[pix_offset + 1] = 255
              data[pix_offset + 2] = 255
              data[pix_offset + 3] = 255
            }
          }
        } 
      })
      const imageDataTransparent = new ImageData(data, prediction[0].width, prediction[0].height);
      this.tmpCanvas.getContext("2d")!.putImageData(imageDataTransparent, 0, 0)
      ctx.drawImage(this.tmpCanvas, 0, 0, this.resultCanvasRef.current!.width, this.resultCanvasRef.current!.height)
      ctx.globalCompositeOperation = 'source-in';

    }
    ctx.drawImage(this.originalCanvas.current!, 0, 0, this.resultCanvasRef.current!.width, this.resultCanvasRef.current!.height)
  }


  drawParts = (prediction: SemanticPartSegmentation) => {
    this.tmpCanvas.width = prediction.width
    this.tmpCanvas.height = prediction.height
    const imageData = this.tmpCanvas.getContext("2d")!.getImageData(0, 0, prediction.width, prediction.height)
    const data = imageData.data
    for (let rowIndex = 0; rowIndex < prediction.height; rowIndex++) {
      for (let colIndex = 0; colIndex < prediction.width; colIndex++) {
        const seg_offset = ((rowIndex * prediction.width) + colIndex)
        const pix_offset = ((rowIndex * prediction.width) + colIndex) * 4
        const flag = prediction.data[seg_offset]
        if (flag === -1) {
          data[pix_offset] = 0
          data[pix_offset + 1] = 0
          data[pix_offset + 2] = 0
          data[pix_offset + 3] = 0
        } else {
          data[pix_offset] =     rainbow[flag][0]
          data[pix_offset + 1] = rainbow[flag][1]
          data[pix_offset + 2] = rainbow[flag][2]
          data[pix_offset + 3] = 100
        }
      }
    }
    const imageDataTransparent = new ImageData(data, prediction.width, prediction.height);
    this.tmpCanvas.getContext("2d")!.putImageData(imageDataTransparent, 0, 0)

    this.resultCanvasRef.current!.width = this.originalCanvas.current!.width
    this.resultCanvasRef.current!.height = this.originalCanvas.current!.height
    const ctx = this.resultCanvasRef.current!.getContext("2d")!
    ctx.drawImage(this.originalCanvas.current!, 0, 0, this.resultCanvasRef.current!.width, this.resultCanvasRef.current!.height)
    ctx.drawImage(this.tmpCanvas, 0, 0, this.resultCanvasRef.current!.width, this.resultCanvasRef.current!.height)
  }

  drawMultiPersonParts = (prediction:PartSegmentation[]) =>{
    this.resultCanvasRef.current!.width = this.originalCanvas.current!.width
    this.resultCanvasRef.current!.height = this.originalCanvas.current!.height
    const ctx = this.resultCanvasRef.current!.getContext("2d")!
    ctx.drawImage(this.originalCanvas.current!, 0, 0, this.resultCanvasRef.current!.width, this.resultCanvasRef.current!.height)

    if(prediction.length > 0){
      this.tmpCanvas.width = prediction[0].width
      this.tmpCanvas.height = prediction[0].height
      const imageData = this.tmpCanvas.getContext("2d")!.getImageData(0, 0, this.tmpCanvas.width, this.tmpCanvas.height)
      const data = imageData.data
      // at first, make all data transparent
      for (let rowIndex = 0; rowIndex < this.tmpCanvas.height; rowIndex++) {
        for (let colIndex = 0; colIndex < this.tmpCanvas.width; colIndex++) {
          const pix_offset = ((rowIndex * this.tmpCanvas.width) + colIndex) * 4
          data[pix_offset] = 0
          data[pix_offset + 1] = 0
          data[pix_offset + 2] = 0
          data[pix_offset + 3] = 0
        }
      }

      // then draw each person segment
      prediction.forEach(x=>{
        for (let rowIndex = 0; rowIndex < this.tmpCanvas.height; rowIndex++) {
          for (let colIndex = 0; colIndex < this.tmpCanvas.width; colIndex++) {
            const seg_offset = ((rowIndex * this.tmpCanvas.width) + colIndex)
            const pix_offset = ((rowIndex * this.tmpCanvas.width) + colIndex) * 4
            const flag = x.data[seg_offset]
            if (flag !== -1) {
              // data[pix_offset] = 100
              // data[pix_offset + 1] = 0
              // data[pix_offset + 2] = 0
              // data[pix_offset + 3] = 100
              try{
                data[pix_offset] = rainbow[flag][0]
                data[pix_offset + 1] = rainbow[flag][1]
                data[pix_offset + 2] = rainbow[flag][2]
                data[pix_offset + 3] = 100
              }catch(e){
                // console.log(e)
                // console.log("EEEEEEE",flag)
              }
            }
          }
        } 
      })
      const imageDataTransparent = new ImageData(data, prediction[0].width, prediction[0].height);
      this.tmpCanvas.getContext("2d")!.putImageData(imageDataTransparent, 0, 0)
      ctx.drawImage(this.tmpCanvas, 0, 0, this.resultCanvasRef.current!.width, this.resultCanvasRef.current!.height)
    }
  }

  handleResult = (prediction: any) => {
//    console.log(prediction)
    try{
      switch (this.currentFunction) {
        case BodypixFunctionType.SegmentPerson:
          prediction = prediction as SemanticPersonSegmentation
          this.drawSegmentation(prediction)
          break
        case BodypixFunctionType.SegmentPersonParts:
          prediction = prediction as SemanticPartSegmentation
          this.drawParts(prediction)
          break
        case BodypixFunctionType.SegmentMultiPerson:
          prediction = prediction as PersonSegmentation[]
          this.drawMultiSegmentation(prediction)
          break
        case BodypixFunctionType.SegmentMultiPersonParts:
          prediction = prediction as PartSegmentation[]
          this.drawMultiPersonParts(prediction)
          break
      }
    }catch(e){
      console.log(e)
    }
  }
}


export default App;
