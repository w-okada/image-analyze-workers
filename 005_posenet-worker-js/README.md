This is webworker module for [Posenet](https://github.com/tensorflow/tfjs-models/tree/master/posenet).

## PoseNet
![image](https://user-images.githubusercontent.com/48346627/95988122-6260e300-0e63-11eb-9b1e-8712b47410dd.png)


## Install
```
$ npm install \@dannadori/posenet-worker-js
$ cp node_modules/\@dannadori/posenet-worker-js/dist/posenet-worker-worker.js public/
```
## API

```
generatePoseNetDefaultConfig: () => PoseNetConfig;
generateDefaultPoseNetParams: () => PoseNetOperatipnParams;
drawSkeltonAndPoint: (srcCanvas: HTMLCanvasElement, prediction: poseNet.Pose[]) => ImageData;

PoseNetWorkerManager
init(config?: PoseNetConfig | null): Promise<unknown>;
predict(targetCanvas: HTMLCanvasElement, params?: PoseNetOperatipnParams): Promise<poseNet.Pose[]>;

```

## Configuration and Parameter

```
export interface PoseNetConfig{
    browserType         : BrowserType
    model               : ModelConfig
    processOnLocal      : boolean
    // processWidth        : number
    // processHeight       : number
    workerPath            : string    
}

export enum PoseNetFunctionType{
    SinglePerson,
    MultiPerson,// Not implemented
}

export interface PoseNetOperatipnParams{
    type               : PoseNetFunctionType
    singlePersonParams : SinglePersonInterfaceConfig
    multiPersonParams  : MultiPersonInferenceConfig
}

```

## Step by step
### Create environment and install package
```
$ create-react-app demo/  --typescript
$ cd demo/
$ npm install
$ npm install @dannadori/posenet-worker-js
$ cp node_modules/\@dannadori/posenet-worker-js/dist/posenet-worker-worker.js public/
```

### Add source image to public. 
In this time, the name is "srcImage.jpg"

### Edit src/App.tsx
Sample code is here.

```
import React from 'react';
import './App.css';
import { PoseNetWorkerManager, generateDefaultPoseNetParams, generatePoseNetDefaultConfig, drawSkeltonAndPoint } from '@dannadori/posenet-worker-js'

class App extends React.Component{
  
  manager = new PoseNetWorkerManager()
  config = generatePoseNetDefaultConfig()
  params = generateDefaultPoseNetParams()

  srcCanvas = document.createElement("canvas")
  dstCanvas = document.createElement("canvas")

  componentDidMount = () =>{
    document.getRootNode().lastChild!.appendChild(this.srcCanvas)
    document.getRootNode().lastChild!.appendChild(this.dstCanvas)
    const srcImage = document.createElement("img")
    srcImage.onload = () =>{
      this.manager.init(this.config).then(()=>{
        this.srcCanvas.getContext("2d")!.drawImage(
          srcImage, 0, 0, this.srcCanvas.width, this.dstCanvas.height)
        return this.manager.predict(this.srcCanvas, this.params)
      }).then((res)=>{
        const imageData = drawSkeltonAndPoint(this.srcCanvas, res)
        console.log(res)
        this.dstCanvas.getContext("2d")!.putImageData(imageData, 0, 0)
      })
    }
    srcImage.src = "./srcImage.jpg"
  }

  render = ()=>{
    return (
      <div className="App">
      </div>
    );
  }
}

export default App;


```

### build and start

```
$ npm run start
```





