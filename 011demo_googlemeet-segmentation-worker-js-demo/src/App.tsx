import './App.css';
import DemoBase, { ControllerUIProp } from './DemoBase';
import { generateDefaultGoogleMeetSegmentationParams, generateGoogleMeetSegmentationDefaultConfig, GoogleMeetSegmentationWorkerManager } from '@dannadori/googlemeet-segmentation-worker-js'

class App extends DemoBase {
  manager:GoogleMeetSegmentationWorkerManager = new GoogleMeetSegmentationWorkerManager()
  canvas = document.createElement("canvas")
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
        values: ["/googlemeet-segmentation_128_32/model.json", "/googlemeet-segmentation_128_16/model.json", 
          "/googlemeet-segmentation_144_32/model.json", "googlemeet-segmentation_144_16/model.json", 
          "/googlemeet-segmentation_96_32/model.json", "googlemeet-segmentation_96_16/model.json" ],
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
        title: "resizeWithCanvas",
        currentIndexOrValue: 1,
        values: ["on", "off"],
        callback: (val: string | number | MediaStream) => {
          const resizeWithCanvas = this.controllerRef.current!.getCurrentValue("resizeWithCanvas")
          this.params.resizeWithCanvas = (resizeWithCanvas === "on" ? true  : false) as boolean
        },
      },

    ]
    return menu
  }



  drawSegmentation = (prediction: number[][]) => {
    this.canvas.width = prediction[0].length
    this.canvas.height = prediction.length
    const imageData = this.canvas.getContext("2d")!.getImageData(0, 0, this.canvas.width, this.canvas.height)
    const data = imageData.data
    const useIndex = 1
    for (let rowIndex = 0; rowIndex < this.canvas.height; rowIndex++) {
      for (let colIndex = 0; colIndex < this.canvas.width; colIndex++) {
        const seg_offset = ((rowIndex * this.canvas.width) + colIndex)
        const pix_offset = ((rowIndex * this.canvas.width) + colIndex) * 4
        if(prediction[rowIndex][colIndex]>0.5){
          data[pix_offset + 0] = 70
          data[pix_offset + 1] = 30
          data[pix_offset + 2] = 30
          data[pix_offset + 3] = 200
        }else{
          data[pix_offset + 0] = 0
          data[pix_offset + 1] = 0
          data[pix_offset + 2] = 0
          data[pix_offset + 3] = 0
        }
      }
    }
    const imageDataTransparent = new ImageData(data, this.canvas.width, this.canvas.height);
    this.canvas.getContext("2d")!.putImageData(imageDataTransparent, 0, 0)

    this.resultCanvasRef.current!.width = this.originalCanvas.current!.width
    this.resultCanvasRef.current!.height = this.originalCanvas.current!.height
    const ctx = this.resultCanvasRef.current!.getContext("2d")!

    ctx.drawImage(this.originalCanvas.current!, 0, 0, this.resultCanvasRef.current!.width, this.resultCanvasRef.current!.height)

    // if(this.smoothing){
    //   console.log("smoothing!")
    //   ctx.imageSmoothingEnabled = true
    //   ctx.imageSmoothingQuality = "high"
    // }
    ctx.drawImage(this.canvas, 0, 0, this.resultCanvasRef.current!.width, this.resultCanvasRef.current!.height)
  }

  count = 0
  handleResult = (prediction: any) => {
    this.drawSegmentation(prediction)
  }

}


export default App;
