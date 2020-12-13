# BiseNetv2 Celeb A Mask

![image](https://user-images.githubusercontent.com/48346627/97803282-822e3e80-1c8c-11eb-8635-74d937e5a8f6.png)

## Install
```
## install
$ npm install @dannadori/bisenetv2-celebamask-worker-js
$ cp node_modules/\@dannadori/bisenetv2-celebamask-worker-js/dist/bisenetv2-celebamask-worker-worker.js public/
$ cp node_modules/\@tensorflow/tfjs-backend-wasm/dist/tfjs-backend-wasm.wasm public/

## download model
$ mkdir public/bisenetv2-celebamask
$ curl 'https://flect-lab-web.s3-us-west-2.amazonaws.com/bisenetv2-celebamask/model.json' > public/bisenetv2-celebamask/model.json
$ curl 'https://flect-lab-web.s3-us-west-2.amazonaws.com/bisenetv2-celebamask/group1-shard1of3.bin' > public/bisenetv2-celebamask/group1-shard1of3.bin
$ curl 'https://flect-lab-web.s3-us-west-2.amazonaws.com/bisenetv2-celebamask/group1-shard2of3.bin' > public/bisenetv2-celebamask/group1-shard2of3.bin
$ curl 'https://flect-lab-web.s3-us-west-2.amazonaws.com/bisenetv2-celebamask/group1-shard3of3.bin' > public/bisenetv2-celebamask/group1-shard3of3.bin
```
## API

```
generateBisenetV2CelebAMaskDefaultConfig: () => BisenetV2CelebAMaskConfig;
generateDefaultBisenetV2CelebAMaskParams: () => BisenetV2CelebAMaskOperatipnParams;
export declare const createForegroundImage: (srcCanvas: HTMLCanvasElement, prediction: number[][]) => ImageData;

BisenetV2CelebAMaskWorkerManager
init(config: BisenetV2CelebAMaskConfig | null): Promise<unknown>;
predict(targetCanvas: HTMLCanvasElement, params?: BisenetV2CelebAMaskOperatipnParams): Promise<number[][]>;
```

## Configuration and Parameter

```
export interface BisenetV2CelebAMaskConfig{
    browserType         : BrowserType
    processOnLocal      : boolean
    useTFWasmBackend    : boolean
    wasmPath            : string
    modelPath           : string
    workerPath          : string
}

export interface BisenetV2CelebAMaskOperatipnParams{
    type        : BisenetV2CelebAMaskFunctionType
    processWidth        : number
    processHeight       : number
}

export enum BisenetV2CelebAMaskFunctionType{
    Mask,
    xxx, // Not implemented
}


```

## Step by step
### Create environment and install package
```
$ create-react-app demo/  --typescript
$ cd demo/
$ npm install
$ npm install @dannadori/bisenetv2-celebamask-worker-js
$ cp node_modules/\@dannadori/bisenetv2-celebamask-worker-js/dist/bisenetv2-celebamask-worker-worker.js public/
$ cp node_modules/\@tensorflow/tfjs-backend-wasm/dist/tfjs-backend-wasm.wasm public/
```

### Download Model
```
$ mkdir public/bisenetv2-celebamask
$ curl 'https://flect-lab-web.s3-us-west-2.amazonaws.com/bisenetv2-celebamask/model.json' > public/bisenetv2-celebamask/model.json
$ curl 'https://flect-lab-web.s3-us-west-2.amazonaws.com/bisenetv2-celebamask/group1-shard1of3.bin' > public/bisenetv2-celebamask/group1-shard1of3.bin
$ curl 'https://flect-lab-web.s3-us-west-2.amazonaws.com/bisenetv2-celebamask/group1-shard2of3.bin' > public/bisenetv2-celebamask/group1-shard2of3.bin
$ curl 'https://flect-lab-web.s3-us-west-2.amazonaws.com/bisenetv2-celebamask/group1-shard3of3.bin' > public/bisenetv2-celebamask/group1-shard3of3.bin
```

### Add source image to public. 
In this time, the name is "srcImage.jpg"

### Edit src/App.tsx
Sample code is here.

```
import React from 'react';
import './App.css';
import { BisenetV2CelebAMaskWorkerManager, generateBisenetV2CelebAMaskDefaultConfig, generateDefaultBisenetV2CelebAMaskParams, createForegroundImage } from '@dannadori/bisenetv2-celebamask-worker-js'

class App extends React.Component{
  
  manager = new BisenetV2CelebAMaskWorkerManager()
  config = generateBisenetV2CelebAMaskDefaultConfig()
  params = generateDefaultBisenetV2CelebAMaskParams()

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
        console.log(res)
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





