# MediapipeMix2
![image](https://user-images.githubusercontent.com/48346627/181917376-fd2cbb95-918c-4564-97df-b9051293fb07.png)

This module combine the three mediapipe models(face, hand, pose). 

## Install

```
## install
$ npm install @dannadori/mediapipe-mix2-worker-js@
```

## example

examples described here is in [this repository](https://github.com/w-okada/image-analyze-workers/tree/master/019demo_mediapipe-mix2-worker-js-demo).

## note
If you specify the loader for model and wasm in webpack.config.js, webpack automatically generate url for module to load models and wasm. 
```
    module: {
        rules: [
          ...
            { test: /\.bin$/, type: "asset/resource" },
            { test: /\.wasm$/, type: "asset/resource" },
            ...
        ],
    },
```
If you don't use webpack, you can set url for the models and wasm.
```
        const manager = new MediapipeMix2WorkerManager();
        const config = await manager.generateDefaultConfig({
              wasmUrl: "<URL>",
              palmDetectorModelTFLiteUrl: "<URL>",
              handLandmarkLiteTFLiteUrl: "<URL>",
              faceDetectorModelTFLiteUrl: "<URL>",
              faceLandmarkModelTFLiteUrl: "<URL>",
              poseDetectorModelTFLiteUrl: "<URL>",
              poseLandmarkModelTFLiteUrl: "<URL>",
        });
```

If you want to use simply, use  [MediaPipe Mix](#mediapipe-mix).
