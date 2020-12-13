# U^2-Net Portrait Drawing

![image](https://user-images.githubusercontent.com/48346627/101999201-fba25d80-3d1d-11eb-8e63-445cb6abf204.png)


## Install
```
## install
$ npm install @dannadori/u2net-portrait-worker-js
$ cp node_modules/\@dannadori/u2net-portrait-worker-js/dist/u2net-portrait-worker-worker.js public/
$ cp node_modules/\@tensorflow/tfjs-backend-wasm/dist/tfjs-backend-wasm.wasm public/

## download model
$ for res in 192 256 320 512 1024; do 
    mkdir public/u2net-portrait_${res} 
    curl https://flect-lab-web.s3-us-west-2.amazonaws.com/u2net-portrait_${res}/model.json > public/u2net-portrait_${res}/model.json     
    for count in `seq 42`; do 
	    curl https://flect-lab-web.s3-us-west-2.amazonaws.com/u2net-portrait_${res}/group1-shard${count}of42.bin  > public/u2net-portrait_${res}/group1-shard${count}of42.bin 
      done 
  done
```
## API

```
generateU2NetPortraitDefaultConfig: () => U2NetPortraitConfig;
generateDefaultU2NetPortraitParams: () => U2NetPortraitOperationParams;
createForegroundImage: (srcCanvas: HTMLCanvasElement, prediction: number[][]) => ImageData;

export declare class U2NetPortraitWorkerManager {
    init(config: U2NetPortraitConfig | null): Promise<void>;
    predict(targetCanvas: HTMLCanvasElement, params?: U2NetPortraitOperationParams): Promise<number[][]>;
}

```

## Configuration and Parameter

```
export interface U2NetPortraitConfig {
    browserType: BrowserType;
    processOnLocal: boolean;
    useTFWasmBackend: boolean;
    wasmPath: string;
    modelPath: string;
    workerPath: string;
}
export interface U2NetPortraitOperationParams {
    type: U2NetPortraitFunctionType;
    processWidth: number;
    processHeight: number;
}
export declare enum U2NetPortraitFunctionType {
    Portrait = 0,
    xxx = 1
}


```

## Step by step
### Create environment and install package
```
$ create-react-app demo/  --typescript
$ cd demo/
$ npm install
$ npm install @dannadori/u2net-portrait-worker-js
$ cp node_modules/\@dannadori/u2net-portrait-worker-js/dist/u2net-portrait-worker-worker.js public/
```

### Download Model
```
$ for res in 192 256 320 512 1024; do 
    mkdir public/u2net-portrait_${res} 
    curl https://flect-lab-web.s3-us-west-2.amazonaws.com/u2net-portrait_${res}/model.json > public/u2net-portrait_${res}/model.json     
    for count in `seq 42`; do 
	    curl https://flect-lab-web.s3-us-west-2.amazonaws.com/u2net-portrait_${res}/group1-shard${count}of42.bin  > public/u2net-portrait_${res}/group1-shard${count}of42.bin 
      done 
  done

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
        this.dstCanvas.getContext("2d")!.fillText("asdfsfasfds", 10, 10)
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





