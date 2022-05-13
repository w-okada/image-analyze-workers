import { BlazePoseConfig, BlazePoseOperationParams, ModelTypes, PartsLookupIndices, PosePredictionEx } from "./provider/AppStateProvider";

const colors: { [key: string]: string } = {
    leftEye: "#ff0000",
    rightEye: "#aa0000",
    mouth: "#ffffff",
    body: "#aaaaaa",
    leftArm: "#00ff00",
    leftThum: "#0000ff",
    leftIndex: "#0000ff",
    leftPinly: "#0000ff",
    rightArm: "#00aa00",
    rightThum: "#00ff00",
    rightIndex: "#00ff00",
    rightPinly: "#00ff00",
    leftLeg: "#ffff00",
    leftFoot: "#ffffaa",
    rightLeg: "#ffaa00",
    rightFoot: "#ffaaaa",
}

export class BlazePoseDrawer {
    private outputCanvas: HTMLCanvasElement | null = null;

    setOutputCanvas = (outputCanvas: HTMLCanvasElement) => {
        this.outputCanvas = outputCanvas;
        console.log(this.outputCanvas);
    };

    draw = (snap: HTMLCanvasElement, config: BlazePoseConfig, params: BlazePoseOperationParams, pred: PosePredictionEx) => {
        if (!this.outputCanvas) {
            console.log("not ready:::", this.outputCanvas);
            return;
        }
        const outputCtx = this.outputCanvas.getContext("2d")!;
        outputCtx.drawImage(snap, 0, 0, this.outputCanvas.width, this.outputCanvas.height);
        const scaleW = (config.modelType === ModelTypes.tflite) ? snap.width : snap.width / params.processWidth
        const scaleH = (config.modelType === ModelTypes.tflite) ? snap.height : snap.height / params.processHeight
        // poses.forEach(pose => {
        //     pose.keypoints.forEach((point) => {
        //         outputCtx.fillStyle = "#ffffffaa";
        //         outputCtx.fillRect(point.x * scaleW, point.y * scaleH, 10, 10)
        //     })

        //     const offset = (config.modelType === ModelTypes.tflite) ? 0 : 0;
        //     outputCtx.lineWidth = 5
        //     Object.keys(PartsLookupIndices).forEach(key => {
        //         const indices = PartsLookupIndices[key]
        //         outputCtx.strokeStyle = colors[key]
        //         const region = new Path2D();
        //         // console.log(key, indices)
        //         region.moveTo(pose.keypoints[offset + indices[0]].x * scaleW, pose.keypoints[offset + indices[0]].y * scaleH)
        //         for (let i = 1; i < indices.length; i++) {
        //             if (pose.keypoints[offset + indices[i]].score! < 0.5) {
        //                 return
        //             }
        //             region.lineTo(pose.keypoints[offset + indices[i]].x * scaleW, pose.keypoints[offset + indices[i]].y * scaleH)
        //         }
        //         region.closePath();
        //         outputCtx.stroke(region);
        //     })
        // })
        pred.singlePersonKeypointsMovingAverage?.forEach((point) => {
            outputCtx.fillStyle = "#ffffffaa";
            outputCtx.fillRect(point.x * scaleW, point.y * scaleH, 10, 10)
        })


        const offset = (config.modelType === ModelTypes.tflite) ? 0 : 0;
        outputCtx.lineWidth = 5
        Object.keys(PartsLookupIndices).forEach(key => {
            if (!pred.singlePersonKeypointsMovingAverage) {
                return
            }
            const indices = PartsLookupIndices[key]
            outputCtx.strokeStyle = colors[key]
            const region = new Path2D();
            // console.log(key, indices)
            region.moveTo(pred.singlePersonKeypointsMovingAverage[offset + indices[0]].x * scaleW, pred.singlePersonKeypointsMovingAverage[offset + indices[0]].y * scaleH)
            for (let i = 1; i < indices.length; i++) {
                if (pred.singlePersonKeypointsMovingAverage[offset + indices[i]].score! < 0.5) {
                    return
                }
                region.lineTo(pred.singlePersonKeypointsMovingAverage[offset + indices[i]].x * scaleW, pred.singlePersonKeypointsMovingAverage[offset + indices[i]].y * scaleH)
            }
            region.closePath();
            outputCtx.stroke(region);
        })

    };
}
