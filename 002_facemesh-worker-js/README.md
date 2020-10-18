This is webworker module for [Facemesh](https://github.com/tensorflow/tfjs-models/tree/master/facemesh).

## facemesh
![image](https://user-images.githubusercontent.com/48346627/95987793-dfd82380-0e62-11eb-9fe5-d0fab9eb2598.png)



## Install
```
$ npm install \@dannadori/facemesh-worker-js
$ cp node_modules/\@dannadori/facemesh-worker-js/dist/0.facemesh-worker.worker.js public/
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
$ npm install @dannadori/facemesh-worker-js
$ cp node_modules/\@dannadori/facemesh-worker-js/dist/0.facemesh-worker.worker.js public/
```

### Add source image to public. 
In this time, the name is "srcImage.jpg"

### Edit src/App.tsx
Sample code is here.

```


```

### build and start

```
$ npm run start
```





