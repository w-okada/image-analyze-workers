# Google meet person segmentation(TFLite)

![image](https://user-images.githubusercontent.com/48346627/110603124-03ad5480-81ca-11eb-993f-f7bf1f857b42.png)

## Install
```
## install
$ npm install @dannadori/googlemeet-segmentation-worker-js
$ cp node_modules/@dannadori/googlemeet-segmentation-worker-js/dist/googlemeet-segmentation-worker-worker.js public/
$ cp node_modules/\@tensorflow/tfjs-backend-wasm/dist/tfjs-backend-wasm.wasm public/

## download model
$ mkdir public/google-segmentation
$ # curl https://flect-lab-web.s3-us-west-2.amazonaws.com/googlemeet/googlemeet-segmentation_128_32/model.json > public/google-segmentation/model.json
$ # curl https://flect-lab-web.s3-us-west-2.amazonaws.com/googlemeet/googlemeet-segmentation_128_32/group1-shard1of1.bin > public/google-segmentation/group1-shard1of1.bin
```
Temporary, the model files are not available from above URL. Please get them from web.


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
$ npm install @dannadori/googlemeet-segmentation-tflite-worker-js
$ cp node_modules/\@dannadori/googlemeet-segmentation-tflite-worker-js/dist/googlemeet-segmentation-tflite-worker-worker.js public/
$ cp node_modules/\@dannadori/googlemeet-segmentation-tflite-worker-js/resources/tflite.js public/
$ cp node_modules/\@dannadori/googlemeet-segmentation-tflite-worker-js/resources/tflite.wasm public/
$ mkdir -p public/static/js/
$ cp node_modules/\@dannadori/googlemeet-segmentation-tflite-worker-js/resources/tflite.wasm public/static/js
```

### Download Model
Google Meet Segmentation Model is used to under APACHE-2.0 License, but now it is not. I'm not a lawyer, and I don't know much about it, but I generally believe that license changes do not apply retroactively to previous deliverables. However, you should obtain the model at your own risk.
For example, there are the converted model at the model PINTO's zoo. 

Detail descussion is here ([issue](https://github.com/tensorflow/tfjs/issues/4177)).

Once you have obtained the model in a legitimate way, place it in the folder below.

```
$ cp meet.tflite public/meet.tflite
```

### Add source image to public. 
In this time, the name is "srcImage.jpg"

### Edit src/App.tsx
Sample code is here.

```
import React, { useEffect, useState } from 'react';
import './App.css';
import { generateDefaultGoogleMeetSegmentationTFLiteParams, generateGoogleMeetSegmentationTFLiteDefaultConfig, GoogleMeetSegmentationTFLiteWorkerManager } from "@dannadori/googlemeet-segmentation-tflite-worker-js"
import { GoogleMeetSegmentationTFLiteConfig, GoogleMeetSegmentationTFLiteOperationParams } from '@dannadori/googlemeet-segmentation-tflite-worker-js/dist/const';


interface WorkerProps {
    manager: GoogleMeetSegmentationTFLiteWorkerManager
    params : GoogleMeetSegmentationTFLiteOperationParams
    config : GoogleMeetSegmentationTFLiteConfig
}

const App = () => {
    const [workerProps, setWorkerProps] = useState<WorkerProps>()

    useEffect(()=>{
        const init = async () =>{
            const m = workerProps? workerProps.manager : new GoogleMeetSegmentationTFLiteWorkerManager()
            const c = generateGoogleMeetSegmentationTFLiteDefaultConfig()
            c.processOnLocal = true
            c.modelPath = "./meet.tflite"
            await m.init(c)
    
            const p = generateDefaultGoogleMeetSegmentationTFLiteParams()
            p.processWidth  = 256
            p.processHeight = 256
            p.kernelSize    = 0
            p.useSoftmax    = true
            p.usePadding    = false
            p.threshold     = 0.5
            p.useSIMD       = false
            const newProps = {manager:m, config:c, params:p}
            setWorkerProps(newProps)
        }
        init()
    }, [])

    useEffect(()=>{
        const input = document.getElementById("input") 
        resizeDst(input!)
    })

    const resizeDst = (input:HTMLElement) =>{
        const cs = getComputedStyle(input)
        const width = parseInt(cs.getPropertyValue("width"))
        const height = parseInt(cs.getPropertyValue("height"))
        const dst = document.getElementById("output") as HTMLCanvasElement
        
        [dst].forEach((c)=>{
            c.width = width
            c.height = height
        })
    }

    useEffect(()=>{
        console.log("[Pipeline] Start", workerProps)
        let renderRequestId:number
        const render = async () => {
            console.log("pipeline...", workerProps)
            if(workerProps){
                console.log("pipeline...1")
                const src = document.getElementById("input") as HTMLImageElement
                const dst = document.getElementById("output") as HTMLCanvasElement
                const tmp = document.getElementById("tmp") as HTMLCanvasElement
                let prediction = await workerProps.manager.predict(src!, workerProps.params)

                // 結果からマスク作成
                const res = new ImageData(workerProps.params.processWidth, workerProps.params.processHeight)
                for(let i = 0;i < workerProps.params.processWidth * workerProps.params.processHeight; i++){
                    res.data[i * 4 + 0] = 0
                    res.data[i * 4 + 1] = 0
                    res.data[i * 4 + 2] = 0
                    res.data[i * 4 + 3] = prediction![i]
                }

                tmp.width  = workerProps.params.processWidth 
                tmp.height = workerProps.params.processHeight
                tmp.getContext("2d")!.putImageData(res, 0, 0)

                dst.getContext("2d")!.clearRect(0, 0, dst.width, dst.height)
                dst.getContext("2d")!.drawImage(tmp, 0, 0, dst.width, dst.height)

                renderRequestId = requestAnimationFrame(render)
            }
        }
        render()
        return ()=>{
            cancelAnimationFrame(renderRequestId)
        }
    }, [workerProps])




    /////////////
    // render  //
    /////////////
    return (
        <div>
            <div style={{display:"flex"}}>
                <div style={{display:"flex"}}>
                    <img    width="300px" height="300px" id="input" src="srcImage.jpg"></img>
                    <canvas width="300px" height="300px" id="output"></canvas>
                    <canvas width="300px" height="300px" id="tmp" hidden></canvas>
                </div>
            </div>
        </div>
        );
}

export default App;

```

### build and start

```
$ npm run start
```



