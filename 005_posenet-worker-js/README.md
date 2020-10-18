This is webworker module for [Posenet](https://github.com/tensorflow/tfjs-models/tree/master/posenet).

## PoseNet
![image](https://user-images.githubusercontent.com/48346627/95988122-6260e300-0e63-11eb-9b1e-8712b47410dd.png)


## Install
```
$ npm install \@dannadori/posenet-worker-js
$ cp node_modules/\@dannadori/posenet-worker-js/dist/0.posenet-worker.worker.js public/
```
## API

```
generatePoseNetDefaultConfig: () => PoseNetConfig;
generateDefaultPoseNetParams: () => PoseNetOperatipnParams;
drawSkeltonAndPoint: (srcCanvas: HTMLCanvasElement, prediction: poseNet.Pose[]) => void;

PoseNetWorkerManager
init(config?: PoseNetConfig | null): Promise<unknown>;
predict(targetCanvas: HTMLCanvasElement, params?: PoseNetOperatipnParams): Promise<poseNet.Pose[]>;

```

## Configuration and Parameter

```

export interface OpenCVConfig {
    browserType: BrowserType;
    processOnLocal: boolean;
}
export interface OpenCVOperatipnParams {
    type: OpenCVFunctionType;
    cannyParams: CannyParams | null;
    processWidth: number;
    processHeight: number;
}
export declare enum OpenCVFunctionType {
    Canny = 0,
    xxx = 1
}
export interface CannyParams {
    threshold1: number;
    threshold2: number;
    apertureSize: number;
    L2gradient: boolean;
}


```

## Step by step
### Create environment and install package
```
$ create-react-app demo/  --typescript
$ cd demo/
$ npm install
$ npm install @dannadori/posenet-worker-js
$ cp node_modules/\@dannadori/posenet-worker-js/dist/0.posenet-worker.worker.js public/
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





