# SuperResolution

![image](https://user-images.githubusercontent.com/48346627/128611056-978ee70c-b893-4ee6-96dd-650dec002eba.png)



## Reference
ESPCN

This repository's model is generated with the code [here](https://github.com/w-okada/espcn-tensorflow2). And this repository is inspired by [the repository](https://github.com/HighVoltageRocknRoll/sr). And some code is originally in [the repository](https://github.com/HighVoltageRocknRoll/sr).


[paper](https://arxiv.org/abs/1609.05158)

## API

```
    init: (config: SuperResolutionConfig | null) => Promise<void>;
    predict: (src: HTMLCanvasElement | HTMLImageElement | HTMLVideoElement, params?: SuperResolutionOperationParams) => Promise<Uint8Array | null>;

```

## Configuration and Parameter
```

export interface SuperResolutionConfig{
    browserType         : BrowserType
    processOnLocal      : boolean
    modelPath           : string
    workerPath          : string
    enableSIMD          : boolean

}


export interface SuperResolutionOperationParams{
    inputWidth          : number
    inputHeight         : number
    scaleFactor         : number
    interpolation       : number
    useSIMD             : boolean
}


export const InterpolationType = {
    INTER_NEAREST   :0,
    INTER_LINEAR    :1,
    INTER_AREA      :2,
    INTER_CUBIC     :3,
    INTER_LANCZOS4  :4,
    INTER_ESPCN     :100,
    CANVAS          :200,
}

```


## Step by step
### Create environment and install package
```
$ npx create-react-app demo --template typescript
$ cd demo/
$ npm install
$ npm install @dannadori/super-resolution-worker-js
$ cp node_modules/\@dannadori/super-resolution-worker-js/dist/super-resolution-worker-worker.js public/
$ mkdir -p public/static/js
$ cp node_modules/\@dannadori/super-resolution-worker-js/resources/tflite.wasm public/static/js
$ cp node_modules/\@dannadori/super-resolution-worker-js/resources/tflite-simd.wasm public/static/js
```

### Download Model
https://flect-lab-web.s3-us-west-2.amazonaws.com/P01_wokers/t13_super-resolution/models/model_x2_nopadding.tflite

https://flect-lab-web.s3-us-west-2.amazonaws.com/P01_wokers/t13_super-resolution/models/model_x3_nopadding.tflite

https://flect-lab-web.s3-us-west-2.amazonaws.com/P01_wokers/t13_super-resolution/models/model_x4_nopadding.tflite


### Add source image to public. 
In this time, the name is "srcImage.jpg"

### Edit src/App.tsx
TBD

### build and start

```
$ npm run start
```



