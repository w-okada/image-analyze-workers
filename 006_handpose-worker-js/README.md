This is webworker module for [HandPose](https://github.com/tensorflow/tfjs-models/tree/master/handpose).

## HandPose
![image](https://user-images.githubusercontent.com/48346627/95988209-88868300-0e63-11eb-809a-35a52b7f77fe.png)

## Install
```
$ npm install \@dannadori/handpose-worker-js
$ cp node_modules/\@dannadori/handpose-worker-js/dist/handpose-worker-worker.js public/
$ cp node_modules/\@tensorflow/tfjs-backend-wasm/dist/tfjs-backend-wasm.wasm public/

```
## API

```
generateHandPoseDefaultConfig: () => HandPoseConfig;
generateDefaultHandPoseParams: () => HandPoseOperatipnParams;
drawHandSkelton: (srcCanvas: HTMLCanvasElement, prediction: any, params: HandPoseOperatipnParams) => ImageData;

HandPoseWorkerManager {
init: (config: HandPoseConfig | null) => Promise<unknown>;
predict: (targetCanvas: HTMLCanvasElement, params: HandPoseOperatipnParams) => Promise<any>;

```

## Configuration and Parameter

```
export interface HandPoseConfig {
    browserType           : BrowserType;
    model                 : ModelConfig;
    useTFWasmBackend      : boolean;
    wasmPath              : string;
    processOnLocal        : boolean;
    modelReloadInterval   : number;
    workerPath            : string 
}

export enum HandPoseFunctionType{
    EstimateHands,
}

export interface HandPoseOperatipnParams{
    type                : HandPoseFunctionType
    estimateHands       : EstimateHandsParams
    processWidth        : number
    processHeight       : number
}

export interface EstimateHandsParams{
    flipHorizontal: boolean
}

```

## Step by step
### Create environment and install package
```
$ create-react-app demo/  --typescript
$ cd demo/
$ npm install
$ npm install @dannadori/handpose-worker-js
$ cp node_modules/\@dannadori/handpose-worker-js/dist/handpose-worker-worker.js public/
$ cp node_modules/\@tensorflow/tfjs-backend-wasm/dist/tfjs-backend-wasm.wasm public/

```

### Add source image to public. 
In this time, the name is "srcImage.jpg"

### Edit src/App.tsx
Sample code is here.

```
import React from 'react';
import './App.css';
import { HandPoseWorkerManager, generateDefaultHandPoseParams, generateHandPoseDefaultConfig, drawHandSkelton } from '@dannadori/handpose-worker-js'

class App extends React.Component{
  
  manager = new HandPoseWorkerManager()
  config = generateHandPoseDefaultConfig()
  params = generateDefaultHandPoseParams()

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
        const imageData = drawHandSkelton(this.srcCanvas, res, this.params)
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





