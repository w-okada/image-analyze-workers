This is webworker module for [White-Box-Cartoon](https://github.com/SystemErrorWang/White-box-Cartoonization).

## White-Box-Cartoon
![image](https://user-images.githubusercontent.com/48346627/96987969-aab48b00-155e-11eb-8b81-cd0e522ac974.png)


## Install
```
# install package
$ npm install @dannadori/white-box-cartoonization-worker-js
$ cp node_modules/\@dannadori/white-box-cartoonization-worker-js/dist/white-box-cartoonization-worker-worker.js public/
$ cp node_modules/\@tensorflow/tfjs-backend-wasm/dist/tfjs-backend-wasm.wasm public/

# download model
$ mkdir public/white-box-cartoonization
$ curl 'https://flect-lab-web.s3-us-west-2.amazonaws.com/white-box-cartoonization/model.json' > public/white-box-cartoonization/model.json
$ curl 'https://flect-lab-web.s3-us-west-2.amazonaws.com/white-box-cartoonization/group1-shard1of1.bin' > public/white-box-cartoonization/group1-shard1of1.bin

```
## API

```
generateCartoonDefaultConfig: () => CartoonConfig;
generateDefaultCartoonParams: () => CartoonOperatipnParams;

CartoonWorkerManager {
init(config: CartoonConfig | null): Promise<unknown>;
predict(targetCanvas: HTMLCanvasElement, params?: CartoonOperatipnParams): Promise<HTMLCanvasElement>;


```

## Configuration and Parameter

```
export interface CartoonConfig{
    browserType         : BrowserType
    processOnLocal      : boolean
    useTFWasmBackend    : boolean
    wasmPath            : string
    modelPath           : string
    workerPath          : string
}


export interface CartoonOperatipnParams{
    type        : CartoonFunctionType
    processWidth        : number
    processHeight       : number
}

export enum CartoonFunctionType{
    Cartoon,
    xxx, // Not implemented
}


```

## Step by step
### Create environment and install package
```
$ create-react-app demo/  --typescript
$ cd demo/
$ npm install
$ npm install @dannadori/white-box-cartoonization-worker-js
$ cp node_modules/\@dannadori/white-box-cartoonization-worker-js/dist/white-box-cartoonization-worker-worker.js public/
$ cp node_modules/\@tensorflow/tfjs-backend-wasm/dist/tfjs-backend-wasm.wasm public/
```

### Download Model
```
$ mkdir public/white-box-cartoonization
$ curl 'https://flect-lab-web.s3-us-west-2.amazonaws.com/white-box-cartoonization/model.json' > public/white-box-cartoonization/model.json
$ curl 'https://flect-lab-web.s3-us-west-2.amazonaws.com/white-box-cartoonization/group1-shard1of1.bin' > public/white-box-cartoonization/group1-shard1of1.bin
```

### Add source image to public. 
In this time, the name is "srcImage.jpg"

### Edit src/App.tsx
Sample code is here.

```
import React from 'react';
import './App.css';
import { CartoonWorkerManager, generateCartoonDefaultConfig, generateDefaultCartoonParams } from '@dannadori/white-box-cartoonization-worker-js'

class App extends React.Component{
  
  manager = new CartoonWorkerManager()
  config = generateCartoonDefaultConfig()
  params = generateDefaultCartoonParams()

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


## LICENSE
### This module (not include White-box CartoonGAN)
"MIT"

### White-box CartoonGAN 
```
Copyright (C) Xinrui Wang All rights reserved. Licensed under the CC BY-NC-SA 4.0
license (https://creativecommons.org/licenses/by-nc-sa/4.0/legalcode).
Commercial application is prohibited, please remain this license if you clone this repo
```

