import './App.css';
import { BisenetV2CelebAMaskWorkerManager, generateBisenetV2CelebAMaskDefaultConfig, generateDefaultBisenetV2CelebAMaskParams } from '@dannadori/bisenetv2-celebamask-worker-js'
import DemoBase, { ControllerUIProp } from './DemoBase';

export const rainbow = [
  [110, 64, 170], [143, 61, 178], [178, 60, 178], [210, 62, 167],
  [238, 67, 149], [255, 78, 125], [255, 94, 99],  [255, 115, 75],
  [255, 140, 56], [239, 167, 47], [217, 194, 49], [194, 219, 64],
  [175, 240, 91], [135, 245, 87], [96, 247, 96],  [64, 243, 115],
  [40, 234, 141], [28, 219, 169], [26, 199, 194], [33, 176, 213],
  [47, 150, 224], [65, 125, 224], [84, 101, 214], [99, 81, 195]
];

class App extends DemoBase {
  manager: BisenetV2CelebAMaskWorkerManager = new BisenetV2CelebAMaskWorkerManager()
  canvas = document.createElement("canvas")

  config = (()=>{
    const c = generateBisenetV2CelebAMaskDefaultConfig()
    c.useTFWasmBackend = false
    c.modelPath="/bisenetv2-celebamask/model.json"
    // c.workerPath="/P01_wokers/t08_bisenetv2-celebamask/bisenetv2-celebamask-worker-worker.js"
    // c.workerPath="./bisenetv2-celebamask-worker-worker.js"
    return c
  })()
  params = (()=>{
    const p = generateDefaultBisenetV2CelebAMaskParams()
    p.processHeight=256
    p.processWidth=256
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
      // {
      //   title: "modelPath",
      //   currentIndexOrValue: 1,
      //   displayLabels:["Float32","UINT8"],
      //   values: ["/white-box-cartoonization-conv/model.json", "/white-box-cartoonization/model.json"],
      //   callback: (val: string | number | MediaStream) => { },
      // },
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
          this.requireReload()
        },
      },
      {
        title: "ProcessWidth",
        currentIndexOrValue: 256,
        range: [128, 1024, 10],
        callback: (val: string | number | MediaStream) => {
          this.params.processWidth = val as number
        },
      },
      {
        title: "ProcessHeight",
        currentIndexOrValue: 256,
        range: [128, 1024, 10],
        callback: (val: string | number | MediaStream) => {
          this.params.processHeight = val as number
        },
      }
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

        data[pix_offset + 0] = 128
        data[pix_offset + 1] = rainbow[prediction[rowIndex][colIndex]][0]
        data[pix_offset + 2] = rainbow[prediction[rowIndex][colIndex]][1]
        data[pix_offset + 3] = rainbow[prediction[rowIndex][colIndex]][2]
        // data[pix_offset + 1] = rainbow[prediction[colIndex][rowIndex]][0]
        // data[pix_offset + 2] = rainbow[prediction[colIndex][rowIndex]][1]
        // data[pix_offset + 3] = rainbow[prediction[colIndex][rowIndex]][2]
      }
    }
    const imageDataTransparent = new ImageData(data, this.canvas.width, this.canvas.height);
    this.canvas.getContext("2d")!.putImageData(imageDataTransparent, 0, 0)

    this.resultCanvasRef.current!.width = this.originalCanvas.current!.width
    this.resultCanvasRef.current!.height = this.originalCanvas.current!.height
    const ctx = this.resultCanvasRef.current!.getContext("2d")!
    // ctx.globalCompositeOperation = 'source-in';
    ctx.drawImage(this.originalCanvas.current!, 0, 0, this.resultCanvasRef.current!.width, this.resultCanvasRef.current!.height)
    ctx.drawImage(this.canvas, 0, 0, this.resultCanvasRef.current!.width, this.resultCanvasRef.current!.height)
  }


  handleResult = (prediction: any) => {
    //console.log(prediction)
    this.drawSegmentation(prediction)
    // const ctx = this.resultCanvasRef.current!.getContext("2d")!
    // ctx.clearRect(0, 0, this.resultCanvasRef.current!.width, this.resultCanvasRef.current!.height)
    // ctx.drawImage(prediction, 0, 0, this.resultCanvasRef.current!.width, this.resultCanvasRef.current!.height)
  }

  componentDidMount(){
    super.componentDidMount()

    const root = document.getElementById("root")
    const cite = document.createElement("div")
    cite.innerHTML = '<a href="https://github.com/MaybeShewill-CV/bisenetv2-tensorflow">BiseNetv2-Tensorflow</a>'
    root!.appendChild(cite)
  }
}


export default App;
