import './App.css';
import { CartoonWorkerManager, generateCartoonDefaultConfig, generateDefaultCartoonParams } from '@dannadori/white-box-cartoonization-worker-js'
import DemoBase, { ControllerUIProp } from './DemoBase';

class App extends DemoBase {
  manager: CartoonWorkerManager = new CartoonWorkerManager()
  canvas = document.createElement("canvas")

  config = (()=>{
    const c = generateCartoonDefaultConfig()
    c.useTFWasmBackend = false
    return c
  })()
  params = generateDefaultCartoonParams()

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
        currentIndexOrValue: 1,
        displayLabels:["Float32","UINT8"],
        values: ["/white-box-cartoonization-conv/model.json", "/white-box-cartoonization/model.json"],
        callback: (val: string | number | MediaStream) => { },
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
      {
        title: "ProcessResolution",
        currentIndexOrValue: 3,
        values: [64, 128, 192, 256, 320, 440, 512],
        callback: (val: string | number | MediaStream) => {
          this.params.processWidth = val as number
          this.params.processHeight = val as number
        },
      },
      // {
      //   title: "ProcessHeight",
      //   currentIndexOrValue: 256,
      //   range: [256, 720, 10],
      //   callback: (val: string | number | MediaStream) => {
      //     this.params.processHeight = val as number
      //   },
      // }

    ]
    return menu
  }

  handleResult = (prediction: any) => {
    const ctx = this.resultCanvasRef.current!.getContext("2d")!
    ctx.clearRect(0, 0, this.resultCanvasRef.current!.width, this.resultCanvasRef.current!.height)
    ctx.drawImage(prediction, 0, 0, this.resultCanvasRef.current!.width, this.resultCanvasRef.current!.height)
  }

  componentDidMount(){
    super.componentDidMount()

    const root = document.getElementById("root")
    const cite = document.createElement("div")
    cite.innerHTML = '<a href="https://github.com/SystemErrorWang/White-box-Cartoonization">White-box-Cartoonization</a>'
    root!.appendChild(cite)
  }
}


export default App;
