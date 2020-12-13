import './App.css';
import DemoBase, { ControllerUIProp } from './DemoBase';
import { generateDefaultU2NetPortraitParams, generateU2NetPortraitDefaultConfig, U2NetPortraitWorkerManager} from '@dannadori/u2net-portrait-worker-js'

class App extends DemoBase {
  manager:U2NetPortraitWorkerManager = new U2NetPortraitWorkerManager()
  canvas = document.createElement("canvas")

  config = (()=>{
    const c = generateU2NetPortraitDefaultConfig()
    c.useTFWasmBackend = true
    c.wasmPath = ""
    c.modelPath="/u2net-portrait_192/model.json"
    return c
  })()
  params = (()=>{
    const p = generateDefaultU2NetPortraitParams()
    p.processHeight=192
    p.processWidth=192
    return p
  })()

  getCustomMenu = () => {
    const menu: ControllerUIProp[] = [
      {
        title: "processOnLocal",
        currentIndexOrValue: 1,
        values: ["on", "off"],
        callback: (val: string | number | MediaStream) => { },
      },
      {
        title: "modelPath",
        currentIndexOrValue: 0,
        displayLabels:["u2net192", "u2net256", "u2net320", "u2net512", "u2net1024"],
        values: ["/u2net-portrait_192/model.json", "/u2net-portrait_256/model.json", "/u2net-portrait_320/model.json", "/u2net-portrait_512/model.json", "/u2net-portrait_1024/model.json"],
        callback: (val: string | number | MediaStream) => {
        },
      },
      {
        title: "useTFWasmBackend",
        currentIndexOrValue: 0,
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
          if(path.indexOf("192") > 0){
            this.params.processWidth = 192
            this.params.processHeight = 192
          }else if(path.indexOf("256") > 0){
            this.params.processWidth = 256
            this.params.processHeight = 256
          }else if(path.indexOf("320") > 0){
            this.params.processWidth = 320
            this.params.processHeight = 320
          }else if(path.indexOf("512") > 0){
            this.params.processWidth = 512
            this.params.processHeight = 512
          }else if(path.indexOf("1024") > 0){
            this.params.processWidth = 1024
            this.params.processHeight = 1024
          }          


          this.requireReload()
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
    for (let rowIndex = 0; rowIndex < this.canvas.height; rowIndex++) {
      for (let colIndex = 0; colIndex < this.canvas.width; colIndex++) {
        const seg_offset = ((rowIndex * this.canvas.width) + colIndex)
        const pix_offset = ((rowIndex * this.canvas.width) + colIndex) * 4
        if(prediction[rowIndex][colIndex] > 0.005){

          data[pix_offset + 0] = prediction[rowIndex][colIndex] *255
          data[pix_offset + 1] = prediction[rowIndex][colIndex] *255
          data[pix_offset + 2] = prediction[rowIndex][colIndex] *255
          data[pix_offset + 3] = 255

          // data[pix_offset + 0] = 0
          // data[pix_offset + 1] = 0
          // data[pix_offset + 2] = 0
          // data[pix_offset + 3] = 0
        }else{
          data[pix_offset + 0] = 0
          data[pix_offset + 1] = 0
          data[pix_offset + 2] = 0
          data[pix_offset + 3] = 0
          // data[pix_offset + 0] = 0
          // data[pix_offset + 1] = 0
          // data[pix_offset + 2] = 0
          // data[pix_offset + 3] = 255  
        }
      }
    }
    const imageDataTransparent = new ImageData(data, this.canvas.width, this.canvas.height);
    this.canvas.getContext("2d")!.putImageData(imageDataTransparent, 0, 0)

    this.resultCanvasRef.current!.width = this.originalCanvas.current!.width
    this.resultCanvasRef.current!.height = this.originalCanvas.current!.height
    const ctx = this.resultCanvasRef.current!.getContext("2d")!
    ctx.drawImage(this.canvas, 0, 0, this.resultCanvasRef.current!.width, this.resultCanvasRef.current!.height)
  }

  count = 0
  handleResult = (prediction: any) => {
//    console.log(prediction[0])
    this.drawSegmentation(prediction[0])
  }

  componentDidMount(){
    super.componentDidMount()
  }
}


export default App;
