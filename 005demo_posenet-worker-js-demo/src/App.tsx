import './App.css';
import {PoseNetWorkerManager, generatePoseNetDefaultConfig, generateDefaultPoseNetParams, 
  Pose, getAdjacentKeyPoints, ModelConfigResNet50,
  PoseNetOperatipnParams, PoseNetFunctionType } from '@dannadori/posenet-worker-js'
import { PoseNetConfig  } from '@dannadori/posenet-worker-js/dist/const';

import DemoBase, { ControllerUIProp } from './DemoBase';



class App extends DemoBase {
  manager: PoseNetWorkerManager = new PoseNetWorkerManager()
  config:PoseNetConfig = (()=>{
    const config = generatePoseNetDefaultConfig()
//    this.config.model = ModelConfigResNet50
    config.model = ModelConfigResNet50    
    return config
  })()
  
  params:PoseNetOperatipnParams = generateDefaultPoseNetParams()

  IMAGE_PATH   = "./yuka_kawamura.jpg"
  RESULT_OVERLAY = true


  getCustomMenu = () =>{
    const menu:ControllerUIProp[]= [
      {
        title:"arch",
        currentIndexOrValue: 1,
        values:["MobileNetV1", "ResNet50"],
        callback: (val:string|number|MediaStream)=>{},
      },
      {
        title:"outputStride",
        currentIndexOrValue:1,
        values: [8, 16, 32],
        callback: (val:string|number|MediaStream)=>{},
  
      },
      {
        title:"multiplier",
        currentIndexOrValue: 0,
        values: [1.0, 0.75, 0.50],
        callback: (val:string|number|MediaStream)=>{},
      },
      {
        title:"quantBytes",
        currentIndexOrValue:4,
        values: [4, 2, 1],
        callback: (val:string|number|MediaStream)=>{},
      },
      {
        title:"inputResolution(w)",
        currentIndexOrValue:257,
        range: [257, 640, 1],
        callback: (val:string|number|MediaStream)=>{},
      },
      {
        title:"inputResolution(h)",
        currentIndexOrValue:257,
        range: [257, 480, 1],
        callback: (val:string|number|MediaStream)=>{},
      },
      {
        title: "processOnLocal",
        currentIndexOrValue: 1,
        values: ["on", "off"],
        callback: (val: string | number | MediaStream) => { },
      },
      {
        title:"reload model",
        currentIndexOrValue:0,
        callback: (val:string|number|MediaStream)=>{
          const modelArch = this.controllerRef.current!.getCurrentValue("arch")
          const outputStride = this.controllerRef.current!.getCurrentValue("outputStride")
          const multiplier = this.controllerRef.current!.getCurrentValue("multiplier")
          const quantBytes = this.controllerRef.current!.getCurrentValue("quantBytes")
          const w = this.controllerRef.current!.getCurrentValue("inputResolution(w)")
          const h = this.controllerRef.current!.getCurrentValue("inputResolution(h)")       
          const processOnLocal = this.controllerRef.current!.getCurrentValue("processOnLocal")

          console.log(modelArch)
          this.config.model.architecture = modelArch as ('ResNet50' | 'MobileNetV1')
          this.config.model.outputStride = outputStride as (32 | 16 | 8)
          this.config.model.multiplier = multiplier as ( 0.50 | 0.75 | 1.0)
          this.config.model.quantBytes = quantBytes as (4 | 2 | 1)
          this.config.model.inputResolution = { width:w as number, height: h as number }
          this.config.processOnLocal     = (processOnLocal === "on" ? true  : false) as boolean

          this.requireReload()
        },
      },
      {
        title:"function",
        currentIndexOrValue:0,
        values: ["single person", "multiple person"],
        callback: (val:string|number|MediaStream)=>{
          if(val === "single person"){
            this.params.type = PoseNetFunctionType.SinglePerson
          }else{
            this.params.type = PoseNetFunctionType.MultiPerson
          }
        },
      },
      {
        title:"flip",
        currentIndexOrValue:0,
        values: ["on", "off"],
        callback: (val:string|number|MediaStream)=>{
          if(val === "on"){
            this.params.singlePersonParams!.flipHorizontal = true
            this.params.multiPersonParams!.flipHorizontal = true
          }else{
            this.params.singlePersonParams!.flipHorizontal = false
            this.params.multiPersonParams!.flipHorizontal = false
          }
        },
      },
      {
        title:"max detection",
        currentIndexOrValue:5,
        range: [1, 10, 1],
        callback: (val:string|number|MediaStream)=>{
          this.params.multiPersonParams!.maxDetections = val as number
        },
      },
      {
        title:"score threshold",
        currentIndexOrValue:0.5,
        range: [0, 1, 0.1],
        callback: (val:string|number|MediaStream)=>{
          this.params.multiPersonParams!.scoreThreshold = val as number
        },
        
      },
      {
        title:"nms radius",
        currentIndexOrValue:20,
        range: [1, 50, 1],
        callback: (val:string|number|MediaStream)=>{
          this.params.multiPersonParams!.nmsRadius = val as number
        },
      }
    ]
    return menu
  }

  drawPoints = (prediction:Pose, width:number, height:number) => {
    const keypoints = prediction.keypoints

    for (let i = 0; i < keypoints.length; i++) {
      const keypoint = keypoints[i];
  
      // const scaleX = width/this.config.processWidth
      // const scaleY = height/this.config.processHeight
      const scaleX = 1
      const scaleY = 1  

      const x = keypoint.position.x;
      const y = keypoint.position.y;
      const ctx = this.resultCanvasRef.current!.getContext("2d")!
//      console.log(x,y)
      ctx.fillStyle = "rgba(0,0,255,0.3)";
      ctx.fillRect(
        x * scaleX,
        y * scaleY,
        6,6)
    }
  }
  drawSkeleton = (prediction:Pose, width:number, height:number) => {
    const adjacentKeyPoints = getAdjacentKeyPoints(prediction.keypoints, 0.0)
    // const scaleX = width/this.config.processWidth
    // const scaleY = height/this.config.processHeight
    const scaleX = 1
    const scaleY = 1

    const ctx = this.resultCanvasRef.current!.getContext("2d")!
    adjacentKeyPoints.forEach(keypoints => {
      ctx.beginPath();
      ctx.moveTo(keypoints[0].position.x * scaleX, keypoints[0].position.y * scaleY);
      ctx.lineTo(keypoints[1].position.x * scaleX, keypoints[1].position.y * scaleY);
      ctx.lineWidth = 6;
      ctx.strokeStyle = "rgba(255,0,0,0.3)";
      ctx.stroke();
    })
  }
  
  handleResult =(prediction:Pose[])=>{
    this.resultCanvasRef.current!.getContext("2d")!.drawImage(this.originalCanvas.current!, 0, 0, this.originalCanvas.current!.width, this.originalCanvas.current!.height)
    
    prediction.forEach((x:Pose)=>{
      this.drawPoints(x, this.imageElementRef.current!.width, this.imageElementRef.current!.height)
      this.drawSkeleton(x, this.imageElementRef.current!.width, this.imageElementRef.current!.height)
    })
  }
}



export default App;
