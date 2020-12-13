This is webworker module for AsciiArt.

## asciiart
![image](https://user-images.githubusercontent.com/48346627/95987874-fc745b80-0e62-11eb-95ac-43b3d998d50f.png)

## Install
```
$ npm install \@dannadori/asciiart-worker-js
$ cp node_modules/\@dannadori/asciiart-worker-js/dist/asciiart-worker-worker.js public/
```
## API

```
generateAsciiArtDefaultConfig: () => AsciiConfig;
generateDefaultAsciiArtParams: () => AsciiOperatipnParams;

AsciiArtWorkerManager
init: (config: AsciiConfig | null) => Promise<unknown>;
predict(targetCanvas: HTMLCanvasElement, params: AsciiOperatipnParams): Promise<HTMLCanvasElement>;
```

## Configuration and Parameter

```

export interface AsciiConfig{
    browserType         : BrowserType
    processOnLocal      : boolean
    workerPath          : string    
}


export interface AsciiOperatipnParams{
    type: AsciiFunctionType
    processWidth        : number
    processHeight       : number
    asciiStr            : string
    fontSize            : number
}

export enum AsciiFunctionType{
    AsciiArt
}

```

## Step by step
### Create environment and install package
```
$ create-react-app demo/  --typescript
$ cd demo/
$ npm install
$ npm install @dannadori/asciiart-worker-js
$ cp node_modules/\@dannadori/asciiart-worker-js/dist/asciiart-worker-worker.js public/
```

### Add source image to public. 
In this time, the name is "srcImage.jpg"

### Edit src/App.tsx
Sample code is here.

```
import React from 'react';
import './App.css';
import { AsciiArtWorkerManager, generateAsciiArtDefaultConfig, generateDefaultAsciiArtParams } from '@dannadori/asciiart-worker-js'

class App extends React.Component{
  
  manager = new AsciiArtWorkerManager()
  config = generateAsciiArtDefaultConfig()
  params = generateDefaultAsciiArtParams()

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





