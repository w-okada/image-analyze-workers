# Google meet person segmentation

![image](https://user-images.githubusercontent.com/48346627/104487132-0b101180-5610-11eb-8182-b1be3470c9c9.png)

## Install
```
## install
$ npm install @dannadori/googlemeet-segmentation-worker-js
$ cp node_modules/@dannadori/googlemeet-segmentation-worker-js/dist/googlemeet-segmentation-worker-worker.js public/
$ cp node_modules/\@tensorflow/tfjs-backend-wasm/dist/tfjs-backend-wasm.wasm public/

## download model
$ mkdir public/google-segmentation
$ curl https://flect-lab-web.s3-us-west-2.amazonaws.com/googlemeet-segmentation_128_32/model.json > public/google-segmentation/model.json
$ curl https://flect-lab-web.s3-us-west-2.amazonaws.com/googlemeet-segmentation_128_32/group1-shard1of1.bin > public/google-segmentation/group1-shard1of1.bin
```
## API

```
export declare const generateGoogleMeetSegmentationDefaultConfig: () => GoogleMeetSegmentationConfig;
export declare const generateDefaultGoogleMeetSegmentationParams: () => GoogleMeetSegmentationOperationParams;
export declare const createForegroundImage: (srcCanvas: HTMLCanvasElement, prediction: number[][][]) => ImageD

export declare class GoogleMeetSegmentationWorkerManager {
    init(config: GoogleMeetSegmentationConfig | null): Promise<void>;
    predict(targetCanvas: HTMLCanvasElement, params?: GoogleMeetSegmentationOperationParams): Promise<number[][]>;
}

```

## Configuration and Parameter

```

export interface GoogleMeetSegmentationConfig{
    browserType         : BrowserType
    processOnLocal      : boolean
    useTFWasmBackend    : boolean
    wasmPath            : string
    modelPath           : string
    workerPath          : string
}


export interface GoogleMeetSegmentationOperationParams{
    type                : GoogleMeetSegmentationFunctionType
    processWidth        : number
    processHeight       : number
    smoothingS          : number
    smoothingR          : number
    jbfWidth            : number
    jbfHeight           : number

    staticMemory        : boolean
    lightWrapping       : boolean
    smoothingType       : GoogleMeetSegmentationSmoothingType

    originalWidth       : number
    originalHeight      : number
    
}

export enum GoogleMeetSegmentationFunctionType{
    Segmentation,
    xxx, // Not implemented
}

export enum GoogleMeetSegmentationSmoothingType{
    GPU,
    JS,
    WASM,
    JS_CANVAS,
}

```

## Step by step
### Create environment and install package
```
$ create-react-app demo --template typescript
$ cd demo/
$ npm install
$ npm install @dannadori/googlemeet-segmentation-worker-js
$ cp node_modules/@dannadori/googlemeet-segmentation-worker-js/dist/googlemeet-segmentation-worker-worker.js public/
```

### Download Model
```
$ mkdir public/google-segmentation
$ curl https://flect-lab-web.s3-us-west-2.amazonaws.com/googlemeet-segmentation_128_32/model.json > public/google-segmentation/model.json
$ curl https://flect-lab-web.s3-us-west-2.amazonaws.com/googlemeet-segmentation_128_32/group1-shard1of1.bin > public/google-segmentation/group1-shard1of1.bin
```

### Add source image to public. 
In this time, the name is "srcImage.jpg"

### Edit src/App.tsx
Sample code is here.

```
import React from 'react';
import './App.css';
import { createForegroundImage, generateDefaultGoogleMeetSegmentationParams, generateGoogleMeetSegmentationDefaultConfig, GoogleMeetSegmentationWorkerManager } from '@dannadori/googlemeet-segmentation-worker-js'

class App extends React.Component{
  
  manager = new GoogleMeetSegmentationWorkerManager()
                
  config = (()=>{
    const c = generateGoogleMeetSegmentationDefaultConfig()
    c.useTFWasmBackend = false
    c.wasmPath = ""
    c.modelPath="/google-segmentation/model.json"
    return c
  })()
  params = (()=>{
    const p = generateDefaultGoogleMeetSegmentationParams()
    p.processHeight=128
    p.processWidth=128
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
        this.srcCanvas.getContext("2d")!.drawImage(this.dstCanvas, 0, 0, this.srcCanvas.width, this.srcCanvas.height)
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





