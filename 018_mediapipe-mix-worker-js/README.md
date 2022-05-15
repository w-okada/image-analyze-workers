This is webworker module for [mediapipe models(hand, face, pose)](https://google.github.io/mediapipe/solutions/models.html).

## Mediapipe Models

![image](https://user-images.githubusercontent.com/48346627/166098876-21d18cd1-fb25-40fe-96af-82fe15ff2558.png)

## Install

```
## install
$npm install @dannadori/mediapipe-mix-worker-js

```

## step by step usage

examples described here is in [this repository]().

### create workspace and install modules

```
$ mkdir example
$ cd example/
$ mkdir public
$ mkdir src
$ npm init -y
$ npm install @dannadori/mediapipe-mix-worker-js
$ npm install react react-dom
$ npm install -D typescript ts-loader html-webpack-plugin webpack webpack-cli webpack-dev-server @types/react @types/react-dom
```

### setup workspace

Copy files below from [this repository](https://github.com/w-okada/image-analyze-workers-examples/tree/master/018_mediapipe-mix-worker-js/example).

-   package.json
-   tsconfig.json
-   webpack.config.js

### prepaire public folder

Create index.html in the public folder. The sample of index.html is here.

```
<!DOCTYPE html>
<html lang="ja" style="width: 100%; height: 100%; overflow: hidden">
  <head>
    <meta charset="utf-8" />
    <title>exampleApp</title>
  </head>
  <body style="width: 100%; height: 100%; margin: 0px">
    <noscript>
      <strong>please enable javascript</strong>
    </noscript>
    <div id="app" style="width: 100%; height: 100%" />
  </body>
</html>
```

Then, put image or movie into the public folder

### Edit src/index.tsx

```
import * as React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

const container = document.getElementById("app")!;
const root = createRoot(container);
root.render(<App />);
```

### Edit src/App.tsx

```
import {
  FacePredictionEx,
  FingerLookupIndices,
  generateDefaultMediapipeMixParams,
  generateMediapipeMixDefaultConfig,
  HandPredictionEx,
  MediapipeMixWorkerManager,
  NUM_KEYPOINTS,
  OperationType,
  PartsLookupIndices,
  PosePredictionEx,
  TRIANGULATION,
} from "@dannadori/mediapipe-mix-worker-js";
import React from "react";
import { useEffect } from "react";

const config = (() => {
  const c = generateMediapipeMixDefaultConfig();
  c.processOnLocal = false; // if you want to run prediction on webworker, set false.
  return c;
})();

const params = (() => {
  const p = generateDefaultMediapipeMixParams();
  // p.operationType=OperationType.face      // If you want to use face, uncomment this. Otherwise, comment out.
  p.operationType = OperationType.hand; // If you want to use hand, uncomment this. Otherwise, comment out.
  // p.operationType = OperationType.pose; // If you want to use pose, uncomment this.  Otherwise, comment out.
  return p;
})();

const App = () => {
  useEffect(() => {
    const input = document.getElementById("input") as HTMLImageElement;
    const output = document.getElementById("output") as HTMLCanvasElement;
    const tmpCanvas = document.createElement("canvas");

    const manager = new MediapipeMixWorkerManager();
    manager.init(config).then(() => {
      tmpCanvas.width = input.width;
      tmpCanvas.height = input.height;
      tmpCanvas
        .getContext("2d")!
        .drawImage(input, 0, 0, tmpCanvas.width, tmpCanvas.height);

      console.log(tmpCanvas);
      manager.predict(params, tmpCanvas).then((prediction) => {
        if (!prediction) {
          return;
        }
        output.width = params.faceProcessWidth;
        output.height = params.faceProcessHeight;
        const outputCtx = output.getContext("2d")!;
        outputCtx.drawImage(tmpCanvas, 0, 0, output.width, output.height);

        if (params.operationType === OperationType.face) {
          const faceResult = prediction as FacePredictionEx;
          const keypoints = faceResult.singlePersonKeypointsMovingAverage!;

          outputCtx.strokeStyle = "#000000";
          for (let i = 0; i < TRIANGULATION.length / 3; i++) {
            const points = [
              TRIANGULATION[i * 3 + 0],
              TRIANGULATION[i * 3 + 1],
              TRIANGULATION[i * 3 + 2],
            ].map((index) => [
              keypoints[index].x * output.width,
              keypoints[index].y * output.height,
            ]);
            const region = new Path2D();
            region.moveTo(points[0][0], points[0][1]);
            for (let j = 1; j < points.length; j++) {
              const point = points[j];
              region.lineTo(point[0], point[1]);
            }
            region.closePath();
            outputCtx.stroke(region);
          }
          if (keypoints.length > NUM_KEYPOINTS) {
            const offset = NUM_KEYPOINTS;
            outputCtx.strokeStyle = "#FF2C35";
            outputCtx.lineWidth = 1;
            const irisIndex = [
              offset,
              offset + 1,
              offset + 2,
              offset + 3,
              offset + 4,
              offset + 5,
              offset + 6,
              offset + 7,
              offset + 8,
              offset + 9,
            ].map((index) => [
              keypoints[index].x * output.width,
              keypoints[index].y * output.height,
            ]);
            const irisTriangle = [
              0, 1, 2, 0, 2, 3, 0, 3, 4, 0, 4, 1, 5, 6, 7, 5, 7, 8, 5, 8, 9, 5,
              9, 6,
            ];
            for (let i = 0; i < irisTriangle.length / 3; i++) {
              const region = new Path2D();
              const irisOffset = i * 3;
              const p0 = irisIndex[irisTriangle[irisOffset + 0]];
              const p1 = irisIndex[irisTriangle[irisOffset + 1]];
              const p2 = irisIndex[irisTriangle[irisOffset + 2]];
              region.moveTo(p0[0], p0[1]);
              region.lineTo(p1[0], p1[1]);
              region.lineTo(p2[0], p2[1]);
              region.closePath();
              outputCtx.stroke(region);
            }
          }
        } else if (params.operationType === OperationType.hand) {
          const handResult = prediction as HandPredictionEx;
          const radius = 16;
          outputCtx.fillStyle = "#4169e1aa";
          handResult.rowPrediction!.forEach((hand) => {
            if (hand.score < 0.7) {
              return;
            }
            hand.keypoints.forEach((key) => {
              const xmin = key.x * output.width - radius / 2;
              const ymin = key.y * output.height - radius / 2;
              outputCtx.fillRect(xmin, ymin, radius, radius);
            });

            const fingers = Object.keys(FingerLookupIndices);
            fingers.forEach((x) => {
              const points = FingerLookupIndices[x].map((idx: number) => {
                return hand.keypoints[idx];
              });

              outputCtx.lineWidth = 5;
              outputCtx.strokeStyle = "#c71585aa";
              outputCtx.beginPath();
              outputCtx.moveTo(
                points[0].x * output.width,
                points[0].y * output.height
              );
              for (let i = 1; i < points.length; i++) {
                const point = points[i];
                outputCtx.lineTo(
                  point.x * output.width,
                  point.y * output.height
                );
              }
              outputCtx.stroke();
              outputCtx.closePath();
            });
          });
        } else {
          const poseResult = prediction as PosePredictionEx;
          poseResult.singlePersonKeypointsMovingAverage?.forEach((point) => {
            outputCtx.fillStyle = "#ffffffaa";
            outputCtx.fillRect(
              point.x * output.width,
              point.y * output.height,
              10,
              10
            );
          });

          const offset = 0;
          outputCtx.lineWidth = 5;
          Object.keys(PartsLookupIndices).forEach((key) => {
            if (!poseResult.singlePersonKeypointsMovingAverage) {
              return;
            }
            const indices = PartsLookupIndices[key];
            const region = new Path2D();
            // console.log(key, indices)
            region.moveTo(
              poseResult.singlePersonKeypointsMovingAverage![
                offset + indices[0]
              ].x * output.width,
              poseResult.singlePersonKeypointsMovingAverage![
                offset + indices[0]
              ].y * output.height
            );
            for (let i = 1; i < indices.length; i++) {
              if (
                poseResult.singlePersonKeypointsMovingAverage[
                  offset + indices[i]
                ].score! < 0.5
              ) {
                return;
              }
              region.lineTo(
                poseResult.singlePersonKeypointsMovingAverage[
                  offset + indices[i]
                ].x * output.width,
                poseResult.singlePersonKeypointsMovingAverage[
                  offset + indices[i]
                ].y * output.height
              );
            }
            region.closePath();
            outputCtx.stroke(region);
          });
        }
      });
    });
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "row" }}>
      <div>
        <img id="input" src="./test.jpg"></img>
      </div>
      <div>
        <canvas id="output"></canvas>
      </div>
    </div>
  );
};

export default App;


```

### build and start

```
$ npm run start
```

## Parameters

### Config

You can configure the module by setting configuration created at `const c = generateMediapipeMixDefaultConfig(); ` above smaple.

```
export interface MediapipeMixConfig {
    processOnLocal: boolean; // Run the module on webworker or local thread(main thread).
}
```

### Parameter

You can configure the operation by setting paramters created at `const p = generateDefaultMediapipeMixParams(); ` above smaple.

```

export interface MediapipeMixOperationParams {
    operationType: OperationType;    // you can select which model used. face or hand or pose.
    handProcessWidth: number;        // image width for hand prediction. up to 1024
    handProcessHeight: number        // image height for hand prediction. up to 1024
    handMaxHands: number;            // max hands you want to detect
    handAffineResizedFactor: number  // The scale when affine transform is applied.(for debug)

    faceProcessWidth: number;        // image width for face prediction. up to 1024
    faceProcessHeight: number        // image hengit for face prediction. up to 1024
    faceMaxFaces: number             // max faces you want to detect
    faceMovingAverageWindow: number; // moving average window for face detection

    poseProcessWidth: number;        // image width for pose prediction. up to 1024
    poseProcessHeight: number        // image hengit for pose prediction. up to 1024
    poseMaxPoses: number             // max poses you want to detect
    poseMovingAverageWindow: number; // moving average window for pose detection
    poseAffineResizedFactor: number  // The scale when affine transform is applied.(for debug)
    poseCropExt: number              // The crop size for pose detection.(for debug)
}
```
