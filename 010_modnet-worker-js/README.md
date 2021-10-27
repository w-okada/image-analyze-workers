# MODNet

![image](https://user-images.githubusercontent.com/48346627/113265897-9c3d7d00-930f-11eb-95ca-98529cccb7a6.png)

## MODNet License

This project (code, pre-trained models, demos, etc.) is released under the Creative Commons Attribution NonCommercial ShareAlike 4.0 license.

NOTE: The license will be changed to allow commercial use after this work is accepted by a conference or a journal.

see [original github](https://github.com/ZHKKKe/MODNet)

## Install

```
## install
$ npm install @dannadori/modnet-worker-js
```

## API

```
generateMODNetDefaultConfig: () => MODNetConfig;
generateDefaultMODNetParams: () => MODNetOperationParams;
createForegroundImage: (srcCanvas: HTMLCanvasElement, prediction: number[][]) => ImageData;

export declare class MODNetWorkerManager {
    private workerMN;
    private canvasOut;
    private canvas;
    private config;
    private localWorker;
    init: (config: MODNetConfig | null) => Promise<void>;
    predict: (targetCanvas: HTMLCanvasElement, params?: MODNetOperationParams) => Promise<number[][] | null>;
}


```

## Configuration and Parameter

```
export interface MODNetConfig {
    browserType: BrowserType;
    processOnLocal: boolean;
    useTFWasmBackend: boolean;
    wasmPath: string;
    modelPath: string;
    workerPath: string;
}
export interface MODNetOperationParams {
    type: MODNetFunctionType;
    processWidth: number;
    processHeight: number;
}
export declare enum MODNetFunctionType {
    Segmentation = 0,
    xxx = 1
}

```

## Step by step

### Create environment and install package

```
$ npx create-react-app demo --template typescript
$ cd demo/
$ npm install
$ npm install @dannadori/modnet-worker-js
```

### Add source image to public.

In this time, the name is "srcImage.jpg"

### Edit src/App.tsx

Sample code is here.

```
import React from 'react';
import './App.css';
import { generateDefaultU2NetPortraitParams, generateU2NetPortraitDefaultConfig, U2NetPortraitWorkerManager, createForegroundImage } from '@dannadori/u2net-portrait-worker-js'

class App extends React.Component{

  manager = new U2NetPortraitWorkerManager()

  config = (()=>{
    const c = generateU2NetPortraitDefaultConfig()
    c.useTFWasmBackend = false
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
        const foreground = createForegroundImage(this.srcCanvas, res)
        this.dstCanvas.getContext("2d")!.putImageData(foreground, 0, 0)
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
