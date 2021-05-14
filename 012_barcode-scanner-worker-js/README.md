# BarcodeScanner

![image](https://user-images.githubusercontent.com/48346627/118266526-b1ecb780-b4f5-11eb-9c25-d32a42e852ce.gif)

Note: Safari is not supported with webworker. This porcess needs offscreencanvas.

## API

```
init: (config: BarcodeScannerConfig | null) => Promise<void>;
predict: (src: HTMLCanvasElement | HTMLImageElement | HTMLVideoElement, params?: BarcodeScannerOperationParams) => Promise<BarcodeInfo[]>;

```

## Configuration and Parameter
```
export interface BarcodeScannerConfig {
    browserType: BrowserType;
    processOnLocal: boolean;
    modelPath: string;
    workerPath: string;
    enableSIMD: boolean;
}
export interface BarcodeScannerOperationParams {
    type: BarcodeScannerType;
    processWidth: number;
    processHeight: number;
    scale: number;
    sizeThresold: number;
    interpolation: number;
    useSIMD: boolean;
}
export declare enum BarcodeScannerType {
    original = 0,
    zbar = 1,
    zxing = 2
}
```


## Step by step
### Create environment and install package
```
$ npx create-react-app demo --template typescript
$ cd demo/
$ npm install
$ npm install @dannadori/barcode-scanner-worker-js
$ cp node_modules/\@dannadori/barcode-scanner-worker-js/dist/barcode-scanner-worker-worker.js public/
$ mkdir -p public/static/js
$ cp node_modules/\@dannadori/barcode-scanner-worker-js/resources/tflite.wasm* public/static/js
$ cp node_modules/\@dannadori/barcode-scanner-worker-js/resources/tflite-simd.wasm* public/static/js
```

### Download Model
Model file is under "CC BY-NC-SA 4.0" license.

https://flect-lab-web.s3-us-west-2.amazonaws.com/P01_wokers/t12_barcode-scanner/models/barcode172_light.tflite


### Add source image to public. 
In this time, the name is "srcImage.jpg"

### Edit src/App.tsx
TBD

### build and start

```
$ npm run start
```



