# Google meet person segmentation(TFLite)

![image](https://user-images.githubusercontent.com/48346627/110603124-03ad5480-81ca-11eb-993f-f7bf1f857b42.png)

## API

```
    init: (config: GoogleMeetSegmentationTFLiteConfig | null) => Promise<void>;
    predict(src: HTMLCanvasElement | HTMLImageElement | HTMLVideoElement, params?: 
```

## Configuration and Parameter

```
export interface GoogleMeetSegmentationTFLiteConfig{
    browserType         : BrowserType
    processOnLocal      : boolean
    modelPath           : string
    workerPath          : string
}


export interface GoogleMeetSegmentationTFLiteOperationParams{
    type                : GoogleMeetSegmentationTFLiteFunctionType
    processWidth        : number
    processHeight       : number
    kernelSize          : number
    useSoftmax          : boolean
    usePadding          : boolean
    threshold           : number
    useSIMD             : boolean
}

export enum GoogleMeetSegmentationTFLiteFunctionType{
    Segmentation,
    xxx, // Not implemented
}


```

## Step by step
### Create environment and install package
```
$ npx create-react-app demo --template typescript
$ cd demo/
$ npm install
$ npm install @dannadori/googlemeet-segmentation-tflite-worker-js
$ cp node_modules/\@dannadori/googlemeet-segmentation-tflite-worker-js/dist/googlemeet-segmentation-tflite-worker-worker.js public/
$ mkdir -p public/static/js/
$ cp node_modules/\@dannadori/googlemeet-segmentation-tflite-worker-js/resources/tflite.wasm public/static/js
$ cp node_modules/\@dannadori/googlemeet-segmentation-tflite-worker-js/resources/tflite-simd.wasm public/static/js
```

### Download Model
Google Meet Segmentation Model is used to under APACHE-2.0 License, but now it is not. I'm not a lawyer, and I don't know much about it, but I generally believe that license changes do not apply retroactively to previous deliverables. However, you should obtain the model at your own risk.
For example, there are the converted model at the model PINTO's zoo. 

Detail descussion is here ([issue](https://github.com/tensorflow/tfjs/issues/4177)).

Once you have obtained the model in a legitimate way, place it in the folder below.

```
$ cp meet.tflite public/meet.tflite
```

Currently(27th/Apr./2021) MLKit Selfie Segmentation model is published under Apache-2.0. 256x256
[modelcard](https://developers.google.com/ml-kit/images/vision/selfie-segmentation/selfie-model-card.pdf)


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



