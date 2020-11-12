This is webworker module for [Bodypix](https://github.com/tensorflow/tfjs-models/tree/master/body-pix).

# bodypix
![image](https://user-images.githubusercontent.com/48346627/95987700-be773780-0e62-11eb-9645-40b7c0adb826.png)


## Install
```
$ npm install \@dannadori/bodypix-worker-js
$ cp node_modules/\@dannadori/bodypix-worker-js/dist/bodypix-worker-worker.js public/
```
## API

```
generateBodyPixDefaultConfig: () => BodyPixConfig;
generateDefaultBodyPixParams: () => BodyPixOperatipnParams;
createForegroundImage: (srcCanvas: HTMLCanvasElement, prediction: SemanticPersonSegmentation) => ImageData

BodypixWorkerManager
init(config?: BodyPixConfig | null): Promise<unknown>;
predict(targetCanvas: HTMLCanvasElement, params: BodyPixOperatipnParams): Promise<any>;
```

## Configuration and Parameter

```
export interface BodyPixConfig {
    browserType: BrowserType;
    model: ModelConfig;
    processOnLocal: boolean;
    workerPath: string;
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
$ npm install @dannadori/bodypix-worker-js
$ cp node_modules/\@dannadori/bodypix-worker-js/dist/bodypix-worker-worker.js public/
```

### Add source image to public. 
In this time, the name is "srcImage.jpg"

### Edit src/App.tsx
Sample code is here.

```
import React from 'react';
import './App.css';
import {
  BodypixWorkerManager, generateBodyPixDefaultConfig,
  generateDefaultBodyPixParams, createForegroundImage,
} from '@dannadori/bodypix-worker-js'

class App extends React.Component{
  
  manager = new BodypixWorkerManager()
  config = generateBodyPixDefaultConfig()
  params = generateDefaultBodyPixParams()

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





