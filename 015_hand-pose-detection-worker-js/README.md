# MediaPipe Hands

![image](https://user-images.githubusercontent.com/48346627/164013853-e05547f6-f0a3-4477-9b29-06f19b23c88f.png)

## API

```
HandPoseDetectionWorkerManager.init: (config: HandPoseDetectionConfig | null) => Promise<void>


(property) HandPoseDetectionWorkerManager.predict: (params: HandPoseDetectionOperationParams, targetCanvas: HTMLCanvasElement) => Promise<Hand[] | null>

```

## Configuration and Parameter

```
export const BackendTypes = {
    WebGL: "WebGL",
    wasm: "wasm",
    cpu: "cpu",
} as const;

export const ModelTypes = {
    mediapipe: "mediapipe",
    tfjs: "tfjs",
    tflite: "tflite",
} as const;

export const ModelTypes2 = {
    full: "full",
    lite: "lite",
    old: "old",
} as const;

export interface HandPoseDetectionConfig {
    browserType: BrowserTypes;
    processOnLocal: boolean;
    backendType: BackendTypes;
    wasmPaths: { [key: string]: string };
    pageUrl: string;

    maxHands: number;
    iouThreshold: number;
    scoreThreshold: number;
    modelType: ModelTypes;
    modelType2: ModelTypes2;

    wasmBase64: string;
    wasmSimdBase64: string;
    palmModelTFLite: { [key: string]: string };
    landmarkModelTFLite: { [key: string]: string };
    useSimd: boolean;
    maxProcessWidth: number
    maxProcessHeight: number
}

export interface HandPoseDetectionOperationParams {
    processWidth: number;
    processHeight: number;
    annotateBox: boolean;
    movingAverageWindow: number;
}
```

## Step by step

### Create environment and install package

```
$ npx create-react-app demo --template typescript
$ cd demo/
$ npm install
$ npm install @dannadori/hand-pose-detection-worker-js
```

### Download Model

not needed

### Add source image to public.

In this time, the name is "srcImage.jpg"

### Edit src/App.tsx

TBD

### build and start

```
$ npm run start
```
