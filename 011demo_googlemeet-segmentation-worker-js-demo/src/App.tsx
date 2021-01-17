import './App.css';
import DemoBase, { ControllerUIProp } from './DemoBase';
import { generateDefaultGoogleMeetSegmentationParams, generateGoogleMeetSegmentationDefaultConfig, GoogleMeetSegmentationSmoothingType, GoogleMeetSegmentationWorkerManager } from '@dannadori/googlemeet-segmentation-worker-js'

class App extends DemoBase {
  manager: GoogleMeetSegmentationWorkerManager = new GoogleMeetSegmentationWorkerManager()
  // manager1: GoogleMeetSegmentationWorkerManager = new GoogleMeetSegmentationWorkerManager()
  // manager2: GoogleMeetSegmentationWorkerManager = new GoogleMeetSegmentationWorkerManager()
  // manager3: GoogleMeetSegmentationWorkerManager = new GoogleMeetSegmentationWorkerManager()
  // manager4: GoogleMeetSegmentationWorkerManager = new GoogleMeetSegmentationWorkerManager()
  // manager5: GoogleMeetSegmentationWorkerManager = new GoogleMeetSegmentationWorkerManager()

  // @ts-ignore
  // managers = (()=>{
  //   // return [this.manager1, this.manager2, this.manager3, this.manager4, this.manager5]
  //   return [this.manager1, this.manager2]
  // })()

  canvas          = document.createElement("canvas")
  backgroundImage = document.createElement("img")
  backgroundCanvas = document.createElement("canvas")

  personCanvas = document.createElement("canvas")
  lightWrapCanvas = document.createElement("canvas")

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
    p.lightWrapping = true
    p.smoothingS = 1
    p.smoothingR = 1
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
        title: "processOnLocal(off:webworker)",
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
          const processOnLocal = this.controllerRef.current!.getCurrentValue("processOnLocal(off:webworker)")
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

              if(this.config.processOnLocal===true){
                this.params.toCanvas = this.resultCanvasRef.current!
              }else{
                this.params.toCanvas = null
              }
            }
          )
        },
      },
      {
        title: "smoothing_S",
        currentIndexOrValue: 1,
        values: [0, 1, 3, 5, 10],
        callback: (val: string | number | MediaStream) => {
          const smoothing_S = this.controllerRef.current!.getCurrentValue("smoothing_S")
          this.params.smoothingS = smoothing_S as number
        },
      },
      {
        title: "smoothing_R",
        currentIndexOrValue: 1,
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
        values: ["JS", "WASM(only for webworker)", "JS_CANVAS"],
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
        currentIndexOrValue: 0,
        values: ["on", "off"],
        callback: (val: string | number | MediaStream) => {
          const lightWrapping = this.controllerRef.current!.getCurrentValue("lightWrapping")
          this.params.lightWrapping = (lightWrapping === "on" ? true  : false) as boolean
        },
      },
      {
        title: "directToCanvas",
        currentIndexOrValue: 1,
        values: ["on", "off"],
        callback: (val: string | number | MediaStream) => {
          const directToCanvas = this.controllerRef.current!.getCurrentValue("directToCanvas")
          this.params.directToCanvs = (directToCanvas === "on" ? true  : false) as boolean
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
    
    // Light Wrap Generate
    if(this.params.lightWrapping){
      this.lightWrapCanvas.width = this.canvas.width
      this.lightWrapCanvas.height = this.canvas.height
      const lightWrapImageData = this.lightWrapCanvas.getContext("2d")!.getImageData(0, 0, this.lightWrapCanvas.width, this.lightWrapCanvas.height)
      const lightWrapdata = lightWrapImageData.data

      for (let rowIndex = 0; rowIndex < this.canvas.height; rowIndex++) {
        for (let colIndex = 0; colIndex < this.canvas.width; colIndex++) {
          const pix_offset = ((rowIndex * this.canvas.width) + colIndex) * 4
          if(prediction[rowIndex][colIndex]>140){
            lightWrapdata[pix_offset + 0] = 0
            lightWrapdata[pix_offset + 1] = 0
            lightWrapdata[pix_offset + 2] = 0
            lightWrapdata[pix_offset + 3] = 0
          }else if(prediction[rowIndex][colIndex]>128){
            lightWrapdata[pix_offset + 0] = 0
            lightWrapdata[pix_offset + 1] = 0
            lightWrapdata[pix_offset + 2] = 0
            lightWrapdata[pix_offset + 3] = 0
            // lightWrapdata[pix_offset + 0] = 255
            // lightWrapdata[pix_offset + 1] = 255
            // lightWrapdata[pix_offset + 2] = 255
            // lightWrapdata[pix_offset + 3] = 100
          // }else if(prediction[rowIndex][colIndex]>80){
          //   lightWrapdata[pix_offset + 0] = 255
          //   lightWrapdata[pix_offset + 1] = 255
          //   lightWrapdata[pix_offset + 2] = 255
          //   lightWrapdata[pix_offset + 3] = 255
          }else{
            lightWrapdata[pix_offset + 0] = 255
            lightWrapdata[pix_offset + 1] = 255
            lightWrapdata[pix_offset + 2] = 255
            lightWrapdata[pix_offset + 3] = 255
          }
        }
      }
      const lightWrapimageDataTransparent = new ImageData(lightWrapdata, this.lightWrapCanvas.width, this.lightWrapCanvas.height);
      this.lightWrapCanvas.getContext("2d")!.putImageData(lightWrapimageDataTransparent, 0, 0)
    }
    
    for (let rowIndex = 0; rowIndex < this.canvas.height; rowIndex++) {
      for (let colIndex = 0; colIndex < this.canvas.width; colIndex++) {
        const seg_offset = ((rowIndex * this.canvas.width) + colIndex)
        const pix_offset = ((rowIndex * this.canvas.width) + colIndex) * 4
        if(prediction[rowIndex][colIndex]>128){
          data[pix_offset + 0] = 0
          data[pix_offset + 1] = 0
          data[pix_offset + 2] = 0
          data[pix_offset + 3] = 0
        }else{
          data[pix_offset + 0] = 255
          data[pix_offset + 1] = 255
          data[pix_offset + 2] = 255
          data[pix_offset + 3] = 255
        }
      }
    }
    
    
    const imageDataTransparent = new ImageData(data, this.canvas.width, this.canvas.height);
    this.canvas.getContext("2d")!.putImageData(imageDataTransparent, 0, 0)

    this.resultCanvasRef.current!.width = this.originalCanvas.current!.width
    this.resultCanvasRef.current!.height = this.originalCanvas.current!.height

    this.personCanvas.width = this.resultCanvasRef.current!.width
    this.personCanvas.height = this.resultCanvasRef.current!.height
    this.personCanvas.getContext("2d")!.drawImage(this.canvas, 0, 0,  this.resultCanvasRef.current!.width,  this.resultCanvasRef.current!.height)
    this.personCanvas.getContext("2d")!.globalCompositeOperation = "source-atop";
    this.personCanvas.getContext("2d")!.drawImage(this.originalCanvas.current!, 0, 0,  this.resultCanvasRef.current!.width,  this.resultCanvasRef.current!.height)
    this.personCanvas.getContext("2d")!.globalCompositeOperation = "source-over";
      
    const ctx = this.resultCanvasRef.current!.getContext("2d")!

    // Draw Background
    if(this.backgroundImage.src){
      ctx.drawImage(this.backgroundCanvas, 0, 0, this.resultCanvasRef.current!.width, this.resultCanvasRef.current!.height)
    }else{
      ctx.drawImage(this.originalCanvas.current!, 0, 0, this.resultCanvasRef.current!.width, this.resultCanvasRef.current!.height)
      ctx.fillStyle="#DD9999AA"
      ctx.fillRect(0, 0, this.resultCanvasRef.current!.width, this.resultCanvasRef.current!.height)
    }

    // Draw light wrapping
    if(this.params.lightWrapping){
      ctx.filter = 'blur(4px)';
      ctx.drawImage(this.lightWrapCanvas, 0, 0, this.resultCanvasRef.current!.width, this.resultCanvasRef.current!.height)
      ctx.filter = 'none';
    }

    // Draw Person

    ctx.drawImage(this.personCanvas, 0, 0, this.resultCanvasRef.current!.width, this.resultCanvasRef.current!.height)
 
  }

  count = 0
  handleResult = (prediction: any) => {
    if(this.config.processOnLocal===true && this.params.directToCanvs===true && this.params.smoothingR===0 && this.params.smoothingS===0){

    }else{
      this.drawSegmentation(prediction)
    }
  }

}


export default App;
