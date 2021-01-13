import './App.css';
import DemoBase, { ControllerUIProp } from './DemoBase';
import { generateDefaultMODNetParams, generateMODNetDefaultConfig, MODNetWorkerManager } from '@dannadori/modnet-worker-js'

class App extends DemoBase {
  manager:MODNetWorkerManager = new MODNetWorkerManager()
  canvas = document.createElement("canvas")

  config = (()=>{
    const c = generateMODNetDefaultConfig()
    c.useTFWasmBackend = false
    // c.wasmPath = ""
    c.modelPath="/modnet/model.json"
    return c
  })()
  params = (()=>{
    const p = generateDefaultMODNetParams()
    p.processHeight=512
    p.processWidth=512
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
        displayLabels:["modnet"],
        values: ["/modnet/model.json"],
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
        if(prediction[rowIndex][colIndex] > 0.000){

          data[pix_offset + 0] = prediction[rowIndex][colIndex] *255
          data[pix_offset + 1] = prediction[rowIndex][colIndex] *255
          data[pix_offset + 2] = prediction[rowIndex][colIndex] *255
          data[pix_offset + 3] = 255 - prediction[rowIndex][colIndex] *255
          // data[pix_offset + 3] = 255

          // data[pix_offset + 0] = 0
          // data[pix_offset + 1] = 0
          // data[pix_offset + 2] = 0
          // data[pix_offset + 3] = 0
        }else{
          data[pix_offset + 0] = 0
          data[pix_offset + 1] = 0
          data[pix_offset + 2] = 0
          data[pix_offset + 3] = 255
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
    ctx.drawImage(this.originalCanvas.current!, 0, 0, this.originalCanvas.current!.width, this.originalCanvas.current!.height)
    ctx.drawImage(this.canvas, 0, 0, this.resultCanvasRef.current!.width, this.resultCanvasRef.current!.height)
  }

  count = 0
  handleResult = (prediction: any) => {
    console.log(prediction)
    this.drawSegmentation(prediction)
  }

  componentDidMount(){

    super.componentDidMount()
  }
}


export default App;
