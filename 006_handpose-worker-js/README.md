This is webworker module for [HandPose](https://github.com/tensorflow/tfjs-models/tree/master/handpose).

## HandPose
![image](https://user-images.githubusercontent.com/48346627/95988209-88868300-0e63-11eb-809a-35a52b7f77fe.png)

## Install
```
$ npm install \@dannadori/handpose-worker-js
$ cp node_modules/\@dannadori/handpose-worker-js/dist/0.handpose-worker.worker.js public/
```
## API

```
generatePoseNetDefaultConfig: () => PoseNetConfig;
generateDefaultPoseNetParams: () => PoseNetOperatipnParams;
drawSkeltonAndPoint: (srcCanvas: HTMLCanvasElement, prediction: poseNet.Pose[]) => ImageData;

PoseNetWorkerManager
init(config?: PoseNetConfig | null): Promise<unknown>;
predict(targetCanvas: HTMLCanvasElement, params?: PoseNetOperatipnParams): Promise<poseNet.Pose[]>;

```

## Configuration and Parameter

```
export interface PoseNetConfig{
    browserType         : BrowserType
    model               : ModelConfig
    processOnLocal      : boolean
    // processWidth        : number
    // processHeight       : number
}

export enum PoseNetFunctionType{
    SinglePerson,
    MultiPerson,// Not implemented
}

export interface PoseNetOperatipnParams{
    type               : PoseNetFunctionType
    singlePersonParams : SinglePersonInterfaceConfig
    multiPersonParams  : MultiPersonInferenceConfig
}

```

## Step by step
### Create environment and install package
```
$ create-react-app demo/  --typescript
$ cd demo/
$ npm install
$ npm install @dannadori/handpose-worker-js
$ cp node_modules/\@dannadori/handpose-worker-js/dist/0.handpose-worker.worker.js public/
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





