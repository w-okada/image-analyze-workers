This is webworker module for OpenCV.


## opencv
![image](https://user-images.githubusercontent.com/48346627/95988031-40676080-0e63-11eb-81a6-0262a24f685e.png)

## Install
```
$ npm install \@dannadori/opencv-worker-js
$ cp node_modules/\@dannadori/opencv-worker-js/dist/opencv-worker-worker.js public/
```
## API

```
generateOpenCVDefaultConfig: () => OpenCVConfig;
generateDefaultOpenCVParams: () => OpenCVOperatipnParams;

OpenCVWorkerManager
init(config: OpenCVConfig | null): Promise<unknown>;
predict(targetCanvas: HTMLCanvasElement, params?: OpenCVOperatipnParams): Promise<HTMLCanvasElement>;

```

## Configuration and Parameter

```

export interface OpenCVConfig {
    browserType    : BrowserType;
    processOnLocal : boolean;
    workerPath     : string
}
export interface OpenCVOperatipnParams {
    type: OpenCVFunctionType;
    cannyParams: CannyParams | null;
    processWidth: number;
    processHeight: number;
}
export declare enum OpenCVFunctionType {
    Canny = 0,
    xxx = 1
}
export interface CannyParams {
    threshold1: number;
    threshold2: number;
    apertureSize: number;
    L2gradient: boolean;
}


```

## Step by step
### Create environment and install package
```
$ create-react-app demo/  --typescript
$ cd demo/
$ npm install
$ npm install @dannadori/opencv-worker-js
$ cp node_modules/\@dannadori/opencv-worker-js/dist/opencv-worker-worker.js public/
```

### Add source image to public. 
In this time, the name is "srcImage.jpg"

### Edit src/App.tsx
Sample code is here.

```
import React from 'react';
import './App.css';
import { OpenCVWorkerManager, generateOpenCVDefaultConfig, generateDefaultOpenCVParams } from '@dannadori/opencv-worker-js'

class App extends React.Component{
  
  manager = new OpenCVWorkerManager()
  config = generateOpenCVDefaultConfig()
  params = generateDefaultOpenCVParams()

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
        this.dstCanvas.getContext("2d")!.drawImage(res, 0, 0, this.dstCanvas.width, this.dstCanvas.height)
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





