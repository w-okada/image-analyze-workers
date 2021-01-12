import './App.css';
import DemoBase, { ControllerUIProp } from './DemoBase';
import { generateDefaultGoogleMeetSegmentationParams, generateGoogleMeetSegmentationDefaultConfig, GoogleMeetSegmentationSmoothingType, GoogleMeetSegmentationWorkerManager } from '@dannadori/googlemeet-segmentation-worker-js'

class App extends DemoBase {
  manager:GoogleMeetSegmentationWorkerManager = new GoogleMeetSegmentationWorkerManager()
  canvas          = document.createElement("canvas")
  backgroundImage = document.createElement("img")
  backgroundCanvas = document.createElement("canvas")
  virtualBackgroundCanvas = document.createElement("canvas")
  
  smoothing:boolean = false
  config = (()=>{
    const c = generateGoogleMeetSegmentationDefaultConfig()
    c.useTFWasmBackend = false
    c.processOnLocal = true
    // c.wasmPath = ""
    c.modelPath="./googlemeet-segmentation_128_32/model.json"
    c.wasmPath="./tfjs-backend-wasm.wasm"
    return c
  })()
  params = (()=>{
    const p = generateDefaultGoogleMeetSegmentationParams()
    p.processHeight = 128
    p.processWidth  = 128
    return p
  })()



  private selectBackgroundImage(path:string){
    this.backgroundImage.onload = () =>{
      this.backgroundCanvas.width = this.backgroundImage.width
      this.backgroundCanvas.height = this.backgroundImage.height
      const ctx = this.backgroundCanvas.getContext("2d")!
      ctx.drawImage(this.backgroundImage, 0, 0, this.backgroundCanvas.width, this.backgroundCanvas.height)
    }
    this.backgroundImage.src = path
  }


  getCustomMenu = () => {
    const menu: ControllerUIProp[] = [
      {
        title: "processOnLocal",
        currentIndexOrValue: 0,
        values: ["on", "off"],
        callback: (val: string | number | MediaStream) => { },
      },
      {
        title: "modelPath",
        currentIndexOrValue: 0,
        displayLabels:["seg128x128_32", "seg128x128_16", "seg144x256_32", "seg144x256_16", "seg96x160_32", "seg96x160_16"],
        values: ["./googlemeet-segmentation_128_32/model.json", "./googlemeet-segmentation_128_16/model.json", 
          "./googlemeet-segmentation_144_32/model.json", "./googlemeet-segmentation_144_16/model.json", 
          "./googlemeet-segmentation_96_32/model.json", "./googlemeet-segmentation_96_16/model.json" ],
        callback: (val: string | number | MediaStream) => {
        },
      },
      {
        title: "useTFWasmBackend",
        currentIndexOrValue: 1,
        values: ["on", "off"],
        callback: (val: string | number | MediaStream) => { },
      },
      {
        title: "reload model",
        currentIndexOrValue: 0,
        callback: (val: string | number | MediaStream) => {
          const processOnLocal = this.controllerRef.current!.getCurrentValue("processOnLocal")
          this.config.processOnLocal     = (processOnLocal === "on" ? true  : false) as boolean
          const useTFWasmBackend = this.controllerRef.current!.getCurrentValue("useTFWasmBackend")
          this.config.useTFWasmBackend   = (useTFWasmBackend === "on" ? true  : false) as boolean
          this.config.modelPath = this.controllerRef.current!.getCurrentValue("modelPath") as string  


          const path = this.config.modelPath

          this.requireReload(
            ()=>{
              if(path.indexOf("128") > 0){
                this.params.processWidth = 128
                this.params.processHeight = 128
              }else if(path.indexOf("144") > 0){
                this.params.processHeight = 144
                this.params.processWidth = 256
              }else if(path.indexOf("96") > 0){
                this.params.processHeight = 96
                this.params.processWidth = 160
              }
            }
          )
        },
      },
      {
        title: "smoothing_S",
        currentIndexOrValue: 0,
        values: [0, 1, 3, 5, 10],
        callback: (val: string | number | MediaStream) => {
          const smoothing_S = this.controllerRef.current!.getCurrentValue("smoothing_S")
          this.params.smoothingS = smoothing_S as number
        },
      },
      {
        title: "smoothing_R",
        currentIndexOrValue: 0,
        values: [0, 1, 3, 5, 10],
        callback: (val: string | number | MediaStream) => {
          const smoothing_R = this.controllerRef.current!.getCurrentValue("smoothing_R")
          this.params.smoothingR = smoothing_R as number
        },
      },
      {
        title: "smoothing_w_h",
        currentIndexOrValue: 0,
        values: [128, 256, 512, 1024],
        callback: (val: string | number | MediaStream) => {
          const smoothing_w_h = this.controllerRef.current!.getCurrentValue("smoothing_w_h")
          this.params.jbfWidth   = smoothing_w_h as number
          this.params.jbfHeight  = smoothing_w_h as number
        },
      },
      {
        title: "smoothingType",
        currentIndexOrValue: 0,
        /// https://github.com/tensorflow/tensorflow/issues/39750
        /// Slice is magnitude slower!!! Not support GPU!!
        // values: ["JS", "WASM", "GPU", "JS_CANVAS"],
        values: ["JS", "WASM", "JS_CANVAS"],
        callback: (val: string | number | MediaStream) => {
          const smoothingType = this.controllerRef.current!.getCurrentValue("smoothingType")
          this.params.smoothingType = (()=>{
            switch(smoothingType){
              case "JS":
                return GoogleMeetSegmentationSmoothingType.JS
              case "WASM":
                return GoogleMeetSegmentationSmoothingType.WASM
              case "GPU":
                return GoogleMeetSegmentationSmoothingType.GPU
              case "JS_CANVAS":
                return GoogleMeetSegmentationSmoothingType.JS_CANVAS
              default:
                console.log("unknown smoothing type", smoothingType)
                return GoogleMeetSegmentationSmoothingType.JS
            }
          })()
        },
      },
      {
        title: "lightWrapping",
        currentIndexOrValue: 1,
        values: ["on", "off"],
        callback: (val: string | number | MediaStream) => {
          const lightWrapping = this.controllerRef.current!.getCurrentValue("lightWrapping")
          this.params.lightWrapping = (lightWrapping === "on" ? true  : false) as boolean
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



  drawSegmentation = (prediction: number[][]) => {
    this.canvas.width = prediction[0].length
    this.canvas.height = prediction.length
    const imageData = this.canvas.getContext("2d")!.getImageData(0, 0, this.canvas.width, this.canvas.height)
    const data = imageData.data

    if(this.params.lightWrapping){
      for (let rowIndex = 0; rowIndex < this.canvas.height; rowIndex++) {
        for (let colIndex = 0; colIndex < this.canvas.width; colIndex++) {
          const pix_offset = ((rowIndex * this.canvas.width) + colIndex) * 4
          if(prediction[rowIndex][colIndex]>200){
            data[pix_offset + 0] = 70
            data[pix_offset + 1] = 30
            data[pix_offset + 2] = 30
            data[pix_offset + 3] = 255
          }else if(prediction[rowIndex][colIndex]>100){
              data[pix_offset + 0] = 255
              data[pix_offset + 1] = 255
              data[pix_offset + 2] = 255
              data[pix_offset + 3] = 200
          }else{
            data[pix_offset + 0] = 0
            data[pix_offset + 1] = 0
            data[pix_offset + 2] = 0
            data[pix_offset + 3] = 0
          }
        }
      }
    }else{
      for (let rowIndex = 0; rowIndex < this.canvas.height; rowIndex++) {
        for (let colIndex = 0; colIndex < this.canvas.width; colIndex++) {
          const seg_offset = ((rowIndex * this.canvas.width) + colIndex)
          const pix_offset = ((rowIndex * this.canvas.width) + colIndex) * 4
          if(prediction[rowIndex][colIndex]>128){
            data[pix_offset + 0] = 70
            data[pix_offset + 1] = 30
            data[pix_offset + 2] = 30
            data[pix_offset + 3] = 255
          }else{
            data[pix_offset + 0] = 0
            data[pix_offset + 1] = 0
            data[pix_offset + 2] = 0
            data[pix_offset + 3] = 0
          }
        }
      }
    }
    
    const imageDataTransparent = new ImageData(data, this.canvas.width, this.canvas.height);
    this.canvas.getContext("2d")!.putImageData(imageDataTransparent, 0, 0)

    this.resultCanvasRef.current!.width = this.originalCanvas.current!.width
    this.resultCanvasRef.current!.height = this.originalCanvas.current!.height
    const ctx = this.resultCanvasRef.current!.getContext("2d")!

    if(this.backgroundImage.src){
      this.virtualBackgroundCanvas.width  = this.resultCanvasRef.current!.width
      this.virtualBackgroundCanvas.height = this.resultCanvasRef.current!.height
      const ctxv = this.virtualBackgroundCanvas.getContext("2d")!
      ctxv.drawImage(this.canvas, 0, 0, this.resultCanvasRef.current!.width, this.resultCanvasRef.current!.height)
      ctxv.globalCompositeOperation = 'source-atop';
      ctxv.drawImage(this.backgroundCanvas, 0, 0, this.resultCanvasRef.current!.width, this.resultCanvasRef.current!.height)

      ctx.drawImage(this.originalCanvas.current!, 0, 0, this.resultCanvasRef.current!.width, this.resultCanvasRef.current!.height)
      ctx.drawImage( this.virtualBackgroundCanvas, 0, 0, this.resultCanvasRef.current!.width, this.resultCanvasRef.current!.height)
      

    }else{
      ctx.drawImage(this.originalCanvas.current!, 0, 0, this.resultCanvasRef.current!.width, this.resultCanvasRef.current!.height)
      ctx.drawImage(this.canvas, 0, 0, this.resultCanvasRef.current!.width, this.resultCanvasRef.current!.height)
    }
  }

  count = 0
  handleResult = (prediction: any) => {
    this.drawSegmentation(prediction)
  }

}


export default App;
