import { HandPoseDetectionOperationParams, Hand, HandPoseDetectionConfig, FingerLookupIndices } from "@dannadori/hand-pose-detection-worker-js";

export class HandPoseDetectionDrawer {
    private outputCanvas: HTMLCanvasElement | null = null;

    setOutputCanvas = (outputCanvas: HTMLCanvasElement) => {
        this.outputCanvas = outputCanvas;
        console.log(this.outputCanvas);
    };

    draw = (snap: HTMLCanvasElement, config: HandPoseDetectionConfig, params: HandPoseDetectionOperationParams, prediction: Hand[]) => {
        if (!this.outputCanvas) {
            console.log("not ready:::", this.outputCanvas);
            return;
        }
        console.log("Prediction", prediction)
        const radius = 10
        const outputCtx = this.outputCanvas.getContext("2d")!;
        outputCtx.drawImage(snap, 0, 0, this.outputCanvas.width, this.outputCanvas.height);
        outputCtx.fillStyle = "#00ff0066";
        prediction.forEach(hand => {
            if (config.modelType === "tflite") {
                hand.keypoints.forEach(key => {
                    const xmin = key.x * this.outputCanvas!.width - (radius / 2);
                    const ymin = key.y * this.outputCanvas!.height - (radius / 2);
                    outputCtx.fillRect(xmin, ymin, radius, radius)

                })

                const fingers = Object.keys(FingerLookupIndices);
                fingers.forEach((x) => {
                    const points = FingerLookupIndices[x].map((idx: number) => { return hand.keypoints[idx] });

                    outputCtx.beginPath();
                    outputCtx.moveTo(points[0].x * this.outputCanvas!.width, points[0].y * this.outputCanvas!.height);
                    for (let i = 1; i < points.length; i++) {
                        const point = points[i];
                        outputCtx.lineTo(point.x * this.outputCanvas!.width, point.y * this.outputCanvas!.height);
                    }
                    outputCtx.lineWidth = 3;
                    outputCtx.stroke();
                    outputCtx.closePath();
                });

            } else {
                hand.keypoints.forEach(key => {
                    const xmin = key.x / params.processWidth * this.outputCanvas!.width - (radius / 2);
                    const ymin = key.y / params.processHeight * this.outputCanvas!.height - (radius / 2);
                    outputCtx.fillRect(xmin, ymin, radius, radius)

                })

                const fingers = Object.keys(FingerLookupIndices);
                fingers.forEach((x) => {
                    const points = FingerLookupIndices[x].map((idx: number) => { return hand.keypoints[idx] });

                    outputCtx.beginPath();
                    outputCtx.moveTo(points[0].x / params.processWidth * this.outputCanvas!.width, points[0].y / params.processHeight * this.outputCanvas!.height);
                    for (let i = 1; i < points.length; i++) {
                        const point = points[i];
                        outputCtx.lineTo(point.x / params.processWidth * this.outputCanvas!.width, point.y / params.processHeight * this.outputCanvas!.height);
                    }
                    outputCtx.lineWidth = 3;
                    outputCtx.stroke();
                    outputCtx.closePath();
                });

            }




        })

    };
    drawTrackingArea = (xmin: number, ymin: number, width: number, height: number) => {
        if (!this.outputCanvas) {
            console.log("not ready:::", this.outputCanvas);
            return;
        }
        const outputCtx = this.outputCanvas.getContext("2d")!;
        outputCtx.fillStyle = "#00ff0066";
        outputCtx.fillRect(xmin, ymin, width, height);
    };

    cropTrackingArea = (snap: HTMLCanvasElement, xmin: number, ymin: number, width: number, height: number) => {
        if (!this.outputCanvas) {
            console.log("not ready:::", this.outputCanvas);
            return;
        }
        const outputCtx = this.outputCanvas.getContext("2d")!;
        outputCtx.clearRect(0, 0, this.outputCanvas.width, this.outputCanvas.height);

        outputCtx.drawImage(snap, xmin, ymin, width, height, 0, 0, this.outputCanvas.width, this.outputCanvas.height);
    };
}
