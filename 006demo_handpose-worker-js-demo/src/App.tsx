import './App.css';
import DemoBase, { ControllerUIProp } from './DemoBase';
import { HandPoseWorkerManager, generateHandPoseDefaultConfig, generateDefaultHandPoseParams } from '@dannadori/handpose-worker-js'
import { HandPoseConfig, HandPoseOperatipnParams } from '@dannadori/handpose-worker-js/dist/const';

const fingerLookupIndices:{[key:string]:number[]} = {
  "thumb": [0, 1, 2, 3, 4],
  "indexFinger": [0, 5, 6, 7, 8],
  "middleFinger": [0, 9, 10, 11, 12],
  "ringFinger": [0, 13, 14, 15, 16],
  "pinky": [0, 17, 18, 19, 20]
}

class App extends DemoBase {
  manager: HandPoseWorkerManager = new HandPoseWorkerManager()
  config: HandPoseConfig = (()=>{
    const config = generateHandPoseDefaultConfig()
    return config
  })()
  
  params:HandPoseOperatipnParams = generateDefaultHandPoseParams()

  IMAGE_PATH   = "./yuka_kawamura.jpg"
  RESULT_OVERLAY = true

  getCustomMenu = () =>{
    const menu:ControllerUIProp[]= [
      {
        title:"maxContinuousChecks",
        currentIndexOrValue:Infinity,
        range: [257, Infinity, 1],
        callback: (val:string|number|MediaStream)=>{},
      },
      {
        title:"detectionConfidence",
        currentIndexOrValue: 0.8,
        range: [0, 1, 0.01],
        callback: (val:string|number|MediaStream)=>{},
      },      
      {
        title:"iouThreshold",
        currentIndexOrValue: 0.3,
        range: [0, 1, 0.01],
        callback: (val:string|number|MediaStream)=>{},
      },
      {
        title:"scoreThreshold",
        currentIndexOrValue: 0.75,
        range: [0, 1, 0.01],
        callback: (val:string|number|MediaStream)=>{},
      },
      {
        title: "processOnLocal",
        currentIndexOrValue: 1,
        values: ["on", "off"],
        callback: (val: string | number | MediaStream) => { },
      },
      {
        title: "useTFWasmBackend",
        currentIndexOrValue: 1,
        values: ["on", "off"],
        callback: (val: string | number | MediaStream) => { },
      },
      {
        title:"reload model",
        currentIndexOrValue:0,
        callback: (val:string|number|MediaStream)=>{
          const maxContinuousChecks = this.controllerRef.current!.getCurrentValue("maxContinuousChecks")
          const detectionConfidence = this.controllerRef.current!.getCurrentValue("detectionConfidence")
          const iouThreshold        = this.controllerRef.current!.getCurrentValue("iouThreshold")
          const scoreThreshold      = this.controllerRef.current!.getCurrentValue("scoreThreshold")
          const processOnLocal      = this.controllerRef.current!.getCurrentValue("processOnLocal")
          const useTFWasmBackend    = this.controllerRef.current!.getCurrentValue("useTFWasmBackend")

          this.config.model.maxContinuousChecks = maxContinuousChecks as number
          this.config.model.detectionConfidence = detectionConfidence as number
          this.config.model.iouThreshold        = iouThreshold as number
          this.config.model.scoreThreshold      = scoreThreshold as number
          this.config.processOnLocal            = (processOnLocal === "on" ? true  : false) as boolean
          this.config.useTFWasmBackend          = (useTFWasmBackend === "on" ? true  : false) as boolean

          this.requireReload()
        },
      },
      {
        title:"flip",
        currentIndexOrValue:0,
        values: ["on", "off"],
        callback: (val:string|number|MediaStream)=>{
          if(val === "on"){
            this.params.estimateHands.flipHorizontal = true
          }else{
            this.params.estimateHands.flipHorizontal = false
          }
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
    //console.log("prediction",prediction)
    const ctx = this.resultCanvasRef.current!.getContext("2d")!
    ctx.drawImage(this.originalCanvas.current!, 0, 0, this.originalCanvas.current!.width, this.originalCanvas.current!.height)

    const scaleX = this.originalCanvas.current!.width/this.params.processWidth
    const scaleY = this.originalCanvas.current!.height/this.params.processHeight
    prediction.forEach( (x:any)=>{
      const landmarks = x.landmarks as number[][]
      landmarks.forEach(landmark=>{
        const x = landmark[0] * scaleX
        const y = landmark[1] * scaleY
        ctx.fillRect(x,y,5,5)
      })

      const fingers = Object.keys(fingerLookupIndices);
      fingers.forEach(x=>{
        const points = fingerLookupIndices[x].map(idx => landmarks[idx])

        ctx.beginPath();
        ctx.moveTo(points[0][0]*scaleX, points[0][1]*scaleY);
        for (let i = 1; i < points.length; i++) {
          const point = points[i];
          ctx.lineTo(point[0]*scaleX, point[1]*scaleY);
        }
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.closePath();
      })  
    })


    // ctx.drawImage(prediction, 0, 0, this.resultCanvasRef.current!.width, this.resultCanvasRef.current!.height)
  }

}

export default App;
