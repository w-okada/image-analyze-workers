This is webworker module for AsciiArt.

## asciiart
![image](https://user-images.githubusercontent.com/48346627/95987874-fc745b80-0e62-11eb-95ac-43b3d998d50f.png)

## Install
```
$ npm install \@dannadori/asciiart-worker-js
$ cp node_modules/\@dannadori/asciiart-worker-js/dist/0.asciiart-worker.worker.js public/
```
## API

```
generateFacemeshDefaultConfig: () => FacemeshConfig;
generateDefaultFacemeshParams: () => FacemeshOperatipnParams;
drawFacemeshImage: (srcCanvas: HTMLCanvasElement, prediction: facemesh.AnnotatedPrediction[], params: FacemeshOperatipnParams) => ImageData;

FacemeshWorkerManager
init: (config: FacemeshConfig | null) => Promise<unknown>;
predict: (targetCanvas: HTMLCanvasElement, params: FacemeshOperatipnParams) => Promise<any>;

```

## Configuration and Parameter

```
export interface BodyPixConfig {
    browserType: BrowserType;
    model: ModelConfig;
    processOnLocal: boolean;
}

export interface BodyPixOperatipnParams {
    type: BodypixFunctionType;
    segmentPersonParams: PersonInferenceConfig;
    segmentPersonPartsParams: PersonInferenceConfig;
    segmentMultiPersonParams: MultiPersonInstanceInferenceConfig;
    segmentMultiPersonPartsParams: MultiPersonInstanceInferenceConfig;
    processWidth: number;
    processHeight: number;
}

export declare enum BodypixFunctionType {
    SegmentPerson = 0,
    SegmentMultiPerson = 1,
    SegmentPersonParts = 2,
    SegmentMultiPersonParts = 3
}
```

## Step by step
### Create environment and install package
```
$ create-react-app demo/  --typescript
$ cd demo/
$ npm install
$ npm install @dannadori/asciiart-worker-js
$ cp node_modules/\@dannadori/asciiart-worker-js/dist/0.asciiart-worker.worker.js public/
```

### Add source image to public. 
In this time, the name is "srcImage.jpg"

### Edit src/App.tsx
Sample code is here.

```
import React from 'react';
import './App.css';
import { FacemeshWorkerManager, generateDefaultFacemeshParams, generateFacemeshDefaultConfig, drawFacemeshImage } from '@dannadori/facemesh-worker-js'

class App extends React.Component{
  
  manager = new FacemeshWorkerManager()
  config = generateFacemeshDefaultConfig()
  params = generateDefaultFacemeshParams()

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
        const facemeshImage = drawFacemeshImage(this.srcCanvas, res, this.params)
        this.dstCanvas.getContext("2d")!.putImageData(facemeshImage, 0, 0)
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





