import './App.css';
import {OpenCVWorkerManager, generateOpenCVDefaultConfig, OpenCVConfig, generateDefaultOpenCVParams, OpenCVFunctionType } from '@dannadori/opencv-worker-js'
import DemoBase, { ControllerUIProp } from './DemoBase';

class App extends DemoBase {
  manager:OpenCVWorkerManager = new OpenCVWorkerManager()

  config:OpenCVConfig = (()=>{
    const c = generateOpenCVDefaultConfig()
    c.workerPath = "./opencv-worker-worker.js"
//    c.processOnLocal = true
    return c
  })()
  params = generateDefaultOpenCVParams()

  IMAGE_PATH = "./yuka_kawamura.jpg"
  RESULT_OVERLAY = true


  getCustomMenu = () => {
    const menu: ControllerUIProp[] = [
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
          const processOnLocal = this.controllerRef.current!.getCurrentValue("processOnLocal")
          this.config.processOnLocal     = (processOnLocal === "on" ? true  : false) as boolean
          this.requireReload()
        },
      },
      {
        title: "function",
        currentIndexOrValue: 0,
        values: ["Canny", "Blur"],
        callback: (val: string | number | MediaStream) => {
          switch(val as string){
            case "Canny":
              this.params.type = OpenCVFunctionType.Canny
              break
            case "Blur":
              this.params.type = OpenCVFunctionType.Blur
              break

          }
        },
      },
      {
        title: "threshold1",
        currentIndexOrValue: 50,
        range: [10,100,10],
        callback: (val: string | number | MediaStream) => {
          this.params.cannyParams!.threshold1 = val as number
        },
      },
      {
        title: "threshold2",
        currentIndexOrValue: 50,
        range: [10,100,10],
        callback: (val: string | number | MediaStream) => {
          this.params.cannyParams!.threshold2 = val as number
        },
      },
      {
        title: "apertureSize",
        currentIndexOrValue: 3,
        range: [1,7,2],
        callback: (val: string | number | MediaStream) => {
          this.params.cannyParams!.apertureSize = val as number
        },
      },
      {
        title: "L2gradient",
        currentIndexOrValue: 1,
        values: ["on","off"],
        callback: (val: string | number | MediaStream) => {
          if(val === "on"){
            this.params.cannyParams!.L2gradient = true
          }else{
            this.params.cannyParams!.L2gradient = false
          }
        },
      },
      {
        title: "nega",
        currentIndexOrValue: 0,
        values: ["on","off"],
        callback: (val: string | number | MediaStream) => {
          if(val === "on"){
            this.params.cannyParams!.bitwiseNot = true
          }else{
            this.params.cannyParams!.bitwiseNot = false
          }
        },
      },      
      {
        title: "BlurKernelSize",
        currentIndexOrValue: 10,
        range: [2, 50, 1],
        callback: (val: string | number | MediaStream) => {
          this.params.blurParams!.kernelSize = [val as number, val as number]
        },
      },
      {
        title: "ProcessWidth",
        currentIndexOrValue: 300,
        range: [300, 1024, 10],
        callback: (val: string | number | MediaStream) => {
          this.params.processWidth = val as number
        },
      },
      {
        title: "ProcessHeight",
        currentIndexOrValue: 300,
        range: [300, 1024, 10],
        callback: (val: string | number | MediaStream) => {
          this.params.processHeight = val as number
        },
      }
    ]
    return menu
  }

  
  handleResult = (prediction: any) => {
    const ctx = this.resultCanvasRef.current!.getContext("2d")!
    ctx.drawImage(prediction, 0, 0, this.resultCanvasRef.current!.width, this.resultCanvasRef.current!.height)
  }
}


export default App;
